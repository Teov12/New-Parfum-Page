import express from 'express'
import { requireOwner, signPurposeToken, verifyPurposeToken } from '../middleware/auth.js'
import { getStoreUrl } from '../config/platform.js'
import { isOAuthConfigured, buildAuthorizationUrl, completeAuthorization } from '../services/mercadopagoOAuth.js'
import { blockInDemoStore } from '../middleware/demo.js'

const router = express.Router()

// GET /api/mercadopago/oauth/start - Link para que el dueño autorice su cuenta de Mercado Pago
router.get('/start', requireOwner, blockInDemoStore, (req, res) => {
  if (!isOAuthConfigured()) {
    return res.status(503).json({ error: 'La conexión automática con Mercado Pago no está habilitada. Cargá tus credenciales manualmente.' })
  }
  // El estado firmado identifica la tienda y a dónde volver (la redirección de MP es única para la plataforma)
  const state = signPurposeToken({
    tenantId: req.tenantId,
    returnTo: getStoreUrl(req.tenant, req)
  }, 'mp_oauth', '15m')
  res.json({ url: buildAuthorizationUrl(state) })
})

// GET /api/mercadopago/oauth/callback - Mercado Pago vuelve acá con el código de autorización
router.get('/callback', async (req, res) => {
  let returnTo = ''
  try {
    const payload = verifyPurposeToken(req.query.state, 'mp_oauth')
    returnTo = payload.returnTo
    if (!req.query.code) throw new Error(req.query.error_description || 'Autorización cancelada')

    await completeAuthorization({ tenantId: payload.tenantId, code: String(req.query.code) })
    res.redirect(`${returnTo}/admin/tienda?mp=conectado`)
  } catch (err) {
    console.error('[MP OAuth] Error en callback:', err.message)
    const target = returnTo ? `${returnTo}/admin/tienda` : '/admin/tienda'
    res.redirect(`${target}?mp=error&detalle=${encodeURIComponent(err.message).slice(0, 200)}`)
  }
})

export default router
