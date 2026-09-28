import express from 'express'
import fs from 'fs'
import path from 'path'
import dns from 'dns'
import { fileURLToPath } from 'url'
import { Tenant } from '../models/Tenant.js'
import { DEFAULT_TENANT_CONFIG, clearTenantCache } from '../middleware/tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireAuth } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TENANT_FILE = path.join(__dirname, '..', 'data', 'tenant.json')

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

const router = express.Router()

// GET /api/tenant/current - Obtener configuración pública de la perfumería actual
router.get('/current', async (req, res) => {
  try {
    const local = getStoredLocalTenant()
    const baseTenant = req.tenant || DEFAULT_TENANT_CONFIG
    const tenant = local
      ? {
          ...baseTenant,
          ...local,
          branding: { ...baseTenant.branding, ...local.branding },
          commercial: { ...baseTenant.commercial, ...local.commercial }
        }
      : baseTenant
    
    // Devolvemos solo información pública necesaria para el frontend (sin claves secretas de MP)
    res.json({
      tenantId: tenant.tenantId,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
      branding: tenant.branding || DEFAULT_TENANT_CONFIG.branding,
      commercial: {
        alias: tenant.commercial?.alias || DEFAULT_TENANT_CONFIG.commercial.alias,
        cbu: tenant.commercial?.cbu || DEFAULT_TENANT_CONFIG.commercial.cbu,
        bankName: tenant.commercial?.bankName || DEFAULT_TENANT_CONFIG.commercial.bankName,
        accountHolder: tenant.commercial?.accountHolder || DEFAULT_TENANT_CONFIG.commercial.accountHolder,
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
    const tenantId = req.tenantId || 'gicca'
    const local = getStoredLocalTenant()
    let tenant = local || req.tenant || DEFAULT_TENANT_CONFIG

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
        commercial
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

    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim().toLowerCase()
    
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
    const tenantId = req.tenantId || 'gicca'
    const { name, domain, subdomain, branding, commercial } = req.body

    // Normalizar credenciales de Mercado Pago para compatibilidad total
    if (commercial) {
      const token = commercial.mpAccessToken || commercial.mercadoPagoAccessToken || ''
      const pubKey = commercial.mpPublicKey || commercial.mercadoPagoPublicKey || ''
      commercial.mpAccessToken = token
      commercial.mpPublicKey = pubKey
      commercial.mercadoPagoAccessToken = token
      commercial.mercadoPagoPublicKey = pubKey
    }

    // Persistir siempre localmente para garantizar disponibilidad inmediata
    const existing = getStoredLocalTenant() || {}
    const updatedLocal = {
      tenantId,
      name: name || existing.name || DEFAULT_TENANT_CONFIG.name,
      domain: domain !== undefined ? domain.trim().toLowerCase() : (existing.domain || ''),
      subdomain: subdomain !== undefined ? subdomain.trim().toLowerCase() : (existing.subdomain || ''),
      branding: { ...(existing.branding || DEFAULT_TENANT_CONFIG.branding), ...branding },
      commercial: { ...(existing.commercial || DEFAULT_TENANT_CONFIG.commercial), ...commercial }
    }
    persistLocalTenant(updatedLocal)
    DEFAULT_TENANT_CONFIG.name = updatedLocal.name
    DEFAULT_TENANT_CONFIG.domain = updatedLocal.domain
    DEFAULT_TENANT_CONFIG.subdomain = updatedLocal.subdomain
    DEFAULT_TENANT_CONFIG.branding = { ...DEFAULT_TENANT_CONFIG.branding, ...updatedLocal.branding }
    DEFAULT_TENANT_CONFIG.commercial = { ...DEFAULT_TENANT_CONFIG.commercial, ...updatedLocal.commercial }

    if (!isMongoConnected()) {
      return res.json({ 
        success: true, 
        message: 'Ajustes guardados con éxito',
        tenant: updatedLocal
      })
    }

    let tenantDoc = await Tenant.findOne({ tenantId })

    if (!tenantDoc) {
      tenantDoc = new Tenant({
        tenantId,
        name: name || DEFAULT_TENANT_CONFIG.name,
        slug: tenantId,
        domain: updatedLocal.domain,
        subdomain: updatedLocal.subdomain,
        branding: { ...DEFAULT_TENANT_CONFIG.branding, ...branding },
        commercial: { ...DEFAULT_TENANT_CONFIG.commercial, ...commercial }
      })
    } else {
      if (name) tenantDoc.name = name
      if (domain !== undefined) tenantDoc.domain = domain.trim().toLowerCase()
      if (subdomain !== undefined) tenantDoc.subdomain = subdomain.trim().toLowerCase()
      if (branding) tenantDoc.branding = { ...tenantDoc.branding, ...branding }
      if (commercial) tenantDoc.commercial = { ...tenantDoc.commercial, ...commercial }
    }

    await tenantDoc.save()
    clearTenantCache()

    res.json({ success: true, message: 'Configuración de la tienda actualizada', tenant: tenantDoc })
  } catch (err) {
    console.error('Error updating tenant settings:', err)
    res.status(500).json({ error: 'Error al actualizar configuración de la tienda' })
  }
})

// GET /api/tenants - Listar todas las perfumerías activas (Superadmin)
router.get('/all', requireAuth, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.json([DEFAULT_TENANT_CONFIG])
    }

    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean()
    res.json(tenants.length > 0 ? tenants : [DEFAULT_TENANT_CONFIG])
  } catch (err) {
    res.status(500).json({ error: 'Error al listar perfumerías' })
  }
})

