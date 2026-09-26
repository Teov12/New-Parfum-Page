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
    primaryColor: '#2E1911',
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

export const tenantMiddleware = async (req, res, next) => {
  try {
    // 1. Prioridad: Header 'x-tenant-id' (usado por el frontend o mobile app)
    const headerTenant = req.headers['x-tenant-id']
    if (headerTenant) {
      req.tenantId = String(headerTenant).toLowerCase().trim()
      req.tenant = await resolveTenantById(req.tenantId)
      return next()
    }

    // 2. Prioridad: Query param '?tenant=...' (útil para pruebas en desarrollo)
    const queryTenant = req.query.tenant
    if (queryTenant) {
      req.tenantId = String(queryTenant).toLowerCase().trim()
      req.tenant = await resolveTenantById(req.tenantId)
      return next()
    }

    // 3. Prioridad: Resolución automática por Dominio o Subdominio
    const host = req.headers.host || req.hostname || ''
    const cleanHost = host.split(':')[0].toLowerCase() // Remover puerto

    if (tenantCache.has(cleanHost)) {
      const cached = tenantCache.get(cleanHost)
      req.tenantId = cached.tenantId
      req.tenant = cached
      return next()
    }

    if (isMongoConnected()) {
      // Buscar por dominio exacto (ej: giccaparfumes.com.ar o royalparfum.com)
      let tenantDoc = await Tenant.findOne({ 
        $or: [
          { domain: cleanHost },
          { subdomain: cleanHost.split('.')[0] }
        ],
        status: 'active'
      }).lean()

      if (tenantDoc) {
        tenantCache.set(cleanHost, tenantDoc)
        req.tenantId = tenantDoc.tenantId
        req.tenant = tenantDoc
        return next()
      }
    }

    // 4. Fallback por defecto: Gicca Perfumes
    const defaultId = process.env.DEFAULT_TENANT || 'gicca'
    req.tenantId = defaultId
    req.tenant = await resolveTenantById(defaultId)
    next()
  } catch (err) {
    console.error('[Tenant Middleware] Error resolviendo tenant:', err.message)
    req.tenantId = 'gicca'
    req.tenant = DEFAULT_TENANT_CONFIG
    next()
  }
}

export async function resolveTenantById(id) {
  if (isMongoConnected()) {
    try {
      const doc = await Tenant.findOne({ tenantId: id, status: 'active' }).lean()
      if (doc) return doc
    } catch {
      // Silencioso, cae en fallback
    }
  }

  const local = getStoredLocalTenant()
  if (local && (local.tenantId === id || id === 'gicca')) {
    return {
      ...DEFAULT_TENANT_CONFIG,
      ...local,
      branding: { ...DEFAULT_TENANT_CONFIG.branding, ...(local.branding || {}) },
      commercial: { ...DEFAULT_TENANT_CONFIG.commercial, ...(local.commercial || {}) }
    }
  }

  return DEFAULT_TENANT_CONFIG
}

export const clearTenantCache = () => {
  tenantCache.clear()
}
