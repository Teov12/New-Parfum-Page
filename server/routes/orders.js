import express from 'express'
import rateLimit from 'express-rate-limit'
import {
  getOrders,
  getOrderByIdOrNumber,
  updateOrder,
  deleteOrder
} from '../db.js'
import { requireAuth, getAuthorizedUser } from '../middleware/auth.js'
import { placeOrder, toCustomerOrder } from '../services/orderService.js'
import { afterOrderCreated, afterOrderPaid, invoiceOrder } from '../services/orderEvents.js'
import { sendOrderConfirmationEmail } from '../services/mailer.js'

const router = express.Router()

// Freno a la creación masiva de pedidos falsos desde una misma IP
export const publicOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos desde esta conexión. Intentá nuevamente en unos minutos.' }
})

// GET /api/orders - List all orders with filters (Admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId
    let orders = await getOrders(tenantId)
    const { paymentStatus, fulfillmentStatus, source, q } = req.query

    if (paymentStatus && paymentStatus !== 'all') {
      orders = orders.filter(o => o.paymentStatus === paymentStatus)
    }
    if (fulfillmentStatus && fulfillmentStatus !== 'all') {
      orders = orders.filter(o => o.fulfillmentStatus === fulfillmentStatus)
    }
    if (source && source !== 'all') {
      orders = orders.filter(o => o.source === source)
    }
    if (q) {
      const search = q.toLowerCase().trim()
      orders = orders.filter(o =>
        o.orderNumber?.toLowerCase().includes(search) ||
        o.customer?.firstName?.toLowerCase().includes(search) ||
        o.customer?.lastName?.toLowerCase().includes(search) ||
        o.customer?.email?.toLowerCase().includes(search) ||
        o.customer?.phone?.includes(search) ||
        o.customer?.city?.toLowerCase().includes(search) ||
        o.trackingCode?.toLowerCase().includes(search) ||
        o.items?.some(i => i.name?.toLowerCase().includes(search))
      )
    }

    res.json(orders)
  } catch (err) {
    console.error('Error fetching orders:', err)
    res.status(500).json({ error: 'Error al obtener los pedidos' })
  }
})

// GET /api/orders/stats - Comprehensive financial and sales stats (Admin only)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId
    const orders = await getOrders(tenantId)
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid')

    const totalRevenue = paidOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0)
    const totalCost = paidOrders.reduce((acc, o) => acc + (Number(o.totalCost) || 0), 0)
    const totalProfit = Math.max(0, totalRevenue - totalCost)
    const overallProfitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

    const pendingPaymentCount = orders.filter(o => o.paymentStatus === 'pending').length
    const pendingShippingCount = orders.filter(o => o.paymentStatus === 'paid' && o.fulfillmentStatus !== 'delivered').length
    const deliveredCount = orders.filter(o => o.fulfillmentStatus === 'delivered').length
    const averageTicket = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0

    res.json({
      ordersCount: orders.length,
      paidOrdersCount: paidOrders.length,
      pendingPaymentCount,
      pendingShippingCount,
      deliveredCount,
      totalRevenue,
      totalCost,
      totalProfit,
      overallProfitMargin,
      averageTicket
    })
  } catch (err) {
    console.error('Error fetching orders stats:', err)
    res.status(500).json({ error: 'Error al obtener métricas financieras' })
  }
})

// GET /api/orders/:id - Comprobante del pedido.
// Admin de la tienda: pedido completo. Comprador: requiere ?token= (enviado en el link de su compra).
router.get('/:id', async (req, res) => {
  try {
    const order = await getOrderByIdOrNumber(req.params.id, req.tenantId)
    const isAdmin = Boolean(getAuthorizedUser(req))
    const token = String(req.query.token || '')
    const hasValidToken = Boolean(order?.accessToken) && token.length > 0 && token === order.accessToken

    // Mismo 404 si no existe o si falta el token, para no confirmar números de pedido ajenos
    if (!order || (!isAdmin && !hasValidToken)) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    res.json(isAdmin ? order : toCustomerOrder(order))
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el pedido' })
  }
})

// POST /api/orders - Pedido web (transferencia) o venta manual desde el admin
router.post('/', publicOrderLimiter, async (req, res) => {
  try {
    const orderData = req.body
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe incluir al menos un producto' })
    }

    // Solo un admin autenticado de esta tienda puede cargar precios, estados o descuentos manuales
    const trusted = Boolean(getAuthorizedUser(req))

    // Una tienda pausada no toma pedidos web (el dueño sí puede registrar ventas manuales)
    if (!trusted && (req.storeSuspended || req.storeNotFound)) {
      return res.status(423).json({ error: 'La tienda está pausada temporalmente y no está tomando pedidos.', code: 'store_suspended' })
    }
    const created = await placeOrder({ orderData, tenant: req.tenant, tenantId: req.tenantId, trusted })

    // Emails, uso de cupón, carrito recuperado y alertas de stock (sin bloquear la respuesta)
    afterOrderCreated({ order: created, tenant: req.tenant })
    // Venta manual ya cobrada: dispara la factura automática (el cliente ya recibió su email)
    if (trusted && created.paymentStatus === 'paid') {
      afterOrderPaid({ order: created, tenant: req.tenant, notify: false }).catch(e => console.warn('[Orders] afterOrderPaid:', e.message))
    }

    res.status(201).json(trusted ? created : toCustomerOrder(created))
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('Error creating order:', err)
    res.status(500).json({ error: 'Error al registrar el pedido' })
  }
})

// POST /api/orders/:id/resend-email - Reenviar email de confirmación manualmente (Admin only)
router.post('/:id/resend-email', requireAuth, async (req, res) => {
  try {
    const order = await getOrderByIdOrNumber(req.params.id, req.tenantId)
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    await sendOrderConfirmationEmail({ order, tenant: req.tenant })
    res.json({ success: true, message: `Email de confirmación reenviado a ${order.customer?.email || 'cliente'}` })
  } catch (err) {
    console.error('Error resending email:', err)
    res.status(500).json({ error: err.message || 'Error al reenviar correo' })
  }
})

// POST /api/orders/:id/invoice - Emitir la factura electrónica ARCA del pedido
router.post('/:id/invoice', requireAuth, async (req, res) => {
  try {
    const order = await getOrderByIdOrNumber(req.params.id, req.tenantId)
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    const updated = await invoiceOrder({ order, tenant: req.tenant })
    res.json({ success: true, order: updated, invoice: updated.invoice })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'No se pudo emitir la factura' })
  }
})

// PUT /api/orders/:id - Update order status, tracking, fulfillment, etc. (Admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const before = await getOrderByIdOrNumber(req.params.id, req.tenantId)
    const updated = await updateOrder(req.params.id, req.body, req.tenantId)
    if (!updated) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    // Pago confirmado a mano por el dueño (ej: transferencia): email al cliente y factura automática
    if (before?.paymentStatus !== 'paid' && updated.paymentStatus === 'paid') {
      afterOrderPaid({ order: updated, tenant: req.tenant }).catch(e => console.warn('[Orders] afterOrderPaid:', e.message))
    }
    res.json(updated)
  } catch (err) {
    console.error('Error updating order:', err)
    res.status(400).json({ error: 'Error al actualizar el pedido' })
  }
})

// DELETE /api/orders/:id - Delete order (Admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteOrder(req.params.id, req.tenantId)
    if (!deleted) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    res.json({ success: true, message: 'Pedido eliminado con éxito' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el pedido' })
  }
})

export default router
