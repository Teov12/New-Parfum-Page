import express from 'express'
import fs from 'fs'
import path from 'path'
import dns from 'dns'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { Tenant } from '../models/Tenant.js'
import { DEFAULT_TENANT_CONFIG, clearTenantCache, getDefaultTenantId } from '../middleware/tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireAuth, requireSuperadmin } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TENANT_FILE = path.join(__dirname, '..', 'data', 'tenant.json')

const MIN_PASSWORD_LENGTH = 8
const TENANT_STATUSES = ['active', 'suspended', 'trial']
const TENANT_PLANS = ['basic', 'pro', 'enterprise']
// Subdominios que no puede tomar una tienda (los usa la plataforma)
const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'app', 'superadmin', 'mail', 'static', 'cdn']

function getStoredLocalTenant() {
  try {
    if (fs.existsSync(TENANT_FILE)) {
      return JSON.parse(fs.readFileSync(TENANT_FILE, 'utf-8'))
    }
  } catch (e) {
    console.warn('[Tenant] Error al leer tenant.json:', e.message)
  }
  return null
}

function persistLocalTenant(tenantData) {
  try {
    fs.writeFileSync(TENANT_FILE, JSON.stringify(tenantData, null, 2), 'utf-8')
  } catch (e) {
    console.warn('[Tenant] Error al guardar tenant.json:', e.message)
  }
}

const normalizeDomain = (value) => String(value || '')
  .replace(/^https?:\/\//i, '')
  .replace(/\/.*$/, '')
  .trim()
  .toLowerCase()

const normalizeEmail = (email) => String(email || '').toLowerCase().trim()
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// Nunca exponer hashes de contraseña ni tokens privados de Mercado Pago en listados
const toSafeTenant = (tenant) => {
  if (!tenant) return tenant
  const plain = typeof tenant.toObject === 'function' ? tenant.toObject() : tenant
  const { adminUser, ...rest } = plain
  const commercial = { ...(rest.commercial || {}) }
  delete commercial.mpAccessToken
  delete commercial.mercadoPagoAccessToken
  delete commercial.mpWebhookSecret
  return {
    ...rest,
    commercial,
    adminEmail: adminUser?.email || '',
    hasAdminUser: Boolean(adminUser?.passwordHash)
  }
}

/**
 * Valida que el dominio y subdominio no estén tomados por otra tienda
 * (si no, el ruteo por dominio podría mostrar una tienda ajena).
 * Devuelve un mensaje de error o null.
 */
const validateRouting = async ({ tenantId, domain, subdomain }) => {
  if (subdomain) {
    if (!/^[a-z0-9-]{2,40}$/.test(subdomain)) {
      return 'El subdominio solo puede tener letras minúsculas, números y guiones.'
    }
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return `El subdominio "${subdomain}" está reservado por la plataforma.`
    }
  }

  if (!isMongoConnected()) return null

  if (domain && await Tenant.exists({ tenantId: { $ne: tenantId }, domain })) {
    return `El dominio "${domain}" ya está asociado a otra tienda.`
  }
  if (subdomain && await Tenant.exists({ tenantId: { $ne: tenantId }, subdomain })) {
    return `El subdominio "${subdomain}" ya está en uso por otra tienda.`
  }
  return null
}

const router = express.Router()

// GET /api/tenant/current - Obtener configuración pública de la perfumería actual
router.get('/current', async (req, res) => {
  try {
    const tenant = req.tenant || DEFAULT_TENANT_CONFIG

    // Devolvemos solo información pública necesaria para el frontend (sin claves secretas de MP)
    res.json({
      tenantId: tenant.tenantId,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
      branding: tenant.branding || DEFAULT_TENANT_CONFIG.branding,
      commercial: {
        alias: tenant.commercial?.alias || '',
        cbu: tenant.commercial?.cbu || '',
        bankName: tenant.commercial?.bankName || '',
        accountHolder: tenant.commercial?.accountHolder || '',
        cardFeeRate: tenant.commercial?.cardFeeRate ?? 20,
        freeShippingThreshold: tenant.commercial?.freeShippingThreshold ?? 250000
      }
    })
  } catch (err) {
    console.error('Error fetching current tenant:', err)
    res.status(500).json({ error: 'Error al obtener datos de la perfumería' })
  }
})

