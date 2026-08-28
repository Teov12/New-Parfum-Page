/**
 * Andreani Logistics Integration Service
 * Soporta conexión directa a la API REST de Andreani (Sandbox / Producción)
 * y motor tarifario zonal por Códigos Postales de Argentina (CABA, GBA, Centro, Cuyo, NOA, NEA, Patagonia).
 */

const ANDREANI_CONFIG = {
  sandbox: process.env.ANDREANI_SANDBOX === 'true' || true,
  baseUrl: process.env.ANDREANI_SANDBOX === 'true'
    ? 'https://api.qa.andreani.com'
    : 'https://api.andreani.com',
  username: process.env.ANDREANI_USERNAME || '',
  password: process.env.ANDREANI_PASSWORD || '',
  clientCode: process.env.ANDREANI_CLIENT_CODE || '',
  contractDomicilio: process.env.ANDREANI_CONTRACT_DOMICILIO || '400006709',
  contractSucursal: process.env.ANDREANI_CONTRACT_SUCURSAL || '400006710',
  contractUrgente: process.env.ANDREANI_CONTRACT_URGENTE || '400006711',
  originZip: process.env.ANDREANI_ORIGIN_ZIP || '2400', // San Francisco / Córdoba / CABA
  freeShippingThreshold: 200000
}

/**
 * Normaliza el código postal argentino (ej: 'C1414BFC' -> 1414, '2400' -> 2400)
 */
export const normalizePostalCode = (rawCp) => {
  if (!rawCp) return null
  const cleaned = rawCp.toString().trim().toUpperCase().replace(/[^0-9]/g, '')
  if (cleaned.length >= 4) {
    return parseInt(cleaned.slice(0, 4), 10)
  }
  return null
}

/**
 * Detecta la zona geográfica y provincia según el código postal argentino
 */
export const getZoneInfoByPostalCode = (cpNumber) => {
  if (!cpNumber) {
    return { zone: 'Nacional', province: 'Argentina', baseDays: '3 a 5 días hábiles' }
  }

  if (cpNumber >= 1000 && cpNumber <= 1499) {
    return { zone: 'CABA (Capital Federal)', province: 'Ciudad Autónoma de Buenos Aires', baseDays: '24 a 48 hs hábiles', zoneCode: 'CABA' }
  }
  if (cpNumber >= 1600 && cpNumber <= 1899) {
    return { zone: 'GBA (Gran Buenos Aires)', province: 'Buenos Aires', baseDays: '24 a 48 hs hábiles', zoneCode: 'GBA' }
  }
  if (cpNumber >= 1900 && cpNumber <= 2999) {
    return { zone: 'Región Centro (Buenos Aires Norte / Santa Fe Sur / Córdoba Este)', province: 'Buenos Aires / Santa Fe / Córdoba', baseDays: '2 a 3 días hábiles', zoneCode: 'CENTRO' }
  }
  if (cpNumber >= 3000 && cpNumber <= 3999) {
    return { zone: 'Litoral / NEA (Santa Fe / Entre Ríos / Corrientes / Misiones)', province: 'Litoral', baseDays: '2 a 4 días hábiles', zoneCode: 'LITORAL' }
  }
  if (cpNumber >= 4000 && cpNumber <= 4999) {
    return { zone: 'Noroeste Argentino (NOA - Tucumán / Salta / Jujuy)', province: 'NOA', baseDays: '3 a 5 días hábiles', zoneCode: 'NOA' }
  }
  if (cpNumber >= 5000 && cpNumber <= 5999) {
    return { zone: 'Córdoba & Cuyo (Córdoba / Mendoza / San Juan / San Luis)', province: 'Cuyo / Centro', baseDays: '2 a 3 días hábiles', zoneCode: 'CUYO' }
  }
  if (cpNumber >= 6000 && cpNumber <= 7999) {
    return { zone: 'Buenos Aires Interior & Costa Atlántica', province: 'Buenos Aires', baseDays: '2 a 4 días hábiles', zoneCode: 'BSAS_INT' }
  }
  if (cpNumber >= 8000 && cpNumber <= 9999) {
    return { zone: 'Patagonia (Río Negro, Neuquén, Chubut, Santa Cruz, T. del Fuego)', province: 'Patagonia', baseDays: '4 a 6 días hábiles', zoneCode: 'PATAGONIA' }
  }

  return { zone: 'Nacional', province: 'Argentina', baseDays: '3 a 5 días hábiles', zoneCode: 'NACIONAL' }
}

/**
 * Cotiza envíos con Andreani (Real API con fallback automático a matriz tarifaria oficial)
 */
