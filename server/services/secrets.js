import crypto from 'crypto'

/**
 * Cifrado en reposo de credenciales de las tiendas (tokens de Mercado Pago, claves de Andreani, etc.)
 * con AES-256-GCM. La clave sale de DATA_ENCRYPTION_KEY (64 caracteres hex o cualquier frase larga).
 *
 * Los valores sin prefijo "enc:v1:" se consideran texto plano (datos previos al cifrado),
 * así la migración es transparente: se cifran la próxima vez que se guardan.
 */
const PREFIX = 'enc:v1:'

let warned = false

const getKey = () => {
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim()
  if (!raw) {
    if (!warned && process.env.NODE_ENV === 'production') {
      console.warn('[SECURITY] DATA_ENCRYPTION_KEY no está configurada: las credenciales de las tiendas se guardan sin cifrar.')
      warned = true
    }
    return null
  }
  return /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : crypto.createHash('sha256').update(raw).digest()
}

export const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX)

export const encryptSecret = (plain) => {
  if (!plain || isEncrypted(plain)) return plain || ''
  const key = getKey()
  if (!key) return plain

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`
}

export const decryptSecret = (value) => {
  if (!value) return ''
  if (!isEncrypted(value)) return value

  const key = getKey()
  if (!key) {
    console.error('[SECURITY] Hay credenciales cifradas pero falta DATA_ENCRYPTION_KEY para leerlas.')
    return ''
  }
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
  } catch (err) {
    console.error('[SECURITY] No se pudo descifrar una credencial (¿cambió DATA_ENCRYPTION_KEY?):', err.message)
    return ''
  }
}

// Pista para mostrar en el panel sin exponer el secreto completo
export const secretHint = (value) => {
  const plain = decryptSecret(value)
  if (!plain) return ''
  return plain.length <= 8 ? '••••' : `${plain.slice(0, 8)}…${plain.slice(-4)}`
}
