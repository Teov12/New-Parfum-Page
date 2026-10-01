import express from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { AbandonedCart } from '../models/AbandonedCart.js'
import { isMongoConnected } from '../dbConnection.js'
import { getProducts } from '../db.js'

const router = express.Router()

const cartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes.' }
})

/**
 * POST /api/carts/abandoned - El checkout registra el carrito cuando el comprador deja su email.
 * Si no termina la compra, se le envía un único recordatorio.
 */
router.post('/abandoned', cartLimiter, async (req, res) => {
  try {
    if (!isMongoConnected() || req.storeSuspended || req.storeNotFound) return res.json({ success: true })
    const email = String(req.body.email || '').toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' })

    // Solo productos reales del catálogo, con su precio actual
    const products = await getProducts(req.tenantId)
    const items = (Array.isArray(req.body.items) ? req.body.items : []).slice(0, 30).map(item => {
      const product = products.find(p => p.id === item.id)
      if (!product) return null
      const size = product.sizes?.find(s => s.size === item.size)
      return {
        id: product.id,
        name: product.name,
        size: size?.size || item.size || '',
        quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)),
        price: Number(size?.price || product.price) || 0,
        image: product.images?.[0] || ''
      }
    }).filter(Boolean)
    if (items.length === 0) return res.json({ success: true })

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const existing = await AbandonedCart.findOne({ tenantId: req.tenantId, email, recoveredAt: null, reminderSentAt: null })
    if (existing) {
      existing.items = items
      existing.subtotal = subtotal
      existing.firstName = String(req.body.firstName || existing.firstName || '').slice(0, 80)
      await existing.save()
    } else {
      await AbandonedCart.create({
        tenantId: req.tenantId,
        email,
        firstName: String(req.body.firstName || '').slice(0, 80),
        items,
        subtotal,
        token: crypto.randomBytes(16).toString('hex')
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.warn('[Carts] Error registrando carrito:', err.message)
    res.json({ success: true })
  }
})

// GET /api/carts/recover/:token - Ítems para restaurar el carrito desde el email
router.get('/recover/:token', async (req, res) => {
  if (!isMongoConnected()) return res.status(404).json({ error: 'Carrito no encontrado' })
  const cart = await AbandonedCart.findOne({ tenantId: req.tenantId, token: req.params.token }).lean()
  if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' })
  res.json({ items: cart.items.map(({ id, size, quantity }) => ({ id, size, quantity })) })
})

// GET /api/carts/unsubscribe/:token - Baja de recordatorios (link del email)
router.get('/unsubscribe/:token', async (req, res) => {
  if (isMongoConnected()) {
    const cart = await AbandonedCart.findOne({ tenantId: req.tenantId, token: req.params.token })
    if (cart) {
      await AbandonedCart.updateMany({ tenantId: req.tenantId, email: cart.email }, { $set: { unsubscribed: true } })
    }
  }
  res.type('html').send('<!DOCTYPE html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#333"><h2>Listo</h2><p>No vas a recibir más recordatorios de carrito de esta tienda.</p></body></html>')
})

export default router
