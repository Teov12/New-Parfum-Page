import express from 'express'
import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireOwner } from '../middleware/auth.js'
import { clearTenantCache, getLocalDefaultTenant } from '../middleware/tenant.js'
import { getTenantCoupons, sanitizeCoupons } from '../services/coupons.js'

const router = express.Router()

// GET /api/coupons - Cupones de la tienda
router.get('/', requireOwner, async (req, res) => {
  const tenant = isMongoConnected()
    ? (await Tenant.findOne({ tenantId: req.tenantId }).lean()) || req.tenant
    : req.tenant
  res.json({ coupons: getTenantCoupons(tenant) })
})

// PUT /api/coupons - Reemplaza la lista de cupones
router.put('/', requireOwner, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'Administrar cupones requiere MongoDB configurado.' })
    }
    let tenant = await Tenant.findOne({ tenantId: req.tenantId })
    if (!tenant) {
      // La tienda principal todavía vive en tenant.json: se crea su registro con esa configuración
      const base = getLocalDefaultTenant()
      tenant = new Tenant({ ...base, slug: base.slug || req.tenantId, billing: { status: 'exempt' } })
    }

    const previous = getTenantCoupons(tenant.toObject())
    tenant.coupons = sanitizeCoupons(req.body?.coupons, previous)
    await tenant.save()
    clearTenantCache()

    res.json({ success: true, coupons: tenant.coupons })
  } catch (err) {
    console.error('Error guardando cupones:', err)
    res.status(500).json({ error: 'No se pudieron guardar los cupones' })
  }
})

export default router
