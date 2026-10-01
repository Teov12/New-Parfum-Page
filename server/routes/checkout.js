import express from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { getOrderByIdOrNumber, updateOrder } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { placeOrder, toCustomerOrder } from '../services/orderService.js'
import { findCoupon } from '../services/coupons.js'
import { publicOrderLimiter } from './orders.js'
import { sendOrderConfirmationEmail, sendStoreOwnerNewOrderAlert } from '../services/mailer.js'

const router = express.Router()

// Freno a intentos de adivinar cupones o confirmar pagos en masa
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.' }
})

// Helper para obtener el token de Mercado Pago del tenant o de las variables de entorno
const getMpAccessToken = (tenant) => {
  return (
    tenant?.commercial?.mpAccessToken ||
    tenant?.commercial?.mercadoPagoAccessToken ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    ''
  ).trim()
}

const getMpPublicKey = (tenant) => {
  return (
    tenant?.commercial?.mpPublicKey ||
    tenant?.commercial?.mercadoPagoPublicKey ||
    process.env.MERCADOPAGO_PUBLIC_KEY ||
    ''
  ).trim()
}

const getRequestOrigin = (req) => {
  const clientOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '')
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
  return (clientOrigin || `${protocol}://${req.get('host')}`).replace(/\/$/, '')
}

const fetchMercadoPagoPayment = async (accessToken, paymentId) => {
  const client = new MercadoPagoConfig({ accessToken })
  return new Payment(client).get({ id: paymentId })
}

const appendNote = (order, note) => [order.notes, note].filter(Boolean).join(' | ')

/**
 * Acredita un pago de Mercado Pago consultado directamente a la API de MP.
 * Solo marca el pedido como pagado si el pago está aprobado, corresponde a ese pedido
 * y cubre el total calculado por el servidor.
 */
const applyMercadoPagoPayment = async ({ paymentInfo, tenantId, tenant }) => {
  const orderNumber = paymentInfo?.external_reference
  if (!orderNumber) return { status: 'ignored' }

  const order = await getOrderByIdOrNumber(String(orderNumber), tenantId)
  if (!order) return { status: 'not_found' }
  if (paymentInfo.status !== 'approved') return { status: paymentInfo.status, order }
  if (order.paymentStatus === 'paid') return { status: 'already_paid', order }

  const paidAmount = Number(paymentInfo.transaction_amount) || 0
  const wrongCurrency = paymentInfo.currency_id && paymentInfo.currency_id !== 'ARS'
  if (wrongCurrency || Math.round(paidAmount) < Math.round(Number(order.total) || 0)) {
    const warning = `ATENCIÓN: pago MP #${paymentInfo.id} aprobado por $${paidAmount.toLocaleString('es-AR')} ${paymentInfo.currency_id || ''} y el pedido es de $${Number(order.total).toLocaleString('es-AR')}. Revisar manualmente.`
    if (!String(order.notes || '').includes(`#${paymentInfo.id}`)) {
      await updateOrder(order.id, { notes: appendNote(order, warning) }, tenantId)
    }
    console.warn(`[MP] ${warning} (pedido ${order.orderNumber}, tienda ${tenantId})`)
    return { status: 'amount_mismatch', order }
  }

  const updated = await updateOrder(order.id, {
    paymentStatus: 'paid',
    notes: appendNote(order, `Pago aprobado por Mercado Pago (Operación #${paymentInfo.id}, Método: ${paymentInfo.payment_method_id || 'tarjeta'})`)
  }, tenantId)

  sendOrderConfirmationEmail({ order: updated, tenant }).catch(e => {
    console.warn('[Mailer] Error en confirmación de pago aprobado:', e.message)
  })

  return { status: 'approved', order: updated }
}

