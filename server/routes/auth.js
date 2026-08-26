import express from 'express'

const router = express.Router()

// Simple token/session for admin panel (Default password: admin123 or configurable)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const VALID_TOKEN = 'gicca_admin_token_secure_2026'

router.post('/login', (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ error: 'Por favor ingrese la contraseña de administrador' })
  }

  if (password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      token: VALID_TOKEN,
      user: {
        username: 'Admin Gicca',
        role: 'superadmin'
      }
    })
  }

  return res.status(401).json({ error: 'Contraseña de administrador incorrecta' })
})

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.replace('Bearer ', '') === VALID_TOKEN) {
    return res.json({ valid: true })
  }
  return res.status(401).json({ valid: false })
})

export default router
