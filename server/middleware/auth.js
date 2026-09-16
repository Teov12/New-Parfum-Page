import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'gicca_perfumes_boutique_jwt_secret_key_2026_super_secure'

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
