import { createOrder } from '../db.js'
import { findCoupon, calculateCouponDiscount } from './coupons.js'
import { resolveOrderShipping } from './shippingQuote.js'

/**
 * Crea un pedido de la tienda actual con todas las validaciones del servidor.
 * trusted=true solo para ventas manuales de un admin autenticado de esa tienda.
 */
export const placeOrder = async ({ orderData, tenant, tenantId, trusted = false }) => {
  return createOrder(orderData, tenantId, {
    trusted,
    findCoupon: (code) => findCoupon(tenant, code),
    calculateCouponDiscount,
    resolveShipping: (subtotal) => resolveOrderShipping({
      tenant,
      postalCode: orderData.customer?.postalCode,
      optionId: orderData.shippingOptionId,
      shippingMethod: orderData.shippingMethod,
      subtotal
    })
  })
}

// Vista del pedido que puede ver el comprador (sin datos internos de costos y ganancia)
export const toCustomerOrder = (order) => {
  if (!order) return order
  const { totalCost, profit, profitMargin, stockReleased, _id, __v, ...rest } = order
  return {
    ...rest,
    items: (order.items || []).map(({ costPrice, _id: itemId, ...item }) => item)
  }
}