// POST /api/tenants - Dar de alta una nueva perfumería en la plataforma (Superadmin)
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { tenantId, name, domain, subdomain, plan, whatsappNumber, alias, cbu } = req.body

    if (!tenantId || !name) {
      return res.status(400).json({ error: 'Identificador (tenantId) y Nombre de la tienda son obligatorios.' })
    }

    const cleanId = String(tenantId).toLowerCase().trim()

    if (!isMongoConnected()) {
      return res.json({ 
        success: true, 
        message: 'Perfumería creada en memoria', 
        tenantId: cleanId 
      })
    }

    const exists = await Tenant.findOne({ tenantId: cleanId })
    if (exists) {
      return res.status(409).json({ error: `La perfumería con identificador "${cleanId}" ya existe.` })
    }

    const newTenant = await Tenant.create({
      tenantId: cleanId,
      name,
      slug: cleanId,
      domain: domain ? domain.toLowerCase().trim() : '',
      subdomain: subdomain ? subdomain.toLowerCase().trim() : cleanId,
      plan: plan || 'pro',
      status: 'active',
      branding: {
        ...DEFAULT_TENANT_CONFIG.branding,
        whatsappNumber: whatsappNumber || DEFAULT_TENANT_CONFIG.branding.whatsappNumber
      },
      commercial: {
        ...DEFAULT_TENANT_CONFIG.commercial,
        alias: alias || `${cleanId.toUpperCase()}.PERFUMES`,
        cbu: cbu || ''
      }
    })

    clearTenantCache()

    res.status(201).json({
      success: true,
      message: `¡Perfumería "${name}" creada con éxito!`,
      tenant: newTenant
    })
  } catch (err) {
    console.error('Error creating new tenant:', err)
    res.status(500).json({ error: err.message || 'Error al crear la nueva perfumería' })
  }
})

// PUT /api/tenant/:id/status - Cambiar estado de suscripción (Superadmin)
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, plan } = req.body
    const targetId = req.params.id.toLowerCase().trim()

    if (!isMongoConnected()) {
      return res.json({ success: true, message: 'Estado actualizado (modo local)' })
    }

    const tenant = await Tenant.findOne({ tenantId: targetId })
    if (!tenant) {
      return res.status(404).json({ error: 'Perfumería no encontrada' })
    }

    if (status) tenant.status = status
    if (plan) tenant.plan = plan
    await tenant.save()
    clearTenantCache()

    res.json({ success: true, message: `Perfumería ${tenant.name} actualizada (${status || tenant.status})`, tenant })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar estado' })
  }
})

// DELETE /api/tenant/:id - Dar de baja perfumería (Superadmin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase().trim()
    if (targetId === 'gicca') {
      return res.status(400).json({ error: 'No es posible eliminar la tienda principal Gicca' })
    }

    if (!isMongoConnected()) {
      return res.json({ success: true, message: 'Perfumería eliminada (modo local)' })
    }

    await Tenant.deleteOne({ tenantId: targetId })
    clearTenantCache()
    res.json({ success: true, message: 'Perfumería dada de baja con éxito' })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al eliminar perfumería' })
  }
})

export default router
