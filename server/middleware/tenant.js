import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { PLATFORM, getDefaultTenantId } from '../config/platform.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TENANT_FILE = path.join(__dirname, '..', 'data', 'tenant.json')

function getStoredLocalTenant() {
  try {
    if (fs.existsSync(TENANT_FILE)) {
      return JSON.parse(fs.readFileSync(TENANT_FILE, 'utf-8'))
    }
  } catch (e) {
    // ignore
  }
  return null
}

// Cache en memoria para resolver dominios rápidamente sin golpear la base de datos en cada request
const tenantCache = new Map()

// Configuración de respaldo de la tienda principal de la instalación (Gicca Perfumes)
export const DEFAULT_TENANT_CONFIG = {
  tenantId: 'gicca',
  name: 'Gicca Perfumes',
  slug: 'gicca',
  domain: 'giccaparfumes.com.ar',
  subdomain: 'gicca',
  status: 'active',
  plan: 'pro',
  branding: {
    logoUrl: '',
    iconUrl: '',
    storeIcon: 'spa',
    faviconUrl: '',
    tagline: 'Atelier de Alta Perfumería',
    paletteId: 'amber',
    primaryColor: '#2E1911',
    primaryContainer: '#784233',
    surface: '#fffdfa',
    accentColor: '#D4AF37',
    instagramUrl: 'https://instagram.com/giccaparfum',
    whatsappNumber: '+5493564123456'
  },
  commercial: {
    cbu: '',
    alias: 'GICCA.PERFUMES',
    bankName: 'Banco Galicia',
    accountHolder: 'Gicca Perfumes S.A.',
    cuit: '20-12345678-9',
    mercadoPagoAccessToken: '',
    mercadoPagoPublicKey: '',
    mpAccessToken: '',
    mpPublicKey: '',
    cardFeeRate: 28,
    andreaniContractNumber: '',
    freeShippingThreshold: 250000
  },
  seo: {
    title: 'Gicca Perfumes | Perfumes Importados & Fragancias Árabes 100% Originales Argentina',
    description: 'Boutique exclusiva de perfumes importados de diseñador y perfumería árabe en Argentina. 100% originales en caja sellada con batch code verificable. Hasta 6 cuotas sin interés y envíos asegurados a todo el país con Andreani.',
    keywords: 'perfumes importados, perfumes arabes argentina, perfumes originales, comprar perfumes online, lattafa argentina, dior sauvage, bleu de chanel, perfumes cordoba, envios andreani, perfumes cuotas sin interes',
    ogImage: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85'
  }
}

// Cuánto tiempo se recuerda la tienda de un dominio (los cambios de estado se reflejan en este plazo)
const HOST_CACHE_TTL_MS = 60 * 1000

export { getDefaultTenantId }

const setRequestTenant = (req, tenant, flags = {}) => {
  req.tenant = tenant
  // Siempre el id de la tienda efectivamente resuelta: un id inexistente nunca debe
  // operar con credenciales de otra tienda ni crear datos "huérfanos"
  req.tenantId = tenant.tenantId
  req.isPlatformHost = Boolean(flags.platformHost)
  req.storeNotFound = Boolean(flags.notFound)
  req.storeSuspended = tenant.status === 'suspended'
  // Si la tienda salió del dominio de la petición, su URL pública puede tomarse de ese mismo host
  req.tenantFromHost = Boolean(flags.fromHost)
}

const getDefaultTenant = async () => resolveTenantById(getDefaultTenantId())

/**
 * Resuelve la tienda a partir del dominio:
 * - <PLATFORM_DOMAIN> o www.<PLATFORM_DOMAIN>: sitio de la plataforma (landing y alta de tiendas)
 * - <sub>.<PLATFORM_DOMAIN>: tienda por subdominio
 * - cualquier otro dominio: tienda con ese dominio propio
 */
const resolveByHost = async (host) => {
  if (!isMongoConnected()) {
    return { tenant: getLocalDefaultTenant() }
  }

  const platformDomain = PLATFORM.domain
  if (platformDomain) {
    if (host === platformDomain || host === `www.${platformDomain}`) {
      return { tenant: await getDefaultTenant(), platformHost: true }
    }
    if (host.endsWith(`.${platformDomain}`)) {
      const subdomain = host.slice(0, -(platformDomain.length + 1))
      const doc = await Tenant.findOne({ subdomain }).lean()
      if (doc) return { tenant: doc }
      // La tienda principal responde en su subdominio aunque todavía viva en tenant.json
      const defaultTenant = await getDefaultTenant()
      if (subdomain === defaultTenant.tenantId || subdomain === defaultTenant.subdomain) return { tenant: defaultTenant }
      return { tenant: defaultTenant, notFound: true }
    }
  }

  const bareHost = host.replace(/^www\./, '')
  const byDomain = await Tenant.findOne({ domain: { $in: [host, bareHost] } }).lean()
  if (byDomain) return { tenant: byDomain }

  // Entorno demo sin dominio de plataforma: la dirección principal muestra la landing
  // (las tiendas de ejemplo se abren con ?tenant=<id>)
  if (PLATFORM.demoMode && !platformDomain) {
    return { tenant: await getDefaultTenant(), platformHost: true }
  }

  return { tenant: await getDefaultTenant() }
}

