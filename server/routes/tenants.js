import express from 'express'
import fs from 'fs'
import path from 'path'
import dns from 'dns'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { Tenant } from '../models/Tenant.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { SiteContent } from '../models/SiteContent.js'
import { Customer } from '../models/Customer.js'
import { WithdrawalRequest } from '../models/WithdrawalRequest.js'
import { AbandonedCart } from '../models/AbandonedCart.js'
import { DEFAULT_TENANT_CONFIG, clearTenantCache, getLocalDefaultTenant } from '../middleware/tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireOwner, requireSuperadmin } from '../middleware/auth.js'
import { stripDemoSensitiveSettings } from '../middleware/demo.js'
import { PLATFORM, PLAN_IDS, getDefaultTenantId, getTenantLimits, getPublicPlans } from '../config/platform.js'
import {
  TenantError,
  MIN_PASSWORD_LENGTH,
  normalizeDomain,
  normalizeEmail,
  isValidEmail,
  validateRouting,
  toSafeTenant,
  toOwnerSettings,
  toPublicTenant,
  resolveDomainChange,
  domainVerificationRecord,
  mergeOwnerSettings,
  createTenant,
  getPlanSummary
} from '../services/tenantService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TENANT_FILE = path.join(__dirname, '..', 'data', 'tenant.json')

const TENANT_STATUSES = ['active', 'suspended', 'trial']
const BILLING_STATUSES = ['trialing', 'active', 'past_due', 'cancelled', 'exempt']

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

const sendError = (res, err, fallback) => {
  if (err instanceof TenantError || (err.status && err.status < 500)) {
    return res.status(err.status || 400).json({ error: err.message })
  }
  console.error(fallback, err)
  return res.status(500).json({ error: fallback })
}

const router = express.Router()

// GET /api/tenant/current - Configuración pública de la perfumería actual
router.get('/current', (req, res) => {
  res.json(toPublicTenant(req.tenant || DEFAULT_TENANT_CONFIG, req))
})

// GET /api/tenant/settings - Configuración completa para el dueño (credenciales enmascaradas)
router.get('/settings', requireOwner, async (req, res) => {
  try {
    let tenant = req.tenant || DEFAULT_TENANT_CONFIG
    if (isMongoConnected()) {
      const doc = await Tenant.findOne({ tenantId: req.tenantId }).lean()
      if (doc) tenant = doc
    }

    res.json({
      success: true,
      tenant: toOwnerSettings({ ...tenant, tenantId: req.tenantId }),
      platform: { name: PLATFORM.name, domain: PLATFORM.domain, dnsTarget: PLATFORM.dnsTarget }
    })
  } catch (err) {
    console.error('Error fetching admin tenant settings:', err)
    res.status(500).json({ error: 'Error al obtener configuración de la tienda' })
  }
})

// POST /api/tenant/verify-domain - Verificar propagación DNS de un dominio personalizado
router.post('/verify-domain', requireOwner, async (req, res) => {
  try {
    const { domain } = req.body
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Debes indicar un dominio a verificar' })
    }

    const cleanDomain = normalizeDomain(domain)

    let aRecords = []
    try {
      aRecords = await dns.promises.resolve(cleanDomain, 'A')
    } catch (e) {
      // Sin registros A
    }

    let cnameRecords = []
    try {
      cnameRecords = await dns.promises.resolveCname(cleanDomain)
    } catch (e) {
      // Sin registros CNAME
    }

    // Dominio pendiente: se activa cuando el TXT de verificación coincide
    let verified = false
    let verificationMessage = ''
    if (isMongoConnected()) {
      const doc = await Tenant.findOne({ tenantId: req.tenantId })
      if (doc?.pendingDomain && doc.pendingDomain === cleanDomain) {
        let txt = []
        try {
          txt = (await dns.promises.resolveTxt(domainVerificationRecord(cleanDomain))).map(parts => parts.join(''))
        } catch {
          // Sin registro TXT todavía
        }
        if (txt.includes(doc.domainVerificationToken)) {
          await validateRouting({ tenantId: req.tenantId, domain: cleanDomain })
          doc.domain = cleanDomain
          doc.pendingDomain = ''
          doc.domainVerificationToken = ''
          await doc.save()
          clearTenantCache()
          verified = true
          verificationMessage = `¡Listo! ${cleanDomain} quedó verificado y asociado a tu tienda.`
        } else {
          verificationMessage = `Todavía no encontramos el registro TXT ${domainVerificationRecord(cleanDomain)} con el valor indicado. La propagación puede tardar unas horas.`
        }
      }
    }

    const hasRecords = aRecords.length > 0 || cnameRecords.length > 0
    const target = PLATFORM.dnsTarget
    const pointsToPlatform = !target || aRecords.includes(target) || cnameRecords.some(c => c.replace(/\.$/, '') === target)

    res.json({
      success: true,
      domain: cleanDomain,
      hasRecords,
      verified,
      verificationMessage,
      pointsToPlatform,
      dnsTarget: target,
      aRecords,
      cnameRecords,
      message: !hasRecords
        ? `Aún no se detectan registros DNS para ${cleanDomain}. Si acabás de configurarlo, la propagación puede tardar entre 15 minutos y 24 horas.`
        : (pointsToPlatform
          ? `Se detectaron registros DNS activos para ${cleanDomain} (${aRecords.join(', ') || cnameRecords.join(', ')})`
          : `${cleanDomain} tiene registros DNS pero no apunta a ${target}. Revisá la configuración en tu proveedor de dominio.`)
    })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al consultar DNS' })
  }
})

