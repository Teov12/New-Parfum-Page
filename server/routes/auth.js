import express from 'express'
import { signAdminToken, requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Contraseña de administrador (configurable por variable de entorno ADMIN_PASSWORD)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

router.post('/login', (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Por favor ingrese la contraseña de administrador' })
  }

  if (password === ADMIN_PASSWORD) {
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
