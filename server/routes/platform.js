import express from 'express'
import rateLimit from 'express-rate-limit'
import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { signPurposeToken } from '../middleware/auth.js'
import { PLATFORM, PLAN_IDS, getPublicPlans, getStoreEntryUrl, isDemoStore } from '../config/platform.js'
import { isBillingConfigured } from '../services/billing.js'
import { isOAuthConfigured } from '../services/mercadopagoOAuth.js'
import {
  TenantError,
  createTenant,
  isSubdomainAvailable,
  slugifyStoreName,
  normalizeDomain
} from '../services/tenantService.js'

const router = express.Router()

// Alta de tiendas: pocas por IP para evitar registros masivos
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta conexión. Intentá nuevamente más tarde.' }
})

// Tiendas de ejemplo visibles en la landing del entorno demo
const listDemoStores = async (req) => {
  if (!PLATFORM.demoMode || !isMongoConnected()) return []
  const stores = await Tenant.find({ isDemo: true }, { tenantId: 1, name: 1, branding: 1, isDemo: 1, domain: 1, subdomain: 1 }).lean()
  return stores.map(t => ({
    tenantId: t.tenantId,
    name: t.name,
    tagline: t.branding?.tagline || '',
    storeIcon: t.branding?.storeIcon || 'spa',
    paletteId: t.branding?.paletteId || 'amber',
    primaryColor: t.branding?.primaryColor || '#2E1911',
    storeUrl: getStoreEntryUrl(t, req, '/')
  }))
}

const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados accesos a la demo. Esperá unos minutos.' }
})

/**
 * POST /api/platform/demo-access - Entrar al panel de una tienda demo sin contraseña (solo DEMO_MODE).
 * Devuelve un link de un solo uso; en la tienda demo las acciones sensibles están bloqueadas.
 */
router.post('/demo-access', demoLimiter, async (req, res) => {
  if (!PLATFORM.demoMode || !isMongoConnected()) return res.status(404).json({ error: 'No disponible' })
  const tenant = await Tenant.findOne({ tenantId: String(req.body?.tenantId || '').toLowerCase(), isDemo: true }).lean()
  if (!tenant || !isDemoStore(tenant)) return res.status(404).json({ error: 'Tienda demo no encontrada' })

  const handoff = signPurposeToken({ tenantId: tenant.tenantId, email: tenant.adminUser?.email || '' }, 'handoff', '10m')
  const loginUrl = getStoreEntryUrl(tenant, req, '/admin/login')
  // Si la tienda no tiene dirección propia, el link usa la misma dirección de la landing
  const absolute = /^https?:\/\//.test(loginUrl) ? loginUrl : `${req.protocol}://${req.get('host')}${loginUrl}`
  res.json({ adminUrl: `${absolute}#acceso=${handoff}` })
})

// GET /api/platform/info - Datos públicos de la plataforma para la landing
router.get('/info', async (req, res) => {
  res.json({
    demoMode: PLATFORM.demoMode,
    demoStores: await listDemoStores(req).catch(() => []),
    name: PLATFORM.name,
    domain: PLATFORM.domain,
    trialDays: PLATFORM.trialDays,
    supportEmail: PLATFORM.supportEmail,
    plans: getPublicPlans(),
    signupEnabled: isMongoConnected(),
    billingEnabled: isBillingConfigured(),
    mpOAuthEnabled: isOAuthConfigured()
  })
})

// GET /api/platform/subdomain-available?name=mi-perfumeria
router.get('/subdomain-available', async (req, res) => {
  const subdomain = slugifyStoreName(req.query.name)
  res.json({ subdomain, available: subdomain.length >= 3 && await isSubdomainAvailable(subdomain) })
})

// POST /api/platform/signup - Registro autoservicio de una perfumería (prueba gratis)
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({ error: 'El registro de tiendas no está disponible en este momento.' })
    }

    const { storeName, email, password, whatsappNumber, plan, acceptTerms } = req.body
    if (!acceptTerms) {
      return res.status(400).json({ error: 'Tenés que aceptar los términos del servicio para crear tu tienda.' })
    }

    const subdomain = slugifyStoreName(req.body.subdomain || storeName)
    if (!(await isSubdomainAvailable(subdomain))) {
      return res.status(409).json({ error: `La dirección "${subdomain}" no está disponible. Probá con otra.` })
    }

    const trialEndsAt = new Date(Date.now() + PLATFORM.trialDays * 86400000)
    const tenant = await createTenant({
      tenantId: subdomain,
      subdomain,
      name: storeName,
      plan: PLAN_IDS.includes(plan) ? plan : 'pro',
      status: 'trial',
      billing: { status: 'trialing', trialEndsAt },
      adminEmail: email,
      adminPassword: password,
      whatsappNumber,
      seedStarter: req.body.seedStarter !== false
    })

    // Token de un solo uso para entrar al panel de la tienda nueva sin volver a loguearse
    const handoff = signPurposeToken({ tenantId: tenant.tenantId, email: tenant.adminUser.email }, 'handoff', '10m')
    // Sin subdominios de plataforma (ej. entorno demo) se entra con ?tenant=<id> en la misma dirección
    const storeUrl = getStoreEntryUrl(tenant, req, '/')
    const loginUrl = getStoreEntryUrl(tenant, req, '/admin/login')
    const origin = `${req.protocol}://${req.get('host')}`
    const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${origin}${url}`)

    res.status(201).json({
      success: true,
      tenantId: tenant.tenantId,
      storeUrl: absolute(storeUrl),
      adminUrl: `${absolute(loginUrl)}#acceso=${handoff}`,
      trialEndsAt
    })
  } catch (err) {
    if (err instanceof TenantError) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error('Error en registro de tienda:', err)
    res.status(500).json({ error: 'No pudimos crear tu tienda. Intentá nuevamente.' })
  }
})

/**
 * GET /api/platform/tls-check?domain=... - Para el certificado SSL automático del proxy (Caddy "on_demand_tls ask").
 * Responde 200 solo para dominios de tiendas existentes, así nadie puede emitir certificados de dominios ajenos.
 */
router.get('/tls-check', async (req, res) => {
  const domain = normalizeDomain(req.query.domain)
  if (!domain || !isMongoConnected()) return res.status(404).end()

  if (PLATFORM.domain && (domain === PLATFORM.domain || domain === `www.${PLATFORM.domain}`)) {
    return res.status(200).end()
  }
  if (PLATFORM.domain && domain.endsWith(`.${PLATFORM.domain}`)) {
    const subdomain = domain.slice(0, -(PLATFORM.domain.length + 1))
    return (await Tenant.exists({ subdomain })) ? res.status(200).end() : res.status(404).end()
  }
  const exists = await Tenant.exists({ domain: { $in: [domain, domain.replace(/^www\./, '')] } })
  res.status(exists ? 200 : 404).end()
})

export default router
