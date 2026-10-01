import express from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { Customer } from '../models/Customer.js'
import { Order } from '../models/Order.js'
import { isMongoConnected } from '../dbConnection.js'
import { signPurposeToken, verifyPurposeToken } from '../middleware/auth.js'
import { toCustomerOrder } from '../services/orderService.js'
import { sendEmail, renderLayout, getStoreContactEmail } from '../services/mailer.js'

/**
 * Cuentas de comprador por tienda: registro con verificación de email, login, recuperación de
 * contraseña, datos de envío guardados e historial de pedidos (asociados por email verificado).
 */
const router = express.Router()

const CODE_TTL_MS = 15 * 60 * 1000
const MAX_CODE_ATTEMPTS = 5

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá unos minutos.' }
})

const normalizeEmail = (email) => String(email || '').toLowerCase().trim()
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max)
const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex')

const requireMongo = (req, res, next) => {
  if (!isMongoConnected()) return res.status(503).json({ error: 'Las cuentas de cliente no están disponibles en este momento.' })
  next()
}

const toPublicCustomer = (c) => ({
  id: String(c._id),
  email: c.email,
  firstName: c.firstName,
  lastName: c.lastName,
  phone: c.phone,
  dni: c.dni,
  address: c.address || {},
  emailVerified: c.emailVerified
})

const issueSession = (req, customer) => ({
  token: signPurposeToken({ tenantId: req.tenantId, customerId: String(customer._id), email: customer.email }, 'customer', '30d'),
  customer: toPublicCustomer(customer)
})

// Genera y envía un código de 6 dígitos para verificar el email o recuperar la contraseña
const sendCode = async (req, customer, purpose) => {
  const code = String(crypto.randomInt(100000, 1000000))
  customer.codeHash = hashCode(code)
  customer.codePurpose = purpose
  customer.codeExpiresAt = new Date(Date.now() + CODE_TTL_MS)
  customer.codeAttempts = 0
  await customer.save()

  const storeName = req.tenant?.name || 'la tienda'
  const intro = purpose === 'verify' ? 'Usá este código para confirmar tu email' : 'Usá este código para elegir una nueva contraseña'
  await sendEmail({
    to: customer.email,
    subject: `${code} es tu código de ${storeName}`,
    html: renderLayout({
      tenant: req.tenant,
      title: 'Tu código',
      subtitle: purpose === 'verify' ? 'Confirmá tu email' : 'Recuperar contraseña',
      body: `<p>${intro}:</p><p style="font-size: 30px; letter-spacing: 8px; font-weight: bold; text-align: center; color: #2e1911;">${code}</p><p style="font-size: 12px; color: #888;">Vence en 15 minutos. Si no lo pediste, ignorá este email.</p>`
    }),
    replyTo: getStoreContactEmail(req.tenant),
    fromName: storeName
  })
}

const checkCode = async (customer, code, purpose) => {
  if (!customer?.codeHash || customer.codePurpose !== purpose) return false
  if (!customer.codeExpiresAt || customer.codeExpiresAt < new Date() || customer.codeAttempts >= MAX_CODE_ATTEMPTS) return false
  if (hashCode(String(code || '').trim()) !== customer.codeHash) {
    customer.codeAttempts += 1
    await customer.save()
    return false
  }
  customer.codeHash = ''
  customer.codePurpose = ''
  customer.codeAttempts = 0
  return true
}

// Sesión del comprador (token de propósito 'customer' de esta tienda)
const requireCustomer = async (req, res, next) => {
  try {
    const token = String(req.headers.authorization || '').replace('Bearer ', '').trim()
    const payload = verifyPurposeToken(token, 'customer')
    if (payload.tenantId !== req.tenantId) throw new Error('Otra tienda')
    const customer = await Customer.findOne({ _id: payload.customerId, tenantId: req.tenantId })
    if (!customer || !customer.emailVerified) throw new Error('Cuenta inexistente')
    req.customer = customer
    next()
  } catch {
    res.status(401).json({ error: 'Iniciá sesión para continuar.' })
  }
}

