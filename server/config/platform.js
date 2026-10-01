/**
 * Configuración de la plataforma SaaS (la "Tiendanube de perfumerías").
 * Todo se ajusta por variables de entorno para no tocar código al cambiar precios o dominio.
 */

const num = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const PLATFORM = {
  name: process.env.PLATFORM_NAME || 'Perfumerías Online',
  // Dominio raíz de la plataforma: cada tienda se publica en <subdominio>.<PLATFORM_DOMAIN>
  domain: (process.env.PLATFORM_DOMAIN || '').toLowerCase().trim(),
  supportEmail: process.env.PLATFORM_SUPPORT_EMAIL || '',
  trialDays: num(process.env.TRIAL_DAYS, 14),
  // Días de gracia después de vencer la prueba o un pago antes de pausar la tienda
  graceDays: num(process.env.BILLING_GRACE_DAYS, 5),
  // IP o host al que las tiendas deben apuntar su dominio propio (se muestra en el panel)
  dnsTarget: process.env.PLATFORM_DNS_TARGET || ''
}

/**
 * Planes de suscripción. Precios mensuales en ARS.
 * limits.products / limits.staff: null = ilimitado.
 * commissionPercent: comisión de la plataforma por venta con Mercado Pago (solo cuentas conectadas por OAuth).
 */
export const PLANS = {
  basic: {
    id: 'basic',
    name: process.env.PLAN_BASIC_NAME || 'Inicial',
    price: num(process.env.PLAN_BASIC_PRICE, 19900),
    commissionPercent: num(process.env.PLAN_BASIC_COMMISSION, 0),
    limits: { products: num(process.env.PLAN_BASIC_PRODUCTS, 150), staff: 1, customDomain: false, invoicing: false },
    features: ['Tienda online con tu marca', 'Hasta 150 perfumes', 'Mercado Pago y transferencia', 'Envíos con Andreani', 'Subdominio incluido']
  },
  pro: {
    id: 'pro',
    name: process.env.PLAN_PRO_NAME || 'Profesional',
    price: num(process.env.PLAN_PRO_PRICE, 39900),
    commissionPercent: num(process.env.PLAN_PRO_COMMISSION, 0),
    limits: { products: num(process.env.PLAN_PRO_PRODUCTS, 1000), staff: 3, customDomain: true, invoicing: true },
    features: ['Todo lo del plan Inicial', 'Hasta 1.000 perfumes', 'Dominio propio', 'Facturación electrónica ARCA', '3 usuarios de equipo']
  },
  enterprise: {
    id: 'enterprise',
    name: process.env.PLAN_ENTERPRISE_NAME || 'Boutique Plus',
    price: num(process.env.PLAN_ENTERPRISE_PRICE, 79900),
    commissionPercent: num(process.env.PLAN_ENTERPRISE_COMMISSION, 0),
    limits: { products: null, staff: 10, customDomain: true, invoicing: true },
    features: ['Todo lo del plan Profesional', 'Perfumes ilimitados', '10 usuarios de equipo', 'Soporte prioritario']
  }
}

export const PLAN_IDS = Object.keys(PLANS)

export const getPlan = (planId) => PLANS[planId] || PLANS.pro

export const getDefaultTenantId = () => (process.env.DEFAULT_TENANT || 'gicca').toLowerCase().trim()

// La tienda principal de la instalación (la del dueño de la plataforma) no paga suscripción ni tiene límites
export const isBillingExempt = (tenant) => {
  if (!tenant) return true
  return tenant.tenantId === getDefaultTenantId() || tenant.billing?.status === 'exempt'
}

export const getTenantLimits = (tenant) => {
  if (isBillingExempt(tenant)) {
    return { products: null, staff: 25, customDomain: true, invoicing: true }
  }
  return getPlan(tenant?.plan).limits
}

/**
 * URL pública de la tienda (para emails, Mercado Pago, sitemap y SEO).
 */
export const getStoreUrl = (tenant, req = null) => {
  // Si la petición llegó por el dominio de la propia tienda, esa es la dirección que ve el cliente
  if (req && req.tenantFromHost && !req.isPlatformHost && req.tenantId === tenant?.tenantId) {
    const protocol = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0]
    return `${protocol}://${req.get('host')}`
  }
  if (tenant?.tenantId === getDefaultTenantId() && process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  if (tenant?.domain) return `https://${tenant.domain}`
  if (PLATFORM.domain && tenant?.subdomain) return `https://${tenant.subdomain}.${PLATFORM.domain}`
  if (req) {
    const protocol = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0]
    return `${protocol}://${req.get('host')}`
  }
  return process.env.SITE_URL ? process.env.SITE_URL.replace(/\/$/, '') : ''
}

// Planes en formato público (para la landing y el panel)
export const getPublicPlans = () => PLAN_IDS.map(id => {
  const { name, price, limits, features } = PLANS[id]
  return { id, name, price, limits, features }
})
