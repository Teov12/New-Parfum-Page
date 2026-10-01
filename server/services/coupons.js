import { getDefaultTenantId } from '../middleware/tenant.js'

// Cupones históricos de la tienda principal (antes vivían en el frontend).
// Se usan solo mientras esa tienda no tenga cupones propios cargados.
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

/**
 * Busca un cupón activo de la tienda. Devuelve { code, type, value, label } o null.
 */
export const findCoupon = (tenant, code) => {
  const clean = String(code || '').trim().toUpperCase()
  if (!clean) return null
  const coupon = getTenantCoupons(tenant).find(c => c.active !== false && String(c.code).toUpperCase() === clean)
  if (!coupon) return null
  return {
    code: clean,
    type: coupon.type === 'fixed' ? 'fixed' : 'percentage',
    value: Math.max(0, Number(coupon.value) || 0),
    label: coupon.label || ''
  }
}

// Mismo cálculo que el carrito del frontend: el cupón se aplica sobre el subtotal de lista
export const calculateCouponDiscount = (coupon, subtotal) => {
  if (!coupon) return 0
  if (coupon.type === 'percentage') {
    return Math.round((subtotal * Math.min(100, coupon.value)) / 100)
  }
  return Math.min(subtotal, Math.round(coupon.value))
}
