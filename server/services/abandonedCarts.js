import { AbandonedCart } from '../models/AbandonedCart.js'
import { isMongoConnected } from '../dbConnection.js'
import { resolveTenantById } from '../middleware/tenant.js'
import { getStoreUrl } from '../config/platform.js'
import { sendEmail, renderLayout, getStoreContactEmail, escapeHtml, money } from './mailer.js'

// Tiempo que se espera antes de recordar el carrito (y ventana máxima para hacerlo)
const REMIND_AFTER_MS = Number(process.env.ABANDONED_CART_DELAY_HOURS || 2) * 60 * 60 * 1000
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Envía un único recordatorio por carrito abandonado, si la tienda lo tiene habilitado.
 */
export const sendAbandonedCartReminders = async () => {
  if (!isMongoConnected()) return 0
  const now = Date.now()
  const carts = await AbandonedCart.find({
    reminderSentAt: null,
    recoveredAt: null,
    unsubscribed: { $ne: true },
    updatedAt: { $lt: new Date(now - REMIND_AFTER_MS), $gt: new Date(now - MAX_AGE_MS) }
  }).limit(200)

  let sent = 0
  for (const cart of carts) {
    const tenant = await resolveTenantById(cart.tenantId)
    // Marcar primero: nunca se envía dos veces aunque falle el email
    cart.reminderSentAt = new Date()
    await cart.save()

    if (tenant?.tenantId !== cart.tenantId || tenant.status === 'suspended' || tenant.automations?.abandonedCartEmails === false) continue
    const base = getStoreUrl(tenant)
    if (!base) continue

    const items = cart.items.map(i => `<li>${Number(i.quantity) || 1}x ${escapeHtml(i.name)} (${escapeHtml(i.size)})</li>`).join('')
    const result = await sendEmail({
      to: cart.email,
      subject: `${cart.firstName ? `${cart.firstName}, ` : ''}tu selección te espera en ${tenant.name}`,
      html: renderLayout({
        tenant,
        title: 'Tu carrito',
        subtitle: 'Tu selección te espera',
        body: `<p>Hola${cart.firstName ? ` ${escapeHtml(cart.firstName)}` : ''}, dejaste estos perfumes en tu carrito:</p>
          <ul>${items}</ul>
          <p><strong>Subtotal: ${money(cart.subtotal)}</strong></p>
          <div style="text-align:center;margin:24px 0;"><a href="${escapeHtml(`${base}/carrito?recuperar=${cart.token}`)}" style="display:inline-block;background:#2e1911;color:#fff;text-decoration:none;padding:12px 24px;border-radius:25px;font-size:13px;font-weight:bold;text-transform:uppercase;">Terminar mi compra</a></div>
          <p style="font-size:11px;color:#999;">¿No querés recibir estos avisos? <a href="${escapeHtml(`${base}/api/carts/unsubscribe/${cart.token}`)}">Darme de baja</a>.</p>`
      }),
      replyTo: getStoreContactEmail(tenant),
      fromName: tenant.name
    })
    if (result.success) sent++
  }
  return sent
}

export const purgeOldCarts = async () => {
  if (!isMongoConnected()) return 0
  const res = await AbandonedCart.deleteMany({ updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
  return res.deletedCount || 0
}

