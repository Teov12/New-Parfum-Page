import jwt from 'jsonwebtoken'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret && process.env.NODE_ENV === 'production') {
    console.error('[CRITICAL SECURITY] JWT_SECRET no está configurada en producción. Se requiere definir una clave secreta fuerte.')
  }
  return secret || 'gicca_perfumes_boutique_jwt_secret_key_2026_super_secure'
}

const JWT_SECRET = getJwtSecret()

/**
 * Middleware para proteger rutas administrativas
 * Requiere header Authorization: Bearer <jwt_token>
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Acceso no autorizado. Se requiere token de administrador.' 
    })
  }

  const token = authHeader.replace('Bearer ', '').trim()

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ 
      error: 'Token inválido o expirado. Por favor iniciá sesión nuevamente.' 
    })
  }
}

export const signAdminToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}
