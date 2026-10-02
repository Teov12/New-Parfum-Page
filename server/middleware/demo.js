import { isDemoStore } from '../config/platform.js'

const DEMO_BLOCKED_MESSAGE = 'Esta acción está deshabilitada en la tienda de demostración.'

/**
 * En las tiendas demo cualquiera puede entrar al panel desde la landing:
 * se bloquean las acciones que podrían dejar la demo inutilizable o usarse para abuso.
 */
export const blockInDemoStore = (req, res, next) => {
  if (isDemoStore(req.tenant)) {
    return res.status(403).json({ error: DEMO_BLOCKED_MESSAGE, code: 'demo_store' })
  }
  next()
}

/**
 * En una tienda demo la configuración se puede cambiar para probar (diseño, textos, envíos),
 * pero nunca dominio, credenciales de cobro, Andreani ni facturación.
 */
export const stripDemoSensitiveSettings = (req, res, next) => {
  if (isDemoStore(req.tenant) && req.body && typeof req.body === 'object') {
    delete req.body.domain
    delete req.body.subdomain
    delete req.body.invoicing
    if (req.body.commercial) {
      for (const field of ['mpAccessToken', 'mercadoPagoAccessToken', 'mpPublicKey', 'clearMpCredentials', 'mpWebhookSecret', 'clearMpWebhookSecret', 'andreani', 'notificationEmail']) {
        delete req.body.commercial[field]
      }
    }
  }
  next()
}
