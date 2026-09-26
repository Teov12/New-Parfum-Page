import express from 'express'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { createOrder, updateOrder } from '../db.js'

const router = express.Router()

// Helper para obtener el token de Mercado Pago del tenant o de las variables de entorno
const getMpAccessToken = (tenant) => {
  return tenant?.commercial?.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || ''
}

// GET /api/checkout/config - Estado de configuración de Mercado Pago para la tienda actual
router.get('/config', (req, res) => {
  const tenant = req.tenant
  const accessToken = getMpAccessToken(tenant)
  res.json({
    isMpConfigured: Boolean(accessToken),
    publicKey: tenant?.commercial?.mpPublicKey || process.env.MERCADOPAGO_PUBLIC_KEY || '',
    cardFeeRate: tenant?.commercial?.cardFeeRate ?? 20
  })
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

    // Mapear productos del carrito a ítems de Mercado Pago
    const items = orderData.items.map(i => ({
      id: String(i.id || i.slug),
      title: `${i.name} (${i.brand || 'Perfume'}) - ${i.size || '100 ml'}`,
      unit_price: Number(i.price),
      quantity: Math.max(1, Number(i.quantity) || 1),
      currency_id: 'ARS'
    }))

    // Agregar costo de envío como ítem si corresponde
    if (Number(orderData.shippingCost) > 0) {
      items.push({
        id: 'shipping_andreani',
        title: `Envío ${orderData.shippingMethod || 'Andreani a Domicilio'}`,
        unit_price: Number(orderData.shippingCost),
        quantity: 1,
        currency_id: 'ARS'
      })
    }

    // Aplicar descuento por cupón si existe
    if (Number(orderData.couponDiscount) > 0) {
      items.push({
        id: 'coupon_discount',
        title: 'Descuento cupón promocional',
        unit_price: -Math.abs(Number(orderData.couponDiscount)),
        quantity: 1,
        currency_id: 'ARS'
      })
    }

    const prefPayload = {
      items,
      payer: {
        name: orderData.customer?.firstName || 'Cliente',
        surname: orderData.customer?.lastName || '',
        email: orderData.customer?.email || 'comprador@giccaparfum.com',
        phone: {
          number: String(orderData.customer?.phone || '').replace(/\D/g, '')
        },
        address: {
          street_name: orderData.customer?.address || 'Dirección de Entrega',
          zip_code: String(orderData.customer?.postalCode || '5000')
        }
      },
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

// POST /api/checkout/webhook - Webhook de notificación automática de pagos de Mercado Pago
router.post('/webhook', async (req, res) => {
  try {
    const topic = req.query.topic || req.body?.type || req.query.type
    const paymentId = req.query.id || req.body?.data?.id

    if ((topic === 'payment' || topic === 'merchant_order') && paymentId) {
      const tenantId = req.query.tenant || req.tenantId || 'gicca'
      const tenant = req.tenant
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