// PUT /api/tenant/settings - Actualizar configuración de la tienda (solo el dueño)
router.put('/settings', requireOwner, stripDemoSensitiveSettings, async (req, res) => {
  try {
    const tenantId = req.tenantId

    // Modo local (sin MongoDB): una sola tienda persistida en server/data/tenant.json
    if (!isMongoConnected()) {
      const existing = getStoredLocalTenant() || { ...DEFAULT_TENANT_CONFIG }
      const { requestedDomain, ...changes } = mergeOwnerSettings(existing, req.body)
      await validateRouting({ tenantId, domain: requestedDomain, subdomain: changes.subdomain })
      Object.assign(changes, resolveDomainChange({ current: existing, requestedDomain, trusted: true }))
      const updatedLocal = { ...existing, ...changes, tenantId }
      persistLocalTenant(updatedLocal)
      return res.json({
        success: true,
        message: 'Ajustes guardados con éxito',
        tenant: toOwnerSettings(updatedLocal)
      })
    }

    let tenantDoc = await Tenant.findOne({ tenantId })
    // Primera vez que la tienda principal se guarda en MongoDB: partir de su configuración actual
    const current = tenantDoc ? tenantDoc.toObject() : { ...(req.tenant || DEFAULT_TENANT_CONFIG), tenantId }
    const { requestedDomain, ...changes } = mergeOwnerSettings(current, req.body)

    await validateRouting({ tenantId, domain: requestedDomain, subdomain: changes.subdomain })

    if (requestedDomain && requestedDomain !== current.domain && !getTenantLimits(current).customDomain) {
      return res.status(403).json({ error: 'El dominio propio está disponible desde el plan Profesional. Cambiá de plan en Admin > Mi Plan.' })
    }

    // La tienda principal (dueño de la plataforma) y el superadmin no necesitan verificar el dominio
    const trustedDomain = tenantId === getDefaultTenantId() || req.user?.role === 'superadmin'
    Object.assign(changes, resolveDomainChange({ current, requestedDomain, trusted: trustedDomain }))

    if (changes.invoicing?.enabled && !current.invoicing?.enabled && !getTenantLimits(current).invoicing) {
      return res.status(403).json({ error: 'La facturación electrónica está disponible desde el plan Profesional.' })
    }

    if (!tenantDoc) {
      tenantDoc = new Tenant({
        ...current,
        slug: current.slug || tenantId,
        billing: { status: 'exempt' }
      })
    }
    tenantDoc.set(changes)
    await tenantDoc.save()
    clearTenantCache()

    res.json({ success: true, message: 'Configuración de la tienda actualizada', tenant: toOwnerSettings(tenantDoc.toObject()) })
  } catch (err) {
    sendError(res, err, 'Error al actualizar configuración de la tienda')
  }
})

// GET /api/tenants/all - Listar todas las perfumerías (Superadmin)
router.get('/all', requireSuperadmin, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json({ tenants: [toSafeTenant(req.tenant || DEFAULT_TENANT_CONFIG)], plans: getPublicPlans() })
    }

    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean()
    // La tienda principal puede seguir guardada en tenant.json: se lista igual
    if (!tenants.some(t => t.tenantId === getDefaultTenantId())) {
      tenants.push({ ...getLocalDefaultTenant(), billing: { status: 'exempt' } })
    }
    const productCounts = await Product.aggregate([{ $group: { _id: '$tenantId', count: { $sum: 1 } } }])
    const countByTenant = Object.fromEntries(productCounts.map(p => [p._id, p.count]))

    res.json({
      tenants: tenants.map(t => ({
        ...toSafeTenant(t, req),
        billingSummary: getPlanSummary(t),
        productCount: countByTenant[t.tenantId] || 0
      })),
      plans: getPublicPlans()
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al listar perfumerías' })
  }
})

