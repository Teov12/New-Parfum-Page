import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'

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

// Default fallback configuration para Gicca Perfumes
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
  }
}

// Estados con tienda online (una tienda suspendida no se resuelve por dominio)
const ONLINE_STATUSES = ['active', 'trial']

export const getDefaultTenantId = () => (process.env.DEFAULT_TENANT || 'gicca').toLowerCase().trim()

const setRequestTenant = (req, tenant) => {
  req.tenant = tenant
  // Siempre el id de la tienda efectivamente resuelta: un id inexistente nunca debe
  // operar con credenciales de otra tienda ni crear datos "huérfanos"
  req.tenantId = tenant.tenantId
}

export const tenantMiddleware = async (req, res, next) => {
  try {
    // 1. Prioridad: Header 'x-tenant-id' (usado por el frontend o mobile app)
    const headerTenant = req.headers['x-tenant-id']
    if (headerTenant) {
      setRequestTenant(req, await resolveTenantById(String(headerTenant).toLowerCase().trim()))
      return next()
    }

    // 2. Prioridad: Query param '?tenant=...' (útil para pruebas en desarrollo)
    const queryTenant = req.query.tenant
    if (queryTenant) {
      setRequestTenant(req, await resolveTenantById(String(queryTenant).toLowerCase().trim()))
      return next()
    }

    // 3. Prioridad: Resolución automática por Dominio o Subdominio
    const host = req.headers.host || req.hostname || ''
    const cleanHost = host.split(':')[0].toLowerCase() // Remover puerto

    if (tenantCache.has(cleanHost)) {
      setRequestTenant(req, tenantCache.get(cleanHost))
      return next()
    }

    if (isMongoConnected()) {
      // Buscar por dominio exacto (ej: giccaparfumes.com.ar o royalparfum.com)
      let tenantDoc = await Tenant.findOne({ 
        $or: [
          { domain: cleanHost },
          { subdomain: cleanHost.split('.')[0] }
        ],
        status: { $in: ONLINE_STATUSES }
      }).lean()

      if (tenantDoc) {
        tenantCache.set(cleanHost, tenantDoc)
        setRequestTenant(req, tenantDoc)
        return next()
      }
    }

    // 4. Fallback por defecto: tienda principal de la instalación
    setRequestTenant(req, await resolveTenantById(getDefaultTenantId()))
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
  const base = { ...DEFAULT_TENANT_CONFIG, tenantId: getDefaultTenantId() }
  const local = getStoredLocalTenant()
  if (!local) return base
  return {
    ...base,
    ...local,
    tenantId: base.tenantId,
    branding: { ...DEFAULT_TENANT_CONFIG.branding, ...(local.branding || {}) },
    commercial: { ...DEFAULT_TENANT_CONFIG.commercial, ...(local.commercial || {}) }
  }
}

export async function resolveTenantById(id) {
  const defaultId = getDefaultTenantId()

  if (isMongoConnected()) {
    try {
      const doc = await Tenant.findOne({ tenantId: id, status: { $in: ONLINE_STATUSES } }).lean()
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
