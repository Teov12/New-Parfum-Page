import express from 'express'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { WithdrawalRequest } from '../models/WithdrawalRequest.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireAuth } from '../middleware/auth.js'
import { getOrderByIdOrNumber } from '../db.js'
import { sendEmail, renderLayout, getStoreContactEmail, escapeHtml } from '../services/mailer.js'

const router = express.Router()

const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta conexión. Intentá más tarde.' }
})

const clean = (value, max) => String(value ?? '').trim().slice(0, max)

/**
 * POST /api/legal/withdrawal - Botón de arrepentimiento (Res. 424/2020).
 * El comprador revoca la compra dentro de los 10 días: se registra la solicitud, se le envía un
 * código de seguimiento y se avisa a la tienda. Funciona aunque la tienda esté pausada.
 */
router.post('/withdrawal', withdrawalLimiter, async (req, res) => {
  try {
    const name = clean(req.body.name, 120)
    const email = clean(req.body.email, 120).toLowerCase()
    const orderNumber = clean(req.body.orderNumber, 40).toUpperCase()
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Completá tu nombre y un email válido.' })
    }

    const code = `ARR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const request = {
      tenantId: req.tenantId,
      code,
      orderNumber,
      name,
      email,
      phone: clean(req.body.phone, 40),
      reason: clean(req.body.reason, 1000)
    }
    if (isMongoConnected()) {
      await WithdrawalRequest.create(request)
    } else {
      console.log(`[Arrepentimiento] ${req.tenantId} ${code} pedido ${orderNumber} (${email})`)
    }

    // Si el pedido existe y es de ese email, se informa en el aviso a la tienda
    const order = orderNumber ? await getOrderByIdOrNumber(orderNumber, req.tenantId).catch(() => null) : null
    const orderMatches = Boolean(order && String(order.customer?.email || '').toLowerCase() === email)
    const storeName = req.tenant?.name || 'la tienda'

    await sendEmail({
      to: email,
      subject: `Recibimos tu solicitud de arrepentimiento (${code})`,
      html: renderLayout({
        tenant: req.tenant,
        title: 'Botón de arrepentimiento',
        subtitle: 'Solicitud recibida',
        body: `<p>Hola ${escapeHtml(name)}, registramos tu pedido de revocación de compra${orderNumber ? ` del pedido <strong>#${escapeHtml(orderNumber)}</strong>` : ''}.</p>
          <p>Tu código de seguimiento es <strong>${code}</strong>. ${escapeHtml(storeName)} se va a comunicar con vos para coordinar la devolución.</p>`
      }),
      replyTo: getStoreContactEmail(req.tenant),
      fromName: storeName
    })

    const storeEmail = getStoreContactEmail(req.tenant)
    if (storeEmail) {
      await sendEmail({
        to: storeEmail,
        subject: `Botón de arrepentimiento: ${code}${orderNumber ? ` - Pedido #${orderNumber}` : ''}`,
        html: renderLayout({
          tenant: req.tenant,
          title: 'Solicitud de arrepentimiento',
          subtitle: 'Acción requerida',
          body: `<p>Un cliente usó el Botón de arrepentimiento. Tenés que responderle dentro de las 24 hs.</p>
            <ul>
              <li><strong>Código:</strong> ${code}</li>
              <li><strong>Nombre:</strong> ${escapeHtml(name)}</li>
              <li><strong>Email:</strong> ${escapeHtml(email)}</li>
              <li><strong>Teléfono:</strong> ${escapeHtml(request.phone)}</li>
              <li><strong>Pedido:</strong> ${escapeHtml(orderNumber || 'No indicado')} ${orderNumber ? (orderMatches ? '(coincide con el email)' : '(no coincide con un pedido de ese email)') : ''}</li>
              <li><strong>Motivo:</strong> ${escapeHtml(request.reason || '-')}</li>
            </ul>`
        }),
        replyTo: email,
        fromName: storeName
      })
    }

    res.status(201).json({ success: true, code })
  } catch (err) {
    console.error('Error en botón de arrepentimiento:', err)
    res.status(500).json({ error: 'No pudimos registrar tu solicitud. Escribinos por email o WhatsApp.' })
  }
})

// GET /api/legal/withdrawals - Solicitudes recibidas (panel)
router.get('/withdrawals', requireAuth, async (req, res) => {
  if (!isMongoConnected()) return res.json({ requests: [] })
  const requests = await WithdrawalRequest.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).limit(200).lean()
  res.json({ requests })
})

// PUT /api/legal/withdrawals/:id - Actualizar el estado de una solicitud
router.put('/withdrawals/:id', requireAuth, async (req, res) => {
  if (!isMongoConnected()) return res.status(400).json({ error: 'Requiere MongoDB.' })
  const status = ['pending', 'in_progress', 'resolved'].includes(req.body.status) ? req.body.status : undefined
  const update = { ...(status ? { status } : {}), ...(req.body.notes !== undefined ? { notes: clean(req.body.notes, 1000) } : {}) }
  const updated = await WithdrawalRequest.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: update },
    { returnDocument: 'after' }
  ).lean().catch(() => null)
  if (!updated) return res.status(404).json({ error: 'Solicitud no encontrada' })
  res.json({ success: true, request: updated })
})

export default router
