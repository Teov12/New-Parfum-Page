import { quoteAndreaniShipping } from './andreani.js'
import { OrderError } from '../db.js'

/**
 * Opciones de envío disponibles para la tienda y el código postal indicados.
 */
export const quoteShippingOptions = async ({ tenant, postalCode, cartTotal }) => {
  return quoteAndreaniShipping({ postalCode, cartTotal })
}

/**
 * Recotiza del lado del servidor el envío elegido por el comprador, para que el costo
 * nunca dependa de lo que envía el navegador.
 */
export const resolveOrderShipping = async ({ tenant, postalCode, optionId, shippingMethod, subtotal }) => {
  let quote
  try {
    quote = await quoteShippingOptions({ tenant, postalCode, cartTotal: subtotal })
  } catch (err) {
    throw new OrderError(err.message || 'No pudimos cotizar el envío para ese código postal.', 400)
  }

  const options = quote?.options || []
  const option = options.find(o => o.id === optionId)
    || options.find(o => o.name === shippingMethod)
    || options[0]

  if (!option) {
    throw new OrderError('No hay opciones de envío disponibles para ese código postal.', 400)
  }
  return { cost: option.price, name: option.name, optionId: option.id }
}