// POST /api/customers/register
router.post('/register', authLimiter, requireMongo, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const { password } = req.body
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Ingresá un email válido.' })
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' })

    let customer = await Customer.findOne({ tenantId: req.tenantId, email })
    if (customer?.emailVerified) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.' })
    }
    if (!customer) customer = new Customer({ tenantId: req.tenantId, email })
    customer.passwordHash = await bcrypt.hash(String(password), 12)
    customer.firstName = clean(req.body.firstName, 80)
    customer.lastName = clean(req.body.lastName, 80)
    await sendCode(req, customer, 'verify')

    res.status(201).json({ success: true, needsVerification: true, message: 'Te enviamos un código a tu email.' })
  } catch (err) {
    console.error('Error registrando cliente:', err)
    res.status(500).json({ error: 'No pudimos crear tu cuenta.' })
  }
})

// POST /api/customers/verify - Confirmar el email con el código
router.post('/verify', authLimiter, requireMongo, async (req, res) => {
  const customer = await Customer.findOne({ tenantId: req.tenantId, email: normalizeEmail(req.body.email) })
  if (!customer || !(await checkCode(customer, req.body.code, 'verify'))) {
    return res.status(400).json({ error: 'El código es incorrecto o venció.' })
  }
  customer.emailVerified = true
  await customer.save()
  res.json({ success: true, ...issueSession(req, customer) })
})

// POST /api/customers/resend-code
router.post('/resend-code', authLimiter, requireMongo, async (req, res) => {
  const customer = await Customer.findOne({ tenantId: req.tenantId, email: normalizeEmail(req.body.email) })
  const purpose = req.body.purpose === 'reset' ? 'reset' : 'verify'
  // Misma respuesta exista o no la cuenta (no revela qué emails están registrados)
  if (customer && (purpose === 'reset' ? customer.emailVerified : !customer.emailVerified)) {
    await sendCode(req, customer, purpose).catch(err => console.warn('[Customers] Error enviando código:', err.message))
  }
  res.json({ success: true, message: 'Si el email corresponde a una cuenta, te enviamos un código.' })
})

// POST /api/customers/login
router.post('/login', authLimiter, requireMongo, async (req, res) => {
  const customer = await Customer.findOne({ tenantId: req.tenantId, email: normalizeEmail(req.body.email) })
  const valid = customer?.passwordHash && await bcrypt.compare(String(req.body.password || ''), customer.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Email o contraseña incorrectos.' })
  if (!customer.emailVerified) {
    await sendCode(req, customer, 'verify').catch(() => {})
    return res.status(403).json({ error: 'Confirmá tu email: te enviamos un código nuevo.', needsVerification: true })
  }
  res.json({ success: true, ...issueSession(req, customer) })
})

// POST /api/customers/reset-password - Nueva contraseña con el código recibido por email
router.post('/reset-password', authLimiter, requireMongo, async (req, res) => {
  const customer = await Customer.findOne({ tenantId: req.tenantId, email: normalizeEmail(req.body.email) })
  if (!req.body.password || String(req.body.password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' })
  }
  if (!customer || !(await checkCode(customer, req.body.code, 'reset'))) {
    return res.status(400).json({ error: 'El código es incorrecto o venció.' })
  }
  customer.passwordHash = await bcrypt.hash(String(req.body.password), 12)
  await customer.save()
  res.json({ success: true, ...issueSession(req, customer) })
})

// GET /api/customers/me
router.get('/me', requireMongo, requireCustomer, (req, res) => {
  res.json({ customer: toPublicCustomer(req.customer) })
})

// PUT /api/customers/me - Datos personales y dirección de envío
router.put('/me', requireMongo, requireCustomer, async (req, res) => {
  const c = req.customer
  c.firstName = clean(req.body.firstName ?? c.firstName, 80)
  c.lastName = clean(req.body.lastName ?? c.lastName, 80)
  c.phone = clean(req.body.phone ?? c.phone, 40)
  c.dni = clean(req.body.dni ?? c.dni, 20)
  if (req.body.address) {
    const a = req.body.address
    c.address = {
      address: clean(a.address, 200),
      apartment: clean(a.apartment, 80),
      city: clean(a.city, 80),
      province: clean(a.province, 80),
      postalCode: clean(a.postalCode, 12)
    }
  }
  await c.save()
  res.json({ success: true, customer: toPublicCustomer(c) })
})

// GET /api/customers/orders - Pedidos hechos con el email de la cuenta
router.get('/orders', requireMongo, requireCustomer, async (req, res) => {
  const escaped = req.customer.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const orders = await Order.find({ tenantId: req.tenantId, 'customer.email': new RegExp(`^${escaped}$`, 'i') })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()
  res.json({ orders: orders.map(toCustomerOrder) })
})

export default router
