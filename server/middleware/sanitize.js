/**
 * Elimina del cuerpo de las peticiones cualquier clave que empiece con "$" (operadores de MongoDB).
 * Sin esto, un body como { "$set": { "tenantId": "otra" } } llegaría intacto a un update
 * y podría escribir en los datos de otra tienda.
 */
const MAX_DEPTH = 20

const stripOperators = (value, depth = 0) => {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    value.forEach(item => stripOperators(item, depth + 1))
    return value
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith('$')) {
      delete value[key]
    } else {
      stripOperators(value[key], depth + 1)
    }
  }
  return value
}

export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') stripOperators(req.body)
  next()
}

export { stripOperators }
