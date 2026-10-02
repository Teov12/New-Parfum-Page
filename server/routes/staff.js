import express from 'express'
import bcrypt from 'bcryptjs'
import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireOwner } from '../middleware/auth.js'
import { clearTenantCache } from '../middleware/tenant.js'
import { getTenantLimits } from '../config/platform.js'
import { blockInDemoStore } from '../middleware/demo.js'
import { MIN_PASSWORD_LENGTH, normalizeEmail, isValidEmail } from '../services/tenantService.js'

const router = express.Router()

const toPublicMember = (m) => ({
  id: String(m._id),
  email: m.email,
  name: m.name || '',
  active: m.active !== false,
  createdAt: m.createdAt
})

const requireMongo = (req, res, next) => {
  if (!isMongoConnected()) {
    return res.status(400).json({ error: 'Los usuarios de equipo requieren MongoDB configurado.' })
  }
  next()
}

// GET /api/staff - Usuarios del equipo de la tienda
router.get('/', requireOwner, requireMongo, async (req, res) => {
  const tenant = await Tenant.findOne({ tenantId: req.tenantId }, { staff: 1, plan: 1, billing: 1, tenantId: 1 }).lean()
  res.json({
    staff: (tenant?.staff || []).map(toPublicMember),
    limit: getTenantLimits(tenant || req.tenant).staff
  })
})

// POST /api/staff - Sumar un usuario (acceso a pedidos y catálogo, sin configuración ni cobros)
router.post('/', requireOwner, requireMongo, blockInDemoStore, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const name = String(req.body.name || '').trim().slice(0, 80)
    const { password } = req.body

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Ingresá un email válido.' })
    }
    if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` })
    }

    const tenant = await Tenant.findOne({ tenantId: req.tenantId })
    if (!tenant) {
      return res.status(404).json({ error: 'Guardá primero la configuración de tu tienda.' })
    }
    if (normalizeEmail(tenant.adminUser?.email) === email || tenant.staff.some(m => m.email === email)) {
      return res.status(409).json({ error: 'Ese email ya tiene acceso a la tienda.' })
    }

    const limit = getTenantLimits(tenant.toObject()).staff
    if (limit !== null && tenant.staff.length >= limit) {
      return res.status(403).json({ error: `Tu plan permite hasta ${limit} usuario(s) de equipo. Cambiá de plan en Admin > Mi Plan.` })
    }

    tenant.staff.push({ email, name, passwordHash: await bcrypt.hash(String(password), 12) })
    await tenant.save()
    clearTenantCache()

    res.status(201).json({ success: true, member: toPublicMember(tenant.staff[tenant.staff.length - 1]) })
  } catch (err) {
    console.error('Error creando usuario de equipo:', err)
    res.status(500).json({ error: 'No se pudo crear el usuario' })
  }
})

// DELETE /api/staff/:memberId - Quitar acceso
router.delete('/:memberId', requireOwner, requireMongo, blockInDemoStore, async (req, res) => {
  const result = await Tenant.updateOne(
    { tenantId: req.tenantId },
    { $pull: { staff: { _id: req.params.memberId } } }
  ).catch(() => ({ modifiedCount: 0 }))

  if (!result.modifiedCount) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  clearTenantCache()
  res.json({ success: true })
})

export default router
