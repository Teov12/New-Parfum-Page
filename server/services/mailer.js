/**
 * Servicio de Notificaciones Transaccionales por Correo Electrónico
 *
 * Proveedores (en orden de prioridad):
 * 1. Resend (RESEND_API_KEY) — recomendado para la plataforma: un dominio de envío verificado para todas las tiendas.
 * 2. SMTP (SMTP_HOST / SMTP_USER / SMTP_PASS).
 * 3. Sin configuración: se registra en el log (modo simulado) sin romper el checkout.
 *
 * Cada email sale con el nombre de la tienda y responde al email de contacto de esa tienda.
 */
import nodemailer from 'nodemailer'
import { getStoreUrl, getDefaultTenantId } from '../config/platform.js'

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]))

const money = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`

let smtpTransporter = null
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    })
  }
  return smtpTransporter
}

const getFromAddress = () =>
  process.env.MAIL_FROM_ADDRESS || process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@localhost'

// Email de contacto de la tienda: avisos de venta y reply-to de los emails a clientes
export const getStoreContactEmail = (tenant) => {
  const own = tenant?.commercial?.notificationEmail || tenant?.adminUser?.email
  if (own) return own
  // La variable de entorno es solo de la tienda principal (nunca recibe datos de otras tiendas)
  return tenant?.tenantId === getDefaultTenantId() ? (process.env.STORE_ADMIN_EMAIL || '') : ''
}

/**
 * Envía un correo con el proveedor configurado. Nunca lanza: devuelve { success, simulated?, error? }.
 */
export async function sendEmail({ to, subject, html, replyTo, fromName }) {
  if (!to) return { success: false, error: 'Sin destinatario' }
  if (/\.demo$/i.test(String(to).trim())) {
    console.log(`[Mailer:Demo] Para: ${to} | Asunto: ${subject}`)
    return { success: true, simulated: true }
  }
  const fromAddress = getFromAddress()
  const from = `${String(fromName || 'Perfumería').replace(/[<>"]/g, '')} <${fromAddress}>`

  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo || undefined })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || `Resend respondió ${res.status}`)
      console.log(`[Mailer] Correo enviado a ${to} (Resend ${data.id})`)
      return { success: true, messageId: data.id }
    }

    const transporter = getSmtpTransporter()
    if (!transporter) {
      console.log(`[Mailer:Simulado] Para: ${to} | Asunto: ${subject}`)
      return { success: true, simulated: true }
    }

    const info = await transporter.sendMail({ from, to, subject, html, replyTo: replyTo || fromAddress })
    console.log(`[Mailer] Correo enviado exitosamente a ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`[Mailer] Error al enviar correo a ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Plantilla base con la marca de la tienda
 */
export const renderLayout = ({ tenant, title, subtitle, body }) => {
  const storeName = escapeHtml(tenant?.name || 'Tu perfumería')
  const primary = /^#[0-9a-f]{3,8}$/i.test(tenant?.branding?.primaryColor || '') ? tenant.branding.primaryColor : '#2e1911'
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
    <body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2; padding: 40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <tr>
              <td style="background-color: ${primary}; padding: 32px 30px; text-align: center;">
                <h1 style="color: #ffffff; font-family: serif; font-size: 24px; font-weight: normal; margin: 0; letter-spacing: 0.08em; text-transform: uppercase;">${storeName}</h1>
                ${subtitle ? `<p style="color: #f3e6c8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; margin: 8px 0 0 0;">${escapeHtml(subtitle)}</p>` : ''}
              </td>
            </tr>
            <tr><td style="padding: 32px 35px 24px 35px; font-size: 14px; color: #444444; line-height: 1.6;">${body}</td></tr>
            <tr>
              <td style="background-color: #fcf7f1; padding: 20px 30px; text-align: center; border-top: 1px solid #eee4d9;">
                <p style="margin: 0; font-size: 11px; color: #999999;">Si tenés dudas, respondé este email o escribinos por WhatsApp.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

const button = (href, label, color = '#2e1911') => `
  <div style="text-align: center; margin: 24px 0;">
    <a href="${escapeHtml(href)}" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 25px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(label)}</a>
  </div>
`

export const getOrderStatusUrl = (order, tenant) => {
  const base = getStoreUrl(tenant)
  if (!base || !order?.accessToken) return ''
  return `${base}/pedido/${encodeURIComponent(order.orderNumber)}?token=${order.accessToken}`
}

/**
 * Confirmación de pedido (y de pago acreditado) para el comprador
 */
export async function sendOrderConfirmationEmail({ order, tenant }) {
  if (!order || !order.customer?.email) return

  const storeName = tenant?.name || 'Tu perfumería'
  const orderNumber = order.orderNumber || order.id || 'N/A'
  const customerName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Cliente'
  const isPaid = order.paymentStatus === 'paid'
  const isTransfer = String(order.paymentMethod || '').toLowerCase().includes('transfer')

  const bank = tenant?.commercial || {}
  const whatsappNumber = String(tenant?.branding?.whatsappNumber || '').replace(/[^0-9]/g, '')
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ${storeName}, adjunto el comprobante de mi pedido #${orderNumber}`)}`
    : ''

  const itemsHtml = (order.items || []).map(item => `
    <tr style="border-bottom: 1px solid #eeeeee;">
      <td style="padding: 12px 0; font-size: 14px; color: #2e1911;">
        <strong>${escapeHtml(item.name || 'Perfume')}</strong>
        <div style="font-size: 12px; color: #777777;">${escapeHtml(item.brand || '')} • ${escapeHtml(item.size || '')}</div>
      </td>
      <td style="padding: 12px 0; text-align: center; font-size: 14px; color: #555555;">${Number(item.quantity) || 1}</td>
      <td style="padding: 12px 0; text-align: right; font-size: 14px; font-weight: bold; color: #2e1911;">${money((item.price || 0) * (item.quantity || 1))}</td>
    </tr>
  `).join('')

  const bankRows = [
    ['Alias', bank.alias], ['CBU / CVU', bank.cbu], ['Banco', bank.bankName], ['Titular', bank.accountHolder]
  ].filter(([, value]) => value)
    .map(([label, value]) => `<tr><td style="padding: 4px 0; font-weight: bold;">${label}:</td><td>${escapeHtml(value)}</td></tr>`)
    .join('')

  const transferBox = isTransfer && !isPaid && bankRows ? `
    <div style="background-color: #fcf7f1; border: 1px solid #e7ded4; border-radius: 10px; padding: 20px; margin: 25px 0;">
      <h3 style="margin-top: 0; font-size: 15px; text-transform: uppercase; color: #2e1911;">Datos para Transferencia</h3>
      <p style="font-size: 13px; color: #555555;">Tu pedido quedará confirmado una vez recibido el comprobante.</p>
      <table style="width: 100%; font-size: 13px; color: #333333;">${bankRows}</table>
      ${whatsappUrl ? button(whatsappUrl, 'Enviar comprobante por WhatsApp', '#128c7e') : ''}
    </div>
  ` : ''

  const customer = order.customer || {}
  const delivery = order.pickupBranch?.name
    ? `Retiro en ${escapeHtml(order.pickupBranch.name)} (${escapeHtml(order.pickupBranch.address || '')})`
    : `${escapeHtml(customer.address)}${customer.apartment ? `, ${escapeHtml(customer.apartment)}` : ''}<br />${escapeHtml(customer.city)}, ${escapeHtml(customer.province)} (CP ${escapeHtml(customer.postalCode)})`

  const statusUrl = getOrderStatusUrl(order, tenant)
  const body = `
    <h2 style="font-size: 20px; color: #2e1911; margin-top: 0; font-family: serif;">
      ${isPaid ? `¡Recibimos tu pago, ${escapeHtml(customerName)}!` : `¡Gracias por tu compra, ${escapeHtml(customerName)}!`}
    </h2>
    <p>Tu pedido <strong>#${escapeHtml(orderNumber)}</strong> ${isPaid ? 'está pago y lo estamos preparando.' : 'quedó registrado. Este es el resumen:'}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; border-top: 1px solid #eeeeee;">
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        ${Number(order.discountAmount) > 0 ? `<tr><td colspan="2" style="padding: 12px 0 4px; text-align: right;">Descuentos:</td><td style="padding: 12px 0 4px; text-align: right;">-${money(order.discountAmount)}</td></tr>` : ''}
        <tr><td colspan="2" style="padding: 4px 0; text-align: right;">Envío (${escapeHtml(order.shippingMethod || '')}):</td>
            <td style="padding: 4px 0; text-align: right;">${Number(order.shippingCost || 0) === 0 ? '¡Gratis!' : money(order.shippingCost)}</td></tr>
        <tr><td colspan="2" style="padding: 6px 0; text-align: right; font-size: 16px; font-weight: bold; color: #2e1911;">Total:</td>
            <td style="padding: 6px 0; text-align: right; font-size: 18px; font-weight: bold; color: #2e1911;">${money(order.total)}</td></tr>
      </tfoot>
    </table>

    ${transferBox}

    <div style="background-color: #fbfbfb; border: 1px solid #f0f0f0; border-radius: 8px; padding: 15px 20px; margin-top: 20px;">
      <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #444444;">Entrega</h4>
      <p style="margin: 0; font-size: 13px; color: #666666;">${delivery}</p>
    </div>

    ${statusUrl ? button(statusUrl, 'Ver el estado de mi pedido') : ''}
  `

  await sendEmail({
    to: order.customer.email,
    subject: isPaid ? `Pago confirmado - Pedido #${orderNumber} en ${storeName}` : `Confirmación de Pedido #${orderNumber} en ${storeName}`,
    html: renderLayout({ tenant, title: 'Confirmación de Pedido', subtitle: isPaid ? 'Pago acreditado' : 'Confirmación de compra', body }),
    replyTo: getStoreContactEmail(tenant),
    fromName: storeName
  })
}

/**
 * Notificación interna para el dueño de la perfumería cuando entra un pedido
 */
export async function sendStoreOwnerNewOrderAlert({ order, tenant }) {
  const adminEmail = getStoreContactEmail(tenant)
  if (!adminEmail) return

  const storeName = tenant?.name || 'Tu tienda'
  const orderNumber = order.orderNumber || order.id || 'N/A'
  const customer = order.customer || {}
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Cliente'
  const cleanPhone = String(customer.phone || '').replace(/[^0-9]/g, '')
  const adminUrl = getStoreUrl(tenant) ? `${getStoreUrl(tenant)}/admin/ventas` : ''

  const body = `
    <h2 style="color: #2e1911; margin-top: 0;">¡Nueva venta!</h2>
    <p>Entró el pedido <strong>#${escapeHtml(orderNumber)}</strong> por <strong>${money(order.total)}</strong>.</p>
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
      <p style="margin: 4px 0;"><strong>Cliente:</strong> ${escapeHtml(customerName)}</p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(customer.email)}</p>
      <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${escapeHtml(customer.phone)}</p>
      <p style="margin: 4px 0;"><strong>Pago:</strong> ${escapeHtml(order.paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Transferencia')}</p>
      <p style="margin: 4px 0;"><strong>Productos:</strong> ${(order.items || []).map(i => `${Number(i.quantity) || 1}x ${escapeHtml(i.name)}`).join(', ')}</p>
    </div>
    ${cleanPhone ? button(`https://wa.me/${cleanPhone}`, 'Contactar al cliente por WhatsApp', '#128c7e') : ''}
    ${adminUrl ? button(adminUrl, 'Ver en el panel') : ''}
  `

  await sendEmail({
    to: adminEmail,
    subject: `Nueva venta: ${money(order.total)} - Pedido #${orderNumber} (${storeName})`,
    html: renderLayout({ tenant, title: 'Nueva venta', subtitle: 'Aviso de venta', body }),
    fromName: storeName
  })
}

export { escapeHtml, money }
