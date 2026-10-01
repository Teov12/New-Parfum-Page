import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { getDefaultTenantId } from '../config/platform.js'
import { clearTenantCache } from '../middleware/tenant.js'

// Cupones históricos de la tienda principal (antes vivían en el frontend).
// Se usan solo mientras esa tienda no tenga cupones propios cargados desde el panel.
const LEGACY_DEFAULT_COUPONS = [
  { code: 'GICCA10', type: 'percentage', value: 10, label: '10% OFF en tu orden', active: true },
  { code: 'PERFUME10', type: 'percentage', value: 10, label: '10% OFF en tu orden', active: true },
  { code: 'PROMO15', type: 'percentage', value: 15, label: '15% OFF Especial', active: true },
  { code: 'LUJO15', type: 'percentage', value: 15, label: '15% OFF Especial', active: true },
  { code: 'BIENVENIDO', type: 'fixed', value: 10000, label: '$10.000 OFF de Bienvenida', active: true }
]

export const getTenantCoupons = (tenant) => {
  if (Array.isArray(tenant?.coupons)) return tenant.coupons
  return tenant?.tenantId === getDefaultTenantId() ? LEGACY_DEFAULT_COUPONS : []
}

const isExpired = (coupon) => coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()
const isExhausted = (coupon) => Number(coupon.usageLimit) > 0 && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)

/**
 * Busca un cupón usable de la tienda. Devuelve { coupon } o { error } con el motivo para el comprador.
 * subtotal (opcional) valida el monto mínimo de compra.
 */
export const checkCoupon = (tenant, code, subtotal = null) => {
  const clean = String(code || '').trim().toUpperCase()
  if (!clean) return { error: 'Ingresá un código de cupón.' }

  const coupon = getTenantCoupons(tenant).find(c => String(c.code).toUpperCase() === clean)
  if (!coupon || coupon.active === false || isExpired(coupon) || isExhausted(coupon)) {
    return { error: 'El cupón ingresado no es válido o ha expirado.' }
  }

  const minPurchase = Math.max(0, Number(coupon.minPurchase) || 0)
  if (subtotal !== null && minPurchase > 0 && subtotal < minPurchase) {
    return { error: `Este cupón aplica en compras desde $${minPurchase.toLocaleString('es-AR')}.` }
  }

  return {
    coupon: {
      code: clean,
      type: coupon.type === 'fixed' ? 'fixed' : 'percentage',
      value: Math.max(0, Number(coupon.value) || 0),
      label: coupon.label || '',
      minPurchase
    }
  }
}

export const findCoupon = (tenant, code, subtotal = null) => checkCoupon(tenant, code, subtotal).coupon || null

// Mismo cálculo que el carrito del frontend: el cupón se aplica sobre el subtotal de lista
export const calculateCouponDiscount = (coupon, subtotal) => {
  if (!coupon) return 0
  if (coupon.minPurchase > 0 && subtotal < coupon.minPurchase) return 0
  if (coupon.type === 'percentage') {
    return Math.round((subtotal * Math.min(100, coupon.value)) / 100)
  }
  return Math.min(subtotal, Math.round(coupon.value))
}

// Suma un uso al cupón (para los cupones con límite de usos)
export const registerCouponUse = async (tenantId, code) => {
  if (!code || !isMongoConnected()) return
  await Tenant.updateOne(
    { tenantId, 'coupons.code': String(code).toUpperCase() },
    { $inc: { 'coupons.$.usedCount': 1 } }
  ).catch(err => console.warn('[Coupons] No se pudo registrar el uso:', err.message))
  // El límite de usos se valida con la configuración en caché: se refresca enseguida
  clearTenantCache()
}

/**
 * Normaliza la lista de cupones que guarda el dueño desde el panel.
 */
export const sanitizeCoupons = (list, previous = []) => {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  return list.slice(0, 200).map(c => {
    const code = String(c.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30)
    if (!code || seen.has(code)) return null
    seen.add(code)
    const before = previous.find(p => String(p.code).toUpperCase() === code)
    const type = c.type === 'fixed' ? 'fixed' : 'percentage'
    const value = Math.max(0, Number(c.value) || 0)
    return {
      code,
      type,
      value: type === 'percentage' ? Math.min(100, value) : value,
      label: String(c.label || '').slice(0, 80),
      minPurchase: Math.max(0, Number(c.minPurchase) || 0),
      expiresAt: c.expiresAt ? new Date(c.expiresAt) : undefined,
      usageLimit: Math.max(0, Math.floor(Number(c.usageLimit) || 0)),
      // El contador de usos lo lleva el servidor
      usedCount: Number(before?.usedCount) || 0,
      active: c.active !== false
    }
  }).filter(Boolean)
}
