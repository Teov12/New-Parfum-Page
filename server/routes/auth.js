import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { signAdminToken, requireAuth } from '../middleware/auth.js'
import { getDefaultTenantId, clearTenantCache } from '../middleware/tenant.js'
import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'

const router = express.Router()

const MIN_PASSWORD_LENGTH = 8

// Limitador contra ataques de fuerza bruta en el login (máx. 10 intentos cada 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  // Solo cuentan los intentos fallidos
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos fallidos de inicio de sesión. Por seguridad, intente nuevamente en 15 minutos.'
  }
})

// Comparación en tiempo constante para contraseñas guardadas en variables de entorno
const safeEqual = (a, b) => {
  const hashA = crypto.createHash('sha256').update(String(a)).digest()
  const hashB = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

const normalizeEmail = (email) => String(email || '').toLowerCase().trim()

const isSuperadminLogin = (email, password) => {
  const superEmail = normalizeEmail(process.env.SUPERADMIN_EMAIL)
  const superPassword = process.env.SUPERADMIN_PASSWORD
  if (!superEmail || !superPassword) return false
  return email === superEmail && safeEqual(password, superPassword)
}

const getTenantAdminUser = async (tenantId) => {
  if (!isMongoConnected()) return null
  const doc = await Tenant.findOne({ tenantId }, { adminUser: 1 }).lean()
  return doc?.adminUser?.passwordHash ? doc.adminUser : null
}

/**
 * Verifica las credenciales del dueño de la tienda resuelta en req.tenantId.
 * - Tiendas con usuario propio: email + contraseña (bcrypt).
 * - Tienda principal sin usuario propio (instalación previa al multi-tienda): ADMIN_PASSWORD.
 * Devuelve { ok, error, status }
 */
const verifyTenantOwner = async (tenantId, email, password) => {
  const adminUser = await getTenantAdminUser(tenantId)

  if (adminUser) {
    const emailMatches = !adminUser.email || email === normalizeEmail(adminUser.email)
    const passwordMatches = await bcrypt.compare(password, adminUser.passwordHash)
    return emailMatches && passwordMatches
      ? { ok: true }
      : { ok: false, status: 401, error: 'Email o contraseña incorrectos' }
  }

  if (tenantId !== getDefaultTenantId()) {
    return { ok: false, status: 401, error: 'Esta tienda todavía no tiene un usuario administrador configurado.' }
  }

  const configuredPassword = process.env.ADMIN_PASSWORD
  if (!configuredPassword && process.env.NODE_ENV === 'production') {
    console.error('[CRITICAL SECURITY] ADMIN_PASSWORD no ha sido definida en las variables de entorno de producción.')
    return { ok: false, status: 500, error: 'Servidor no configurado para autenticación administrativa.' }
  }

  const effectivePassword = configuredPassword || 'admin123'
  return safeEqual(password, effectivePassword)
    ? { ok: true }
    : { ok: false, status: 401, error: 'Contraseña de administrador incorrecta' }
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { password } = req.body
    const email = normalizeEmail(req.body.email)

    if (!password) {
      return res.status(400).json({ error: 'Por favor ingrese la contraseña de administrador' })
    }

    // Superadmin de la plataforma (definido por variables de entorno)
    if (email && isSuperadminLogin(email, password)) {
      const token = signAdminToken({ role: 'superadmin', email, tenantId: null })
      return res.json({
        success: true,
        token,
        user: { username: 'Superadmin', email, role: 'superadmin', tenantId: null }
      })
    }

    const tenantId = req.tenantId
    const result = await verifyTenantOwner(tenantId, email, password)
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }

    const username = `Admin ${req.tenant?.name || tenantId}`
    const token = signAdminToken({ role: 'owner', email, tenantId, username })

    return res.json({
      success: true,
      token,
      user: { username, email, role: 'owner', tenantId }
    })
  } catch (err) {
    console.error('Error en login:', err)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

router.get('/verify', requireAuth, (req, res) => {
  return res.json({
    valid: true,
    user: req.user
  })
})

// PUT /api/auth/credentials - El dueño de la tienda define o cambia su email y contraseña
router.put('/credentials', loginLimiter, requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'El superadmin gestiona credenciales desde la consola de plataforma.' })
    }
    if (!isMongoConnected()) {
      return res.status(400).json({ error: 'El cambio de credenciales requiere MongoDB configurado.' })
    }

    const { currentPassword, newPassword } = req.body
    const email = normalizeEmail(req.body.email)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ingresá un email válido.' })
    }
    if (!newPassword || String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` })
    }

    // La contraseña actual se valida contra el email registrado (no contra el nuevo)
    const adminUser = await getTenantAdminUser(req.tenantId)
    const currentEmail = adminUser ? normalizeEmail(adminUser.email) : email
    const check = await verifyTenantOwner(req.tenantId, currentEmail, String(currentPassword || ''))
    if (!check.ok) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta.' })
    }

    // Si la tienda principal todavía vive en tenant.json, se crea su registro con esa misma configuración
    const tenant = req.tenant || {}
    const passwordHash = await bcrypt.hash(String(newPassword), 12)
    await Tenant.findOneAndUpdate(
      { tenantId: req.tenantId },
      {
        $set: { 'adminUser.email': email, 'adminUser.passwordHash': passwordHash },
        $setOnInsert: {
          name: tenant.name || req.tenantId,
          slug: req.tenantId,
          domain: tenant.domain || '',
          subdomain: tenant.subdomain || '',
          branding: tenant.branding,
          commercial: tenant.commercial
        }
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    )
    clearTenantCache()

    res.json({ success: true, message: 'Credenciales actualizadas. Usalas en tu próximo inicio de sesión.' })
  } catch (err) {
    console.error('Error actualizando credenciales:', err)
    res.status(500).json({ error: 'Error al actualizar las credenciales' })
  }
})

export default router
