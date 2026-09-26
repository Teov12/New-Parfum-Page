import express from 'express'
import { Tenant } from '../models/Tenant.js'
import { DEFAULT_TENANT_CONFIG, clearTenantCache } from '../middleware/tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireAuth } from '../middleware/auth.js'

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

// PUT /api/tenant/settings - Actualizar datos comerciales y branding de la tienda (Admin)
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const { name, branding, commercial } = req.body

    if (!isMongoConnected()) {
      return res.json({ 
        success: true, 
        message: 'Ajustes guardados (modo local)',
        tenant: { tenantId, name, branding, commercial }
      })
    }

    let tenantDoc = await Tenant.findOne({ tenantId })

    if (!tenantDoc) {
      tenantDoc = new Tenant({
        tenantId,
        name: name || DEFAULT_TENANT_CONFIG.name,
        slug: tenantId,
        branding: { ...DEFAULT_TENANT_CONFIG.branding, ...branding },
        commercial: { ...DEFAULT_TENANT_CONFIG.commercial, ...commercial }
      })
    } else {
      if (name) tenantDoc.name = name
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

export default router