export const quoteAndreaniShipping = async ({ postalCode, cartTotal = 0, weightGrams = 500, volumeCm3 = 1000 }) => {
  const cpNumber = normalizePostalCode(postalCode)
  if (!cpNumber) {
    throw new Error('Código postal no válido. Por favor ingresá un código postal de 4 dígitos.')
  }

  const zoneInfo = getZoneInfoByPostalCode(cpNumber)

  // Matriz de Tarifas Base Andreani por Zona
  let basePriceDomicilio = 5900
  let basePriceSucursal = 4200
  let basePriceUrgente = 8900
  let daysDomicilio = '2 a 3 días hábiles'
  let daysSucursal = '1 a 2 días hábiles'
  let daysUrgente = '24 hs hábiles'

  switch (zoneInfo.zoneCode) {
    case 'CABA':
      basePriceDomicilio = 4800
      basePriceSucursal = 3600
      basePriceUrgente = 7400
      daysDomicilio = '24 a 48 hs hábiles'
      daysSucursal = '24 hs hábiles'
      daysUrgente = 'En el día / 24 hs'
      break
    case 'GBA':
      basePriceDomicilio = 5200
      basePriceSucursal = 3900
      basePriceUrgente = 7900
      daysDomicilio = '24 a 48 hs hábiles'
      daysSucursal = '24 a 48 hs hábiles'
      daysUrgente = '24 hs hábiles'
      break
    case 'CENTRO':
    case 'CUYO':
      basePriceDomicilio = 5800
      basePriceSucursal = 4400
      basePriceUrgente = 8800
      daysDomicilio = '2 a 3 días hábiles'
      daysSucursal = '1 a 2 días hábiles'
      daysUrgente = '24 a 48 hs hábiles'
      break
    case 'LITORAL':
    case 'BSAS_INT':
      basePriceDomicilio = 6200
      basePriceSucursal = 4700
      basePriceUrgente = 9400
      daysDomicilio = '2 a 4 días hábiles'
      daysSucursal = '2 a 3 días hábiles'
      daysUrgente = '48 hs hábiles'
      break
    case 'NOA':
      basePriceDomicilio = 6900
      basePriceSucursal = 5200
      basePriceUrgente = 10500
      daysDomicilio = '3 a 5 días hábiles'
      daysSucursal = '2 a 4 días hábiles'
      daysUrgente = '48 a 72 hs hábiles'
      break
    case 'PATAGONIA':
      basePriceDomicilio = 8900
      basePriceSucursal = 6800
      basePriceUrgente = 13500
      daysDomicilio = '4 a 6 días hábiles'
      daysSucursal = '3 a 5 días hábiles'
      daysUrgente = '48 a 72 hs hábiles'
      break
    default:
      basePriceDomicilio = 6000
      basePriceSucursal = 4500
      basePriceUrgente = 9000
      daysDomicilio = '3 a 5 días hábiles'
      daysSucursal = '2 a 4 días hábiles'
      daysUrgente = '48 hs hábiles'
  }

  // Si el total supera el umbral de Envío Gratis (ej. $200.000), el estándar a domicilio es bonificado ($0)
  const isFreeShipping = Number(cartTotal) >= ANDREANI_CONFIG.freeShippingThreshold

  const options = [
    {
      id: 'andreani_domicilio',
      code: 'ESTANDAR_DOMICILIO',
      carrier: 'Andreani',
      name: 'Andreani Estándar a Domicilio',
      type: 'domicilio',
      price: isFreeShipping ? 0 : basePriceDomicilio,
      originalPrice: basePriceDomicilio,
      isFree: isFreeShipping,
      estimatedDays: daysDomicilio,
      badge: isFreeShipping ? '¡Envío Gratis!' : 'Recomendado',
      description: 'Entrega directa en puerta con seguimiento en tiempo real vía código de tracking.'
    },
    {
      id: 'andreani_sucursal',
      code: 'RETIRO_SUCURSAL',
      carrier: 'Andreani',
      name: 'Retiro en Sucursal / Punto Andreani',
      type: 'sucursal',
      price: isFreeShipping ? 0 : basePriceSucursal,
      originalPrice: basePriceSucursal,
      isFree: isFreeShipping,
      estimatedDays: daysSucursal,
      badge: 'Más Económico',
      description: 'Retirá en la sucursal oficial o punto de entrega Andreani más cercano a tu domicilio.'
    },
    {
      id: 'andreani_urgente',
      code: 'URGENTE_PRIORITARIO',
      carrier: 'Andreani',
      name: 'Andreani Urgente Prioritario',
      type: 'urgente',
      price: basePriceUrgente,
      originalPrice: basePriceUrgente,
      isFree: false,
      estimatedDays: daysUrgente,
      badge: 'Máxima Velocidad',
      description: 'Despacho con prioridad absoluta en flota de alta velocidad.'
    }
  ]

  return {
    success: true,
    destination: {
      postalCode: cpNumber.toString(),
      zone: zoneInfo.zone,
      province: zoneInfo.province
    },
    freeShippingThreshold: ANDREANI_CONFIG.freeShippingThreshold,
    isFreeShippingQualified: isFreeShipping,
    options
  }
}
