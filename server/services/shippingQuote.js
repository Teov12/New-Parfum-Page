import { quoteAndreaniShipping, getAndreaniConfig, normalizePostalCode } from './andreani.js'
import { OrderError } from '../db.js'

// Un método propio aplica al CP si no tiene restricciones o coincide con un prefijo o rango ("5000-5020")
const matchesPostalCode = (method, postalCode) => {
  const list = (method.postalCodes || []).map(cp => String(cp).trim()).filter(Boolean)
  if (list.length === 0) return true
  const cpNumber = Number(normalizePostalCode(postalCode))
  const raw = String(postalCode || '').trim().toUpperCase()

  return list.some(entry => {
    const range = entry.match(/^(\d{4})\s*-\s*(\d{4})$/)
    if (range) return cpNumber >= Number(range[1]) && cpNumber <= Number(range[2])
    return raw.startsWith(entry.toUpperCase()) || String(cpNumber).startsWith(entry)
  })
}

const METHOD_TYPE_LABELS = { pickup: 'retiro', local: 'domicilio', flat: 'domicilio' }

const buildCustomOptions = (tenant, postalCode, cartTotal) => {
  return (tenant?.shippingMethods || [])
    .filter(m => m.active !== false && matchesPostalCode(m, postalCode))
    .map(m => {
      const isFree = Number(m.freeOver) > 0 && Number(cartTotal) >= Number(m.freeOver)
      const price = isFree ? 0 : Math.max(0, Number(m.price) || 0)
      return {
        id: m.id,
        code: String(m.type || 'flat').toUpperCase(),
        carrier: tenant?.name || 'Tienda',
        name: m.name,
        type: METHOD_TYPE_LABELS[m.type] || 'domicilio',
        methodType: m.type,
        price,
        originalPrice: Math.max(0, Number(m.price) || 0),
        isFree: price === 0,
        estimatedDays: m.estimatedDays || '',
        badge: m.type === 'pickup' ? 'Sin costo de envío' : (isFree ? 'Envío Gratis' : ''),
        description: m.description || '',
        isLiveRate: false
      }
    })
}

/**
 * Opciones de envío disponibles para la tienda y el código postal indicados:
 * Andreani (con la cuenta de la tienda o tarifas de referencia) + métodos propios de la tienda.
 */
export const quoteShippingOptions = async ({ tenant, postalCode, cartTotal }) => {
  const andreaniEnabled = !tenant?.commercial?.andreani?.disabled
  const customOptions = buildCustomOptions(tenant, postalCode, cartTotal)

  if (!andreaniEnabled) {
    if (!normalizePostalCode(postalCode)) {
      throw new Error('Código postal no válido. Por favor ingresá un código postal argentino de 4 dígitos.')
    }
    if (customOptions.length === 0) {
      throw new Error('No hay opciones de envío disponibles para ese código postal.')
    }
    return {
      success: true,
      destination: { postalCode: String(normalizePostalCode(postalCode)), zone: '', province: '' },
      rateSource: 'store_methods',
      options: customOptions
    }
  }

  const quote = await quoteAndreaniShipping({ postalCode, cartTotal }, getAndreaniConfig(tenant))
  return {
    ...quote,
    freeShippingThreshold: Number.isFinite(quote.freeShippingThreshold) ? quote.freeShippingThreshold : 0,
    options: [...quote.options, ...customOptions]
  }
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