// GET /api/tenant/settings - Obtener configuración completa con credenciales (Solo Admin Autenticado)
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId
    let tenant = req.tenant || DEFAULT_TENANT_CONFIG

    if (isMongoConnected()) {
      const doc = await Tenant.findOne({ tenantId }).lean()
      if (doc) tenant = doc
    }

    const commercial = {
      ...DEFAULT_TENANT_CONFIG.commercial,
      ...(tenant.commercial || {}),
      mpAccessToken: tenant.commercial?.mpAccessToken || tenant.commercial?.mercadoPagoAccessToken || '',
      mpPublicKey: tenant.commercial?.mpPublicKey || tenant.commercial?.mercadoPagoPublicKey || ''
    }

    res.json({
      success: true,
      tenant: {
        tenantId,
        name: tenant.name || DEFAULT_TENANT_CONFIG.name,
        domain: tenant.domain || '',
        subdomain: tenant.subdomain || '',
        branding: tenant.branding || DEFAULT_TENANT_CONFIG.branding,
        commercial,
        adminEmail: tenant.adminUser?.email || ''
      }
    })
  } catch (err) {
    console.error('Error fetching admin tenant settings:', err)
    res.status(500).json({ error: 'Error al obtener configuración de la tienda' })
  }
})

// POST /api/tenant/verify-domain - Verificar propagación DNS de un dominio personalizado
router.post('/verify-domain', requireAuth, async (req, res) => {
  try {
    const { domain } = req.body
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Debes indicar un dominio a verificar' })
    }

    const cleanDomain = normalizeDomain(domain)

    // Resolver registros DNS A
    let aRecords = []
    try {
      aRecords = await dns.promises.resolve(cleanDomain, 'A')
    } catch (e) {
      // Sin registros A
    }

    // Resolver registros DNS CNAME
    let cnameRecords = []
    try {
      cnameRecords = await dns.promises.resolveCname(cleanDomain)
    } catch (e) {
      // Sin registros CNAME
    }

    const hasRecords = aRecords.length > 0 || cnameRecords.length > 0

    res.json({
      success: true,
      domain: cleanDomain,
      hasRecords,
      aRecords,
      cnameRecords,
      message: hasRecords
        ? `Se detectaron registros DNS activos para ${cleanDomain} (${aRecords.join(', ') || cnameRecords.join(', ')})`
        : `Aún no se detectan registros DNS para ${cleanDomain}. Si acabás de configurarlo, la propagación puede tardar entre 15 minutos y 24 horas.`
    })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al consultar DNS' })
  }
})

