import { getProducts, getOrderByIdOrNumber, updateOrder } from '../db.js'
import { isMongoConnected } from '../dbConnection.js'
import { AbandonedCart } from '../models/AbandonedCart.js'
import { registerCouponUse } from './coupons.js'
import { issueInvoice, isInvoicingReady } from './invoicing.js'
import {
  sendOrderConfirmationEmail,
  sendStoreOwnerNewOrderAlert,
  sendEmail,
  renderLayout,
  getStoreContactEmail,
  escapeHtml
} from './mailer.js'

const logError = (label) => (err) => console.warn(`[OrderEvents] ${label}:`, err.message)

// Stock disponible de la presentación (si lleva stock propio) o del producto
const stockFor = (product, size) => {
  const sizeEntry = product.sizes?.find(s => s.size === size && typeof s.stock === 'number')
  return sizeEntry ? sizeEntry.stock : Number(product.stock ?? 0)
}

/**
 * Avisa al dueño los productos que con esta venta quedaron en el umbral de stock bajo (una vez por cruce).
 */
const sendLowStockAlert = async ({ order, tenant }) => {
  const automations = tenant?.automations || {}
  if (automations.lowStockAlerts === false) return
  const threshold = Number(automations.lowStockThreshold ?? 2)
  const to = getStoreContactEmail(tenant)
  if (!to) return

  const products = await getProducts(order.tenantId)
  const low = []
  for (const item of order.items || []) {
    const product = products.find(p => p.id === item.id)
    if (!product) continue
    const now = stockFor(product, item.size)
    if (now <= threshold && now + Number(item.quantity) > threshold) {
      low.push({ name: product.name, size: item.size, stock: now })
    }
  }
  if (low.length === 0) return

  const rows = low.map(l => `<li><strong>${escapeHtml(l.name)}</strong> (${escapeHtml(l.size)}): quedan ${l.stock}</li>`).join('')
  await sendEmail({
    to,
    subject: `Stock bajo: ${low.map(l => l.name).join(', ').slice(0, 80)}`,
    html: renderLayout({ tenant, title: 'Stock bajo', subtitle: 'Aviso de inventario', body: `<p>Con el pedido #${escapeHtml(order.orderNumber)} estos perfumes quedaron con poco stock:</p><ul>${rows}</ul><p>Reponelos desde Admin &gt; Catálogo para no perder ventas.</p>` }),
    fromName: tenant?.name
  })
}

/**
 * Después de registrar un pedido (web, Mercado Pago o venta manual).
 */
export const afterOrderCreated = ({ order, tenant, notifyCustomer = true }) => {
  if (notifyCustomer) {
    sendOrderConfirmationEmail({ order, tenant }).catch(logError('confirmación al cliente'))
  }
  sendStoreOwnerNewOrderAlert({ order, tenant }).catch(logError('aviso al dueño'))

  if (order.couponCode) {
    registerCouponUse(order.tenantId, order.couponCode).catch(logError('uso de cupón'))
  }

  // El carrito abandonado de ese email ya no necesita recordatorio
  if (isMongoConnected() && order.customer?.email) {
    AbandonedCart.updateMany(
      { tenantId: order.tenantId, email: String(order.customer.email).toLowerCase(), recoveredAt: null },
      { $set: { recoveredAt: new Date() } }
    ).catch(logError('carrito recuperado'))
  }

  sendLowStockAlert({ order, tenant }).catch(logError('stock bajo'))
}

/**
 * Factura un pedido y guarda el resultado (o el error) en el pedido.
 */
export const invoiceOrder = async ({ order, tenant }) => {
  try {
    const invoice = await issueInvoice({ tenant, order })
    return await updateOrder(order.id, { invoice }, order.tenantId, { internal: true })
  } catch (err) {
    if (err.status !== 409) {
      await updateOrder(order.id, { invoice: { ...(order.invoice || {}), error: err.message } }, order.tenantId, { internal: true })
        .catch(logError('guardar error de factura'))
    }
    throw err
  }
}

/**
 * Cuando un pedido pasa a pagado (Mercado Pago o confirmación manual del dueño).
 */
export const afterOrderPaid = async ({ order, tenant, notify = true }) => {
  if (notify) sendOrderConfirmationEmail({ order, tenant }).catch(logError('confirmación de pago'))

  if (tenant?.invoicing?.autoIssueOnPaid && isInvoicingReady(tenant)) {
    const fresh = await getOrderByIdOrNumber(order.id, order.tenantId)
    if (fresh && !fresh.invoice?.cae) {
      invoiceOrder({ order: fresh, tenant }).catch(logError(`factura automática #${order.orderNumber}`))
    }
  }
}
