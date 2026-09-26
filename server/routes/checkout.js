import express from 'express'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { createOrder, updateOrder } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { resolveTenantById } from '../middleware/tenant.js'

const router = express.Router()

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

// POST /api/checkout/create-preference - Crear preferencia de Mercado Pago y registrar pedido
router.post('/create-preference', async (req, res) => {
  try {
    const { orderData } = req.body
    if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe incluir al menos un producto' })
    }

    const tenantId = req.tenantId || 'gicca'
    const tenant = req.tenant
    const accessToken = getMpAccessToken(tenant)

    // Guardar el pedido en la base de datos de la tienda como pendiente
    const orderNumber = orderData.orderNumber || `GIC-${Math.floor(100000 + Math.random() * 900000)}`
    const order = await createOrder({
      ...orderData,
      orderNumber,
      paymentMethod: 'mercadopago',
      paymentStatus: 'pending'
    }, tenantId)

    // Si la perfumería aún no configuró sus credenciales de MP, respondemos con modo simulación/fallback
    if (!accessToken) {
      const waNumber = (tenant?.branding?.whatsappNumber || '5493564622055').replace(/\D/g, '')
      const msg = `Hola! Quiero pagar con tarjeta mi pedido #${order.orderNumber} por $${order.total?.toLocaleString('es-AR')}.`
      return res.json({
        success: true,
        order,
        isSimulation: true,
        message: 'Credenciales de Mercado Pago no configuradas. Podés agregarlas desde el panel de administración.',
        whatsappFallbackUrl: `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`
      })
    }

    // Configurar cliente de Mercado Pago
    const client = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(client)

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
    const host = req.get('host')
    const origin = `${protocol}://${host}`

    // Mapear productos del carrito a ítems de Mercado Pago con precios válidos (> 0)
    let items = orderData.items.map(i => ({
      id: String(i.id || i.slug || 'perfume'),
      title: `${i.name} (${i.brand || 'Perfume'}) - ${i.size || '100 ml'}`,
      unit_price: Math.max(1, Math.round(Number(i.price) || 0)),
      quantity: Math.max(1, Number(i.quantity) || 1),
      currency_id: 'ARS'
    }))

    // Si hay un descuento por cupón, prorratear en los ítems para nunca enviar unit_price negativo a MP
    const couponDiscount = Number(orderData.couponDiscount) || 0
    if (couponDiscount > 0) {
      const itemsTotal = items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0)
      if (itemsTotal > couponDiscount) {
        const ratio = (itemsTotal - couponDiscount) / itemsTotal
        items = items.map(it => ({
          ...it,
          unit_price: Math.max(1, Math.round(it.unit_price * ratio))
        }))
      }
    }

    // Agregar costo de envío como ítem si corresponde
    if (Number(orderData.shippingCost) > 0) {
      items.push({
        id: 'shipping_andreani',
        title: `Envío ${orderData.shippingMethod || 'Andreani a Domicilio'}`,
        unit_price: Math.round(Number(orderData.shippingCost)),
        quantity: 1,
        currency_id: 'ARS'
      })
    }

    const payerPhone = String(orderData.customer?.phone || '').replace(/\D/g, '')
    const payer = {
      name: orderData.customer?.firstName || 'Cliente',
      surname: orderData.customer?.lastName || 'Gicca',
      email: orderData.customer?.email || 'cliente@giccaperfumes.com.ar',
      address: {
        street_name: orderData.customer?.address || 'Dirección de Entrega',
        zip_code: String(orderData.customer?.postalCode || '5000')
      }
    }
    if (payerPhone && payerPhone.length >= 6) {
      payer.phone = { number: payerPhone }
    }

    const prefPayload = {
      items,
      payer,
      back_urls: {
        success: `${origin}/checkout/success?orderNumber=${order.orderNumber}`,
        failure: `${origin}/checkout/failure?orderNumber=${order.orderNumber}`,
        pending: `${origin}/checkout/pending?orderNumber=${order.orderNumber}`
      },
      auto_return: 'approved',
      external_reference: order.orderNumber,
      statement_descriptor: (tenant?.name || 'GICCA PERFUMES').slice(0, 16),
      notification_url: `${origin}/api/checkout/webhook?tenant=${tenantId}`
    }

    const response = await preference.create({ body: prefPayload })

    res.json({
      success: true,
      order,
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point
    })
  } catch (err) {
    console.error('[MP Preference Error]:', err)
    res.status(500).json({ error: err.message || 'Error al conectar con Mercado Pago' })
  }
})

// POST /api/checkout/confirm-return - Confirmación inmediata al retornar de Mercado Pago
router.post('/confirm-return', async (req, res) => {
  try {
    const { orderNumber, paymentId, status } = req.body
    if (!orderNumber) {
      return res.status(400).json({ error: 'Falta orderNumber' })
    }
    const tenantId = req.tenantId || req.query.tenant || 'gicca'

    if (status === 'approved') {
      const updated = await updateOrder(orderNumber, {
        paymentStatus: 'paid',
        notes: paymentId 
          ? `Pago aprobado por Mercado Pago (Operación #${paymentId})`
          : 'Pago aprobado por Mercado Pago (Retorno verificado)'
      }, tenantId)
      return res.json({ success: true, order: updated })
    }

    res.json({ success: false, message: 'Estado de pago no aprobado' })
  } catch (err) {
    console.error('Error confirming return payment:', err)
    res.status(500).json({ error: 'Error al confirmar pago' })
  }
})

// POST /api/checkout/webhook - Webhook de notificación automática de pagos de Mercado Pago
router.post('/webhook', async (req, res) => {
  try {
    const topic = req.query.topic || req.body?.type || req.query.type
    const paymentId = req.query.id || req.body?.data?.id

    if ((topic === 'payment' || topic === 'merchant_order') && paymentId) {
      const tenantId = req.query.tenant || req.tenantId || 'gicca'
      let tenant = req.tenant
      if (!tenant || !getMpAccessToken(tenant)) {
        tenant = await resolveTenantById(tenantId)
      }
      const accessToken = getMpAccessToken(tenant)

      if (accessToken) {
        const client = new MercadoPagoConfig({ accessToken })
        const payment = new Payment(client)
        const paymentInfo = await payment.get({ id: paymentId })

        if (paymentInfo && paymentInfo.status === 'approved') {
          const orderNumber = paymentInfo.external_reference
          if (orderNumber) {
            await updateOrder(orderNumber, {
              paymentStatus: 'paid',
              notes: `Pago aprobado por Mercado Pago (Operación #${paymentId}, Método: ${paymentInfo.payment_method_id || 'tarjeta'})`
            }, tenantId)
            console.log(`[MP Webhook] Pedido #${orderNumber} acreditado exitosamente.`)
          }
        }
      }
    }

    res.status(200).send('OK')
  } catch (err) {
    console.error('[MP Webhook Error]:', err.message)
    res.status(200).send('OK')
  }
})

export default router