/**
 * Valida la firma x-signature de las notificaciones de Mercado Pago (si hay clave secreta configurada).
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
const isValidMercadoPagoSignature = (req, dataId, secret) => {
  const signature = String(req.headers['x-signature'] || '')
  const requestId = String(req.headers['x-request-id'] || '')
  const parts = Object.fromEntries(signature.split(',').map(p => p.split('=').map(s => s.trim())))
  if (!parts.ts || !parts.v1) return false

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
}

// GET /api/checkout/config - Estado de configuración de Mercado Pago para la tienda actual
router.get('/config', (req, res) => {
  const tenant = req.tenant
  const accessToken = getMpAccessToken(tenant)
  const publicKey = getMpPublicKey(tenant)
  res.json({
    isMpConfigured: Boolean(accessToken),
    publicKey: publicKey,
    cardFeeRate: tenant?.commercial?.cardFeeRate ?? 20
  })
})

// POST /api/checkout/coupon - Validar un cupón de la tienda actual
router.post('/coupon', checkoutLimiter, (req, res) => {
  const coupon = findCoupon(req.tenant, req.body?.code)
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'El cupón ingresado no es válido o ha expirado.' })
  }
  res.json({ success: true, coupon })
})

// POST /api/checkout/test-credentials - Probar credenciales en vivo con la API oficial de Mercado Pago (Admin)
router.post('/test-credentials', requireAuth, async (req, res) => {
  try {
    const { accessToken } = req.body
    const cleanToken = (accessToken || '').trim()

    if (!cleanToken) {
      return res.status(400).json({ error: 'Ingresá un Access Token para probar la conexión.' })
    }

    if (!cleanToken.startsWith('APP_USR-') && !cleanToken.startsWith('TEST-')) {
      return res.status(400).json({
        error: 'El token ingresado no tiene el formato estándar de Mercado Pago (debe iniciar con APP_USR- o TEST-).'
      })
    }

    const mpRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`
      }
    })

    if (!mpRes.ok) {
      const errData = await mpRes.json().catch(() => ({}))
      return res.status(400).json({
        success: false,
        error: errData.message || 'Token de Mercado Pago inválido o revocado. Revisá tus credenciales en Mercado Pago Developers.'
      })
    }

    const userData = await mpRes.json()
    res.json({
      success: true,
      message: `¡Conexión verificada con éxito! Cuenta: ${userData.nickname || userData.first_name || 'Mercado Pago'} (${userData.email || 'Email autenticado'}).`,
      account: {
        id: userData.id,
        nickname: userData.nickname,
        email: userData.email,
        siteId: userData.site_id
      }
    })
  } catch (err) {
    console.error('Error al probar credenciales de Mercado Pago:', err)
    res.status(500).json({ error: 'Error al contactar los servidores de Mercado Pago.' })
  }
})

// Ítems de la preferencia a partir del pedido ya validado por el servidor.
// Con descuentos se cobra el total en un único ítem para que el monto sea exacto.
const buildPreferenceItems = (order, storeName) => {
  const itemized = order.items.every(i => Number(i.price) > 0)
  if (Number(order.discountAmount) > 0 || !itemized) {
    return [{
      id: order.orderNumber,
      title: `Pedido #${order.orderNumber}${storeName ? ` - ${storeName}` : ''}`,
      description: order.items.map(i => `${i.quantity}x ${i.name} ${i.size}`).join(', ').slice(0, 250),
      unit_price: Number(order.total),
      quantity: 1,
      currency_id: 'ARS'
    }]
  }

  const items = order.items.map(i => ({
    id: String(i.id),
    title: `${i.name} (${i.brand || 'Perfume'}) - ${i.size}`,
    unit_price: Number(i.price),
    quantity: Number(i.quantity),
    currency_id: 'ARS'
  }))
  if (Number(order.shippingCost) > 0) {
    items.push({
      id: 'shipping',
      title: `Envío ${order.shippingMethod || ''}`.trim(),
      unit_price: Number(order.shippingCost),
      quantity: 1,
      currency_id: 'ARS'
    })
  }
  return items
}

// POST /api/checkout/create-preference - Registrar pedido y crear preferencia de Mercado Pago
router.post('/create-preference', publicOrderLimiter, async (req, res) => {
  try {
    const { orderData } = req.body
    if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe incluir al menos un producto' })
    }

    const tenantId = req.tenantId
    const tenant = req.tenant
    const accessToken = getMpAccessToken(tenant)

    // Precios, cupón y envío se recalculan en el servidor: el pedido nunca confía en los montos del navegador
    const order = await placeOrder({
      orderData: { ...orderData, paymentMethod: 'mercadopago' },
      tenant,
      tenantId,
      trusted: false
    })

    // Notificaciones iniciales por email
    sendOrderConfirmationEmail({ order, tenant }).catch(e => {
      console.warn('[Mailer] Error en confirmación de orden:', e.message)
    })
    sendStoreOwnerNewOrderAlert({ order, tenant }).catch(e => {
      console.warn('[Mailer] Error en alerta de orden:', e.message)
    })

    // Si la perfumería aún no configuró sus credenciales de MP, respondemos con modo simulación/fallback
    if (!accessToken) {
      const waNumber = (tenant?.branding?.whatsappNumber || '').replace(/\D/g, '')
      const msg = `Hola! Quiero pagar con tarjeta mi pedido #${order.orderNumber} por $${order.total?.toLocaleString('es-AR')}.`
      return res.json({
        success: true,
        order: toCustomerOrder(order),
        isSimulation: true,
        message: 'Credenciales de Mercado Pago no configuradas. Podés agregarlas desde el panel de administración.',
        whatsappFallbackUrl: waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}` : ''
      })
    }

    if (!(Number(order.total) > 0)) {
      return res.status(400).json({ error: 'El total del pedido debe ser mayor a $0 para pagar con Mercado Pago.' })
    }

    // Configurar cliente de Mercado Pago
    const client = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(client)

    const origin = getRequestOrigin(req)
    const apiBase = (process.env.PUBLIC_API_URL || origin).replace(/\/$/, '')
    const isHttps = origin.startsWith('https://')
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')

    const payerPhone = String(order.customer?.phone || '').replace(/\D/g, '')
    const payer = {
      name: order.customer?.firstName || 'Cliente',
      surname: order.customer?.lastName || '',
      address: {
        street_name: order.customer?.address || '',
        zip_code: String(order.customer?.postalCode || '')
      }
    }
    if (order.customer?.email) payer.email = order.customer.email
    if (payerPhone && payerPhone.length >= 6) {
      payer.phone = { number: payerPhone }
    }

    const returnQuery = `orderNumber=${encodeURIComponent(order.orderNumber)}&token=${order.accessToken}`
    const prefPayload = {
      items: buildPreferenceItems(order, tenant?.name),
      payer,
      payment_methods: {
        installments: 6
      },
      back_urls: {
        success: `${origin}/checkout/success?${returnQuery}`,
        failure: `${origin}/checkout/failure?${returnQuery}`,
        pending: `${origin}/checkout/pending?${returnQuery}`
      },
      external_reference: order.orderNumber,
      statement_descriptor: (tenant?.name || 'PERFUMERIA').slice(0, 16),
      notification_url: `${apiBase}/api/checkout/webhook?tenant=${encodeURIComponent(tenantId)}`
    }

    // Mercado Pago exige HTTPS y prohíbe localhost para habilitar auto_return
    if (isHttps && !isLocalhost) {
      prefPayload.auto_return = 'approved'
    }

    const response = await preference.create({ body: prefPayload })

    res.json({
      success: true,
      order: toCustomerOrder(order),
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point
    })
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('[MP Preference Error]:', err)
    res.status(500).json({ error: 'Error al conectar con Mercado Pago' })
  }
})

// POST /api/checkout/confirm-return - Confirmación al volver de Mercado Pago.
// Nunca confía en el estado enviado por el navegador: consulta el pago a la API de Mercado Pago.
router.post('/confirm-return', checkoutLimiter, async (req, res) => {
  try {
    const { orderNumber, paymentId } = req.body
    if (!orderNumber || !paymentId) {
      return res.status(400).json({ error: 'Faltan datos del pago (orderNumber / paymentId)' })
    }

    const accessToken = getMpAccessToken(req.tenant)
    if (!accessToken) {
      return res.json({ success: false, message: 'Mercado Pago no está configurado en esta tienda' })
    }

    let paymentInfo
    try {
      paymentInfo = await fetchMercadoPagoPayment(accessToken, String(paymentId))
    } catch (err) {
      return res.status(404).json({ success: false, message: 'No encontramos ese pago en Mercado Pago' })
    }

    if (String(paymentInfo?.external_reference) !== String(orderNumber)) {
      return res.status(400).json({ success: false, message: 'El pago no corresponde a este pedido' })
    }

    const result = await applyMercadoPagoPayment({ paymentInfo, tenantId: req.tenantId, tenant: req.tenant })
    const approved = result.status === 'approved' || result.status === 'already_paid'

    res.json({
      success: approved,
      paymentStatus: result.order?.paymentStatus || 'pending',
      mpStatus: paymentInfo.status,
      message: approved ? 'Pago acreditado' : 'El pago todavía no está aprobado'
    })
  } catch (err) {
    console.error('Error confirming return payment:', err)
    res.status(500).json({ error: 'Error al confirmar pago' })
  }
})

// POST /api/checkout/webhook - Notificación automática de pagos de Mercado Pago
router.post('/webhook', async (req, res) => {
  try {
    const topic = req.query.topic || req.query.type || req.body?.type
    const paymentId = req.query['data.id'] || req.body?.data?.id || req.query.id

    if (topic !== 'payment' || !paymentId) {
      return res.status(200).send('OK')
    }

    // req.tenant ya viene resuelto por el middleware a partir de ?tenant=
    const tenant = req.tenant
    const tenantId = req.tenantId
    const accessToken = getMpAccessToken(tenant)
    if (!accessToken) {
      return res.status(200).send('OK')
    }

    const secret = (tenant?.commercial?.mpWebhookSecret || process.env.MP_WEBHOOK_SECRET || '').trim()
    if (secret && !isValidMercadoPagoSignature(req, paymentId, secret)) {
      console.warn(`[MP Webhook] Firma inválida para el pago ${paymentId} (tienda ${tenantId})`)
      return res.status(401).send('Invalid signature')
    }

    const paymentInfo = await fetchMercadoPagoPayment(accessToken, String(paymentId))
    const result = await applyMercadoPagoPayment({ paymentInfo, tenantId, tenant })
    if (result.status === 'approved') {
      console.log(`[MP Webhook] Pedido #${result.order.orderNumber} acreditado exitosamente.`)
    }

    res.status(200).send('OK')
  } catch (err) {
    console.error('[MP Webhook Error]:', err.message)
    res.status(200).send('OK')
  }
})

export default router