export const tenantMiddleware = async (req, res, next) => {
  try {
    // 1. Prioridad: Header 'x-tenant-id' (usado por el frontend o mobile app)
    const headerTenant = req.headers['x-tenant-id']
    if (headerTenant) {
      setRequestTenant(req, await resolveTenantById(String(headerTenant).toLowerCase().trim()))
      return next()
    }

    // 2. Prioridad: Query param '?tenant=...' (vista previa desde la consola y webhooks)
    const queryTenant = req.query.tenant
    if (queryTenant) {
      setRequestTenant(req, await resolveTenantById(String(queryTenant).toLowerCase().trim()))
      return next()
    }

    // 3. Prioridad: Resolución automática por Dominio o Subdominio
    const host = req.headers.host || req.hostname || ''
    const cleanHost = host.split(':')[0].toLowerCase() // Remover puerto

    const cached = tenantCache.get(cleanHost)
    if (cached && cached.expiresAt > Date.now()) {
      setRequestTenant(req, cached.tenant, cached)
      return next()
    }

    const resolved = { ...(await resolveByHost(cleanHost)), fromHost: true }
    if (isMongoConnected()) {
      tenantCache.set(cleanHost, { ...resolved, expiresAt: Date.now() + HOST_CACHE_TTL_MS })
    }
    setRequestTenant(req, resolved.tenant, resolved)
    next()
  } catch (err) {
    console.error('[Tenant Middleware] Error resolviendo tenant:', err.message)
    setRequestTenant(req, getLocalDefaultTenant())
    next()
  }
}

/**
 * Configuración de la tienda por defecto guardada en server/data/tenant.json.
 * Solo aplica a la tienda principal (modo local sin MongoDB o instalación previa al multi-tienda),
 * nunca se mezcla con la configuración de otras perfumerías.
 */
export const getLocalDefaultTenant = () => {
  // En el entorno demo nunca se usan los datos reales de la tienda principal (tenant.json)
  if (PLATFORM.demoMode) {
    return {
      ...DEFAULT_TENANT_CONFIG,
      tenantId: getDefaultTenantId(),
      slug: getDefaultTenantId(),
      name: PLATFORM.name,
      domain: '',
      subdomain: '',
      branding: { ...DEFAULT_TENANT_CONFIG.branding, tagline: '', instagramUrl: '', whatsappNumber: '' },
      commercial: { ...DEFAULT_TENANT_CONFIG.commercial, alias: '', cbu: '', bankName: '', accountHolder: '', cuit: '', mercadoPagoAccessToken: '', mpAccessToken: '' },
      seo: { title: PLATFORM.name, description: '', keywords: '', ogImage: '' }
    }
  }
  const base = { ...DEFAULT_TENANT_CONFIG, tenantId: getDefaultTenantId() }
  const local = getStoredLocalTenant()
  if (!local) return base
  return {
    ...base,
    ...local,
    tenantId: base.tenantId,
    branding: { ...DEFAULT_TENANT_CONFIG.branding, ...(local.branding || {}) },
    commercial: { ...DEFAULT_TENANT_CONFIG.commercial, ...(local.commercial || {}) },
    seo: { ...DEFAULT_TENANT_CONFIG.seo, ...(local.seo || {}) }
  }
}

/**
 * Busca una tienda por id (cualquier estado: las suspendidas se marcan en req.storeSuspended).
 * Un id inexistente resuelve a la tienda principal.
 */
export async function resolveTenantById(id) {
  const defaultId = getDefaultTenantId()

  if (isMongoConnected()) {
    try {
      const doc = await Tenant.findOne({ tenantId: id }).lean()
      if (doc) return doc

      if (id !== defaultId) {
        const defaultDoc = await Tenant.findOne({ tenantId: defaultId }).lean()
        if (defaultDoc) return defaultDoc
      }
    } catch {
      // Silencioso, cae en fallback
    }
  }

  return getLocalDefaultTenant()
}

export const clearTenantCache = () => {
  tenantCache.clear()
}

/**
 * Bloquea la venta en tiendas pausadas o inexistentes (el dueño autenticado sigue operando su panel).
 */
export const requireStoreOpen = (req, res, next) => {
  if (req.storeNotFound) {
    return res.status(404).json({ error: 'Esta tienda no existe.', code: 'store_not_found' })
  }
  if (req.storeSuspended) {
    return res.status(423).json({ error: 'La tienda está pausada temporalmente y no está tomando pedidos.', code: 'store_suspended' })
  }
  next()
}
