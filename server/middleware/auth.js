import jwt from 'jsonwebtoken'

// Versión del formato de token. Los tokens emitidos antes del aislamiento por tienda
// (sin tenantId) quedan invalidados y obligan a iniciar sesión nuevamente.
const TOKEN_VERSION = 2

const DEV_FALLBACK_SECRET = 'gicca_perfumes_boutique_jwt_secret_key_2026_super_secure'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret && process.env.NODE_ENV === 'production') {
    // Con el secreto por defecto cualquiera podría firmar un token de superadmin
    throw new Error('[CRITICAL SECURITY] JWT_SECRET no está configurada en producción. Definí una clave secreta fuerte (mínimo 32 caracteres).')
  }
  return secret || DEV_FALLBACK_SECRET
}

const JWT_SECRET = getJwtSecret()

const extractToken = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.replace('Bearer ', '').trim()
}

const decodeToken = (token) => {
  const decoded = jwt.verify(token, JWT_SECRET)
  if (decoded.v !== TOKEN_VERSION) {
    throw new Error('Formato de token obsoleto')
  }
  return decoded
}

// El superadmin opera sobre cualquier tienda; el dueño solo sobre la suya
const canAccessTenant = (user, tenantId) => {
  return user.role === 'superadmin' || (Boolean(user.tenantId) && user.tenantId === tenantId)
}

/**
 * Middleware para proteger rutas administrativas de la tienda resuelta en req.tenantId
 * Requiere header Authorization: Bearer <jwt_token>
 */
export const requireAuth = (req, res, next) => {
  const token = extractToken(req)
  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Se requiere token de administrador.'
    })
  }

  let decoded
  try {
    decoded = decodeToken(token)
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado. Por favor iniciá sesión nuevamente.'
    })
  }

  if (!canAccessTenant(decoded, req.tenantId)) {
    return res.status(403).json({
      error: 'Tu cuenta no tiene acceso a esta tienda.'
    })
  }

  req.user = decoded
  next()
}

/**
 * Middleware para rutas de la consola de plataforma (alta/baja/suspensión de tiendas)
 */
export const requireSuperadmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Se requiere una cuenta de superadmin de la plataforma.' })
    }
    next()
  })
}

/**
 * Devuelve el usuario autenticado con acceso a la tienda actual, o null.
 * Para endpoints públicos que habilitan más opciones a un administrador (ej: ventas manuales).
 */
export const getAuthorizedUser = (req) => {
  const token = extractToken(req)
  if (!token) return null
  try {
    const decoded = decodeToken(token)
    return canAccessTenant(decoded, req.tenantId) ? decoded : null
  } catch {
    return null
  }
}

export const signAdminToken = (payload) => {
  return jwt.sign({ ...payload, v: TOKEN_VERSION }, JWT_SECRET, { expiresIn: '7d' })
}