// POST /api/tenants/create - Dar de alta una nueva perfumería en la plataforma (Superadmin)
router.post('/create', requireSuperadmin, async (req, res) => {
  try {
    const { tenantId, name, plan, whatsappNumber, alias, cbu, adminEmail, adminPassword, domain, subdomain, seedStarter, billingExempt } = req.body
    const trialEndsAt = new Date(Date.now() + PLATFORM.trialDays * 86400000)

    const tenant = await createTenant({
      tenantId,
      name,
      plan: plan || 'pro',
      domain,
      subdomain,
      whatsappNumber,
      alias,
      cbu,
      adminEmail,
      adminPassword,
      seedStarter: Boolean(seedStarter),
      status: billingExempt ? 'active' : 'trial',
      billing: billingExempt ? { status: 'exempt' } : { status: 'trialing', trialEndsAt }
    })

    res.status(201).json({
      success: true,
      message: `¡Perfumería "${tenant.name}" creada con éxito!`,
      tenant: toSafeTenant(tenant)
    })
  } catch (err) {
    sendError(res, err, 'Error al crear la nueva perfumería')
  }
})

// PUT /api/tenants/:id/status - Pausar o reactivar una tienda (Superadmin)
router.put('/:id/status', requireSuperadmin, async (req, res) => {
  try {
    const { status, plan } = req.body
    const targetId = req.params.id.toLowerCase().trim()

    if (status && !TENANT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido.' })
    }
    if (plan && !PLAN_IDS.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido.' })
    }

    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Gestionar perfumerías requiere MongoDB configurado (MONGODB_URI).' })
    }

    const tenant = await Tenant.findOne({ tenantId: targetId })
    if (!tenant) {
      return res.status(404).json({ error: 'Perfumería no encontrada' })
    }

    if (status) {
      tenant.status = status
      tenant.suspendedReason = status === 'suspended' ? 'manual' : ''
    }
    if (plan) tenant.plan = plan
    await tenant.save()
    clearTenantCache()

    res.json({ success: true, message: `Perfumería ${tenant.name} actualizada (${status || tenant.status})`, tenant: toSafeTenant(tenant) })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar estado' })
  }
})

// PUT /api/tenants/:id/billing - Extender la prueba, eximir del cobro o cambiar el plan (Superadmin)
router.put('/:id/billing', requireSuperadmin, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Gestionar perfumerías requiere MongoDB configurado (MONGODB_URI).' })
    }
    const tenant = await Tenant.findOne({ tenantId: req.params.id.toLowerCase().trim() })
    if (!tenant) {
      return res.status(404).json({ error: 'Perfumería no encontrada' })
    }

    const { billingStatus, extendTrialDays, plan } = req.body
    if (plan) {
      if (!PLAN_IDS.includes(plan)) return res.status(400).json({ error: 'Plan inválido.' })
      tenant.plan = plan
    }
    if (billingStatus) {
      if (!BILLING_STATUSES.includes(billingStatus)) return res.status(400).json({ error: 'Estado de cobro inválido.' })
      tenant.billing.status = billingStatus
    }
    if (Number(extendTrialDays) > 0) {
      const base = Math.max(Date.now(), new Date(tenant.billing.trialEndsAt || 0).getTime())
      tenant.billing.status = 'trialing'
      tenant.billing.trialEndsAt = new Date(base + Number(extendTrialDays) * 86400000)
    }
    // Al regularizar el cobro, la tienda vuelve a estar online
    if (['exempt', 'active', 'trialing'].includes(tenant.billing.status) && tenant.status === 'suspended' && tenant.suspendedReason !== 'manual') {
      tenant.status = 'active'
      tenant.suspendedReason = ''
    }
    await tenant.save()
    clearTenantCache()

    res.json({ success: true, message: `Suscripción de ${tenant.name} actualizada`, tenant: { ...toSafeTenant(tenant), billingSummary: getPlanSummary(tenant.toObject()) } })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar la suscripción' })
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

// DELETE /api/tenants/:id - Dar de baja perfumería y sus datos (Superadmin)
router.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase().trim()
    if (targetId === getDefaultTenantId()) {
      return res.status(400).json({ error: 'No es posible eliminar la tienda principal de la plataforma' })
    }

    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Gestionar perfumerías requiere MongoDB configurado (MONGODB_URI).' })
    }

    // Se borran también catálogo, pedidos, clientes y contenido: un alta futura con el mismo id no hereda datos ajenos
    await Promise.all([
      Tenant.deleteOne({ tenantId: targetId }),
      Product.deleteMany({ tenantId: targetId }),
      Order.deleteMany({ tenantId: targetId }),
      SiteContent.deleteMany({ tenantId: targetId }),
      Customer.deleteMany({ tenantId: targetId }),
      WithdrawalRequest.deleteMany({ tenantId: targetId }),
      AbandonedCart.deleteMany({ tenantId: targetId })
    ])
    clearTenantCache()
    res.json({ success: true, message: 'Perfumería y sus datos dados de baja con éxito' })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al eliminar perfumería' })
  }
})

export default router