// PUT /api/tenant/settings - Actualizar datos comerciales y branding de la tienda (Admin)
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId
    const { name, branding, commercial } = req.body
    const domain = req.body.domain !== undefined ? normalizeDomain(req.body.domain) : undefined
    const subdomain = req.body.subdomain !== undefined ? String(req.body.subdomain).trim().toLowerCase() : undefined

    // Normalizar credenciales de Mercado Pago para compatibilidad total
    if (commercial) {
      const token = commercial.mpAccessToken || commercial.mercadoPagoAccessToken || ''
      const pubKey = commercial.mpPublicKey || commercial.mercadoPagoPublicKey || ''
      commercial.mpAccessToken = token
      commercial.mpPublicKey = pubKey
      commercial.mercadoPagoAccessToken = token
      commercial.mercadoPagoPublicKey = pubKey
    }

    const routingError = await validateRouting({ tenantId, domain, subdomain })
    if (routingError) {
      return res.status(409).json({ error: routingError })
    }

    // Modo local (sin MongoDB): una sola tienda persistida en server/data/tenant.json
    if (!isMongoConnected()) {
      const existing = getStoredLocalTenant() || {}
      const updatedLocal = {
        tenantId,
        name: name || existing.name || DEFAULT_TENANT_CONFIG.name,
        domain: domain !== undefined ? domain : (existing.domain || ''),
        subdomain: subdomain !== undefined ? subdomain : (existing.subdomain || ''),
        branding: { ...(existing.branding || DEFAULT_TENANT_CONFIG.branding), ...branding },
        commercial: { ...(existing.commercial || DEFAULT_TENANT_CONFIG.commercial), ...commercial }
      }
      persistLocalTenant(updatedLocal)
      return res.json({
        success: true,
        message: 'Ajustes guardados con éxito',
        tenant: toSafeTenant(updatedLocal)
      })
    }

    let tenantDoc = await Tenant.findOne({ tenantId })

    if (!tenantDoc) {
      // Primera vez que la tienda principal se guarda en MongoDB: partir de su configuración actual
      const base = req.tenant || DEFAULT_TENANT_CONFIG
      tenantDoc = new Tenant({
        tenantId,
        name: name || base.name || DEFAULT_TENANT_CONFIG.name,
        slug: tenantId,
        domain: domain !== undefined ? domain : (base.domain || ''),
        subdomain: subdomain !== undefined ? subdomain : (base.subdomain || ''),
        branding: { ...DEFAULT_TENANT_CONFIG.branding, ...(base.branding || {}), ...branding },
        commercial: { ...DEFAULT_TENANT_CONFIG.commercial, ...(base.commercial || {}), ...commercial }
      })
    } else {
      if (name) tenantDoc.name = name
      if (domain !== undefined) tenantDoc.domain = domain
      if (subdomain !== undefined) tenantDoc.subdomain = subdomain
      if (branding) tenantDoc.branding = { ...tenantDoc.branding, ...branding }
      if (commercial) tenantDoc.commercial = { ...tenantDoc.commercial, ...commercial }
    }

    await tenantDoc.save()
    clearTenantCache()

    res.json({ success: true, message: 'Configuración de la tienda actualizada', tenant: toSafeTenant(tenantDoc) })
  } catch (err) {
    console.error('Error updating tenant settings:', err)
    res.status(500).json({ error: 'Error al actualizar configuración de la tienda' })
  }
})

// GET /api/tenants/all - Listar todas las perfumerías (Superadmin)
router.get('/all', requireSuperadmin, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json([toSafeTenant(req.tenant || DEFAULT_TENANT_CONFIG)])
    }

    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean()
    res.json(tenants.length > 0 ? tenants.map(toSafeTenant) : [toSafeTenant(req.tenant || DEFAULT_TENANT_CONFIG)])
  } catch (err) {
    res.status(500).json({ error: 'Error al listar perfumerías' })
  }
})

