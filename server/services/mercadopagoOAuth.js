import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { clearTenantCache, getLocalDefaultTenant } from '../middleware/tenant.js'
import { getDefaultTenantId } from '../config/platform.js'
import { encryptSecret, decryptSecret } from './secrets.js'

/**
 * Mercado Pago OAuth: cada perfumería conecta su cuenta desde el panel con la aplicación de la plataforma.
 * https://www.mercadopago.com.ar/developers/es/docs/security/oauth
 */
const MP_API = 'https://api.mercadopago.com'
const AUTH_URL = 'https://auth.mercadopago.com.ar/authorization'

export const getOAuthConfig = () => ({
  clientId: process.env.MP_CLIENT_ID?.trim() || '',
  clientSecret: process.env.MP_CLIENT_SECRET?.trim() || '',
  redirectUri: process.env.MP_OAUTH_REDIRECT_URI?.trim() || ''
})

export const isOAuthConfigured = () => {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig()
  return Boolean(clientId && clientSecret && redirectUri)
}

export const buildAuthorizationUrl = (state) => {
  const { clientId, redirectUri } = getOAuthConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: redirectUri
  })
  return `${AUTH_URL}?${params.toString()}`
}

const requestToken = async (body) => {
  const { clientId, clientSecret } = getOAuthConfig()
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || data.error_description || 'Mercado Pago rechazó la autorización')
  }
  return data
}

const fetchAccountNickname = async (accessToken) => {
  try {
    const res = await fetch(`${MP_API}/users/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
    const data = await res.json()
    return data.nickname || data.email || ''
  } catch {
    return ''
  }
}

const saveConnection = async (tenantId, tokenData, { nickname } = {}) => {
  const accessToken = encryptSecret(tokenData.access_token)
  const update = {
    'commercial.mpAccessToken': accessToken,
    'commercial.mercadoPagoAccessToken': accessToken,
    'commercial.mpPublicKey': tokenData.public_key || '',
    'commercial.mercadoPagoPublicKey': tokenData.public_key || '',
    'commercial.mpConnection.method': 'oauth',
    'commercial.mpConnection.userId': String(tokenData.user_id || ''),
    'commercial.mpConnection.refreshToken': encryptSecret(tokenData.refresh_token || ''),
    'commercial.mpConnection.expiresAt': new Date(Date.now() + (Number(tokenData.expires_in) || 15552000) * 1000)
  }
  if (nickname !== undefined) update['commercial.mpConnection.nickname'] = nickname

  const existing = await Tenant.exists({ tenantId })
  if (!existing && tenantId === getDefaultTenantId()) {
    // La tienda principal aún vive en tenant.json: se crea su registro con esa configuración
    const base = getLocalDefaultTenant()
    await Tenant.create({ ...base, slug: base.slug || tenantId, billing: { status: 'exempt' } })
  }
  await Tenant.updateOne({ tenantId }, { $set: { ...update, 'commercial.mpConnection.connectedAt': new Date() } })
  clearTenantCache()
}

export const completeAuthorization = async ({ tenantId, code }) => {
  if (!isMongoConnected()) throw new Error('Conectar Mercado Pago requiere MongoDB configurado.')
  const tokenData = await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getOAuthConfig().redirectUri
  })
  const nickname = await fetchAccountNickname(tokenData.access_token)
  await saveConnection(tenantId, tokenData, { nickname })
  return { nickname }
}

/**
 * Renueva los tokens que vencen en menos de 30 días (MP los emite por 180 días).
 */
export const refreshExpiringConnections = async () => {
  if (!isMongoConnected() || !isOAuthConfigured()) return 0
  const soon = new Date(Date.now() + 30 * 86400000)
  const tenants = await Tenant.find({
    'commercial.mpConnection.method': 'oauth',
    'commercial.mpConnection.expiresAt': { $lt: soon }
  }).lean()

  let refreshed = 0
  for (const tenant of tenants) {
    try {
      const refreshToken = decryptSecret(tenant.commercial.mpConnection.refreshToken)
      if (!refreshToken) continue
      const tokenData = await requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
      await saveConnection(tenant.tenantId, tokenData)
      refreshed++
    } catch (err) {
      console.error(`[MP OAuth] No se pudo renovar el token de ${tenant.tenantId}:`, err.message)
    }
  }
  return refreshed
}
