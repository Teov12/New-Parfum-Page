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
  dnsTarget: process.env.PLATFORM_DNS_TARGET || '',
  // Entorno de demostración: tiendas de ejemplo, acceso al panel sin contraseña y reinicio periódico.
  // Usar SIEMPRE con una base de datos propia (nunca la de producción).
  demoMode: process.env.DEMO_MODE === 'true'
}

// Tienda de ejemplo del entorno demo (las crea server/services/demoSeed.js)
export const isDemoStore = (tenant) => PLATFORM.demoMode && Boolean(tenant?.isDemo)

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
const requestProtocol = (req) => String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0]
const requestOrigin = (req) => `${requestProtocol(req)}://${req.get('host')}`

/**
 * Protocolo y puerto de las direcciones <sub>.<PLATFORM_DOMAIN>. Si la petición llegó por el dominio
 * de la plataforma se respetan los suyos (ej. http y :5173 al probar con PLATFORM_DOMAIN=localhost).
 */
const platformAddressParts = (req) => {
  const [hostname, port] = String(req?.get?.('host') || '').split(':')
  if (req && PLATFORM.domain && (hostname === PLATFORM.domain || hostname.endsWith(`.${PLATFORM.domain}`))) {
    return { protocol: requestProtocol(req), port: port ? `:${port}` : '' }
  }
  return {
    protocol: PLATFORM.domain === 'localhost' ? 'http' : 'https',
    port: process.env.PLATFORM_PORT ? `:${process.env.PLATFORM_PORT}` : ''
  }
}

export const getStoreUrl = (tenant, req = null) => {
  // Si la petición llegó por el dominio de la propia tienda, esa es la dirección que ve el cliente
  if (req && req.tenantFromHost && !req.isPlatformHost && req.tenantId === tenant?.tenantId) {
    return requestOrigin(req)
  }
  if (tenant?.tenantId === getDefaultTenantId() && process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  if (tenant?.domain) return `https://${tenant.domain}`
  if (PLATFORM.domain && tenant?.subdomain) {
    const { protocol, port } = platformAddressParts(req)
    return `${protocol}://${tenant.subdomain}.${PLATFORM.domain}${port}`
  }
  if (req) return requestOrigin(req)
  return process.env.SITE_URL ? process.env.SITE_URL.replace(/\/$/, '') : ''
}

// La tienda tiene una dirección propia (dominio, subdominio de la plataforma o es la principal)
const isReachableByHost = (tenant) => Boolean(
  tenant?.domain ||
  (PLATFORM.domain && tenant?.subdomain) ||
  (tenant?.tenantId === getDefaultTenantId() && !PLATFORM.demoMode)
)

/**
 * Link para entrar a una tienda. Si la tienda no tiene dirección propia (ej. entorno demo sin
 * subdominios), se entra por la dirección actual con ?tenant=<id> (modo vista previa del frontend).
 */
export const getStoreEntryUrl = (tenant, req = null, path = '/') => {
  const viaOwnHost = req && req.tenantFromHost && !req.isPlatformHost && req.tenantId === tenant?.tenantId
  if (viaOwnHost || isReachableByHost(tenant)) return `${getStoreUrl(tenant, req)}${path}`
  const base = req ? requestOrigin(req) : (process.env.SITE_URL || '').replace(/\/$/, '')
  return `${base}${path}${path.includes('?') ? '&' : '?'}tenant=${encodeURIComponent(tenant.tenantId)}`
}

// Planes en formato público (para la landing y el panel)
export const getPublicPlans = () => PLAN_IDS.map(id => {
  const { name, price, limits, features } = PLANS[id]
  return { id, name, price, limits, features }
})
