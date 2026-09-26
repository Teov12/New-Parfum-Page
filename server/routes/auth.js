import express from 'express'
import rateLimit from 'express-rate-limit'
import { signAdminToken, requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Limitador contra ataques de fuerza bruta en el login (máx. 10 intentos cada 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos fallidos de inicio de sesión. Por seguridad, intente nuevamente en 15 minutos.'
  }
})

router.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Por favor ingrese la contraseña de administrador' })
  }

  const configuredPassword = process.env.ADMIN_PASSWORD
  if (!configuredPassword && process.env.NODE_ENV === 'production') {
    console.error('[CRITICAL SECURITY] ADMIN_PASSWORD no ha sido definida en las variables de entorno de producción.')
    return res.status(500).json({ error: 'Servidor no configurado para autenticación administrativa.' })
  }

  const effectivePassword = configuredPassword || 'admin123'

  if (password === effectivePassword) {
    const userPayload = {
      username: 'Admin Gicca',
      role: 'superadmin',
      loginTime: new Date().toISOString()
    }

    const token = signAdminToken(userPayload)

    return res.json({
      success: true,
      token,
      user: {
        username: userPayload.username,
        role: userPayload.role
      }
    })
  }

  return res.status(401).json({ error: 'Contraseña de administrador incorrecta' })
})

router.get('/verify', requireAuth, (req, res) => {
  return res.json({ 
    valid: true, 
    user: req.user 
  })
})

export default router
