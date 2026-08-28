import express from 'express'
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder
} from '../db.js'

const router = express.Router()

// GET /api/orders - List all orders with filters
router.get('/', (req, res) => {
  try {
    let orders = getOrders()
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

// GET /api/orders/stats - Comprehensive financial and sales stats (Tienda Nube style)
router.get('/stats', (req, res) => {
  try {
    const orders = getOrders()
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

// GET /api/orders/:id - Get single order
router.get('/:id', (req, res) => {
  try {
    const orders = getOrders()
    const order = orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    res.json(order)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el pedido' })
  }
})

// POST /api/orders - Create new order (manual sale from admin or web)
router.post('/', (req, res) => {
  try {
    const orderData = req.body
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe incluir al menos un producto' })
    }

    const created = createOrder(orderData)
    res.status(201).json(created)
  } catch (err) {
    console.error('Error creating order:', err)
    res.status(400).json({ error: err.message || 'Error al registrar el pedido' })
  }
})

// PUT /api/orders/:id - Update order status, tracking, fulfillment, etc.
router.put('/:id', (req, res) => {
  try {
    const updated = updateOrder(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    res.json(updated)
  } catch (err) {
    console.error('Error updating order:', err)
    res.status(400).json({ error: 'Error al actualizar el pedido' })
  }
})

// DELETE /api/orders/:id - Delete order
router.delete('/:id', (req, res) => {
  try {
    const deleted = deleteOrder(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }
    res.json({ success: true, message: 'Pedido eliminado con éxito' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar el pedido' })
  }
})

export default router