// POST /api/tenants/create - Dar de alta una nueva perfumería en la plataforma (Superadmin)
router.post('/create', requireSuperadmin, async (req, res) => {
  try {
    const { tenantId, name, plan, whatsappNumber, alias, cbu, adminPassword } = req.body
    const adminEmail = normalizeEmail(req.body.adminEmail)

    if (!tenantId || !name) {
      return res.status(400).json({ error: 'Identificador (tenantId) y Nombre de la tienda son obligatorios.' })
    }

    const cleanId = String(tenantId).toLowerCase().trim()
    if (!/^[a-z0-9-]{3,40}$/.test(cleanId)) {
      return res.status(400).json({ error: 'El identificador solo puede tener letras minúsculas, números y guiones (mínimo 3 caracteres).' })
    }
    if (!isValidEmail(adminEmail)) {
      return res.status(400).json({ error: 'Ingresá el email del dueño de la tienda (será su usuario de acceso).' })
    }
    if (!adminPassword || String(adminPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `La contraseña inicial debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` })
    }
    if (plan && !TENANT_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido.' })
    }

    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Crear perfumerías requiere MongoDB configurado (MONGODB_URI).' })
    }

    const exists = await Tenant.findOne({ tenantId: cleanId })
    if (exists) {
      return res.status(409).json({ error: `La perfumería con identificador "${cleanId}" ya existe.` })
    }

    const domain = normalizeDomain(req.body.domain)
    const subdomain = req.body.subdomain ? String(req.body.subdomain).toLowerCase().trim() : cleanId
    const routingError = await validateRouting({ tenantId: cleanId, domain, subdomain })
    if (routingError) {
      return res.status(409).json({ error: routingError })
    }

    const newTenant = await Tenant.create({
      tenantId: cleanId,
      name,
      slug: cleanId,
      domain,
      subdomain,
      plan: plan || 'pro',
      status: 'active',
      // Datos de contacto y cobro propios: no heredar los de la tienda principal
      branding: {
        ...DEFAULT_TENANT_CONFIG.branding,
        tagline: '',
        instagramUrl: '',
        whatsappNumber: whatsappNumber || ''
      },
      commercial: {
        ...DEFAULT_TENANT_CONFIG.commercial,
        alias: alias || '',
        cbu: cbu || '',
        bankName: '',
        accountHolder: name,
        cuit: '',
        mercadoPagoAccessToken: '',
        mercadoPagoPublicKey: '',
        mpAccessToken: '',
        mpPublicKey: ''
      },
      adminUser: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(String(adminPassword), 12)
      }
    })

    clearTenantCache()

    res.status(201).json({
      success: true,
      message: `¡Perfumería "${name}" creada con éxito!`,
      tenant: toSafeTenant(newTenant)
    })
  } catch (err) {
    console.error('Error creating new tenant:', err)
    res.status(500).json({ error: err.message || 'Error al crear la nueva perfumería' })
  }
})

// PUT /api/tenants/:id/status - Cambiar estado de suscripción (Superadmin)
router.put('/:id/status', requireSuperadmin, async (req, res) => {
  try {
    const { status, plan } = req.body
    const targetId = req.params.id.toLowerCase().trim()

    if (status && !TENANT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido.' })
    }
    if (plan && !TENANT_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido.' })
    }

    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Gestionar perfumerías requiere MongoDB configurado (MONGODB_URI).' })
    }

    const tenant = await Tenant.findOne({ tenantId: targetId })
    if (!tenant) {
      return res.status(404).json({ error: 'Perfumería no encontrada' })
    }

    if (status) tenant.status = status
    if (plan) tenant.plan = plan
    await tenant.save()
    clearTenantCache()

    res.json({ success: true, message: `Perfumería ${tenant.name} actualizada (${status || tenant.status})`, tenant: toSafeTenant(tenant) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar estado' })
  }
})

// PUT /api/tenants/:id/credentials - Restablecer el acceso del dueño de una tienda (Superadmin)
router.put('/:id/credentials', requireSuperadmin, async (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase().trim()
    const email = normalizeEmail(req.body.email)
    const { password } = req.body

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Ingresá un email válido.' })
    }
    if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` })
    }
    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Gestionar perfumerías requiere MongoDB configurado (MONGODB_URI).' })
    }

    const updated = await Tenant.findOneAndUpdate(
      { tenantId: targetId },
      { $set: { 'adminUser.email': email, 'adminUser.passwordHash': await bcrypt.hash(String(password), 12) } },
      { returnDocument: 'after' }
    )
    if (!updated) {
      return res.status(404).json({ error: 'Perfumería no encontrada' })
    }
    clearTenantCache()

    res.json({ success: true, message: `Acceso de ${updated.name} actualizado para ${email}` })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar credenciales' })
  }
})

// DELETE /api/tenants/:id - Dar de baja perfumería (Superadmin)
router.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase().trim()
    if (targetId === getDefaultTenantId()) {
      return res.status(400).json({ error: 'No es posible eliminar la tienda principal de la plataforma' })
    }

    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Gestionar perfumerías requiere MongoDB configurado (MONGODB_URI).' })
    }

    await Tenant.deleteOne({ tenantId: targetId })
    clearTenantCache()
    res.json({ success: true, message: 'Perfumería dada de baja con éxito' })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al eliminar perfumería' })
  }
})

export default router
