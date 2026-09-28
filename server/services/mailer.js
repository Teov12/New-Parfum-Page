/**
 * Servicio de Notificaciones Transaccionales por Correo Electrónico
 * Soporta configuración SMTP personalizada y modo seguro (fallbacks sin caídas de checkout).
 */
import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })
}

/**
 * Envía un correo con fallback a log de auditoría
 */
async function sendMail({ to, subject, html, replyTo, fromName }) {
  const transporter = createTransporter()
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@giccaperfumes.com.ar'
  const fullFrom = `${fromName || 'Perfumería'} <${fromAddress}>`

  if (!transporter) {
    console.log(`[Mailer:Simulado] Para: ${to} | Asunto: ${subject}`)
    return { success: true, simulated: true }
  }

  try {
    const info = await transporter.sendMail({
      from: fullFrom,
      to,
      subject,
      html,
      replyTo: replyTo || fromAddress
    })
    console.log(`[Mailer] Correo enviado exitosamente a ${to}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error(`[Mailer] Error al enviar correo a ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Plantilla de confirmación de orden para el comprador
 */
export async function sendOrderConfirmationEmail({ order, tenant }) {
  if (!order || !order.customer?.email) return

  const storeName = tenant?.name || 'Gicca Perfumes'
  const orderNumber = order.orderNumber || order.id || 'N/A'
  const items = order.items || []
  const total = Number(order.totalAmount || order.total || 0).toLocaleString('es-AR')
  const customerName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Cliente'
  const paymentMethod = order.paymentMethod || 'transferencia'
  const isTransfer = paymentMethod.toLowerCase().includes('transfer')
  
  const bankDetails = tenant?.commercial || {}
  const whatsappNumber = (tenant?.branding?.whatsappNumber || '5493564622055').replace(/[^0-9]/g, '')
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola%20${encodeURIComponent(storeName)}%2C%20adjunto%20el%20comprobante%20de%20mi%20pedido%20%23${orderNumber}`

  const itemsHtml = items.map(item => `
    <tr style="border-bottom: 1px solid #eeeeee;">
      <td style="padding: 12px 0; font-family: sans-serif; font-size: 14px; color: #2e1911;">
        <strong>${item.name || item.title || 'Perfume'}</strong>
        <div style="font-size: 12px; color: #777777;">Marca: ${item.brand || 'Original'} • Tamaño: ${item.size || '100 ml'}</div>
      </td>
      <td style="padding: 12px 0; text-align: center; font-family: sans-serif; font-size: 14px; color: #555555;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 12px 0; text-align: right; font-family: sans-serif; font-size: 14px; font-weight: bold; color: #2e1911;">
        $${Number((item.price || 0) * (item.quantity || 1)).toLocaleString('es-AR')}
      </td>
    </tr>
  `).join('')

  const transferBoxHtml = isTransfer ? `
    <div style="background-color: #fcf7f1; border: 1px solid #e7ded4; border-radius: 10px; padding: 20px; margin: 25px 0;">
      <h3 style="margin-top: 0; font-family: sans-serif; font-size: 15px; text-transform: uppercase; color: #2e1911; letter-spacing: 0.05em;">
        Datos para Transferencia Bancaria
      </h3>
      <p style="font-size: 13px; color: #555555; margin-bottom: 12px;">
        Tu pedido quedará confirmado una vez recibido el comprobante.
      </p>
      <table style="width: 100%; font-family: sans-serif; font-size: 13px; color: #333333;">
        <tr><td style="padding: 4px 0; font-weight: bold;">Alias:</td><td>${bankDetails.alias || 'GICCA.PERFUMES.MP'}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">CBU / CVU:</td><td>${bankDetails.cbu || '0000003100010000000000'}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Banco:</td><td>${bankDetails.bankName || 'Mercado Pago'}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Titular:</td><td>${bankDetails.accountHolder || storeName}</td></tr>
      </table>
      <div style="margin-top: 18px; text-align: center;">
        <a href="${whatsappUrl}" style="display: inline-block; background-color: #128c7e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 25px; font-family: sans-serif; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
          Enviar Comprobante por WhatsApp
        </a>
      </div>
    </div>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmación de Pedido</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f5f2; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #2e1911; padding: 35px 30px; text-align: center;">
                  <h1 style="color: #ffffff; font-family: serif; font-size: 26px; font-weight: normal; margin: 0; letter-spacing: 0.08em; text-transform: uppercase;">
                    ${storeName}
                  </h1>
                  <p style="color: #d4af37; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; margin: 8px 0 0 0;">
                    Confirmación de Compra
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 35px 35px 25px 35px;">
                  <h2 style="font-size: 20px; color: #2e1911; margin-top: 0; font-family: serif;">
                    ¡Muchas gracias por tu compra, ${customerName}!
                  </h2>
                  <p style="font-size: 14px; color: #555555; line-height: 1.6;">
                    Hemos registrado tu pedido con el número <strong>#${orderNumber}</strong>. A continuación encontrarás el resumen de tu compra.
                  </p>

                  <!-- Tabla de Productos -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 25px; border-top: 1px solid #eeeeee;">
                    <thead>
                      <tr style="border-bottom: 2px solid #eeeeee;">
                        <th style="padding: 10px 0; text-align: left; font-size: 11px; text-transform: uppercase; color: #888888; font-weight: bold; letter-spacing: 0.08em;">Perfume</th>
                        <th style="padding: 10px 0; text-align: center; font-size: 11px; text-transform: uppercase; color: #888888; font-weight: bold; letter-spacing: 0.08em;">Cant.</th>
                        <th style="padding: 10px 0; text-align: right; font-size: 11px; text-transform: uppercase; color: #888888; font-weight: bold; letter-spacing: 0.08em;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding: 15px 0 5px 0; text-align: right; font-size: 14px; color: #555555;">Envío (Andreani):</td>
                        <td style="padding: 15px 0 5px 0; text-align: right; font-size: 14px; color: #2e1911; font-weight: bold;">
                          ${Number(order.shippingCost || 0) === 0 ? '¡Gratis!' : `$${Number(order.shippingCost || 0).toLocaleString('es-AR')}`}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 5px 0; text-align: right; font-size: 16px; color: #2e1911; font-weight: bold;">Total Final:</td>
                        <td style="padding: 5px 0; text-align: right; font-size: 18px; color: #2e1911; font-weight: bold;">
                          $${total}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  ${transferBoxHtml}

                  <!-- Datos de Envío -->
                  <div style="background-color: #fbfbfb; border: 1px solid #f0f0f0; border-radius: 8px; padding: 15px 20px; margin-top: 25px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #444444; letter-spacing: 0.05em;">
                      Dirección de Entrega
                    </h4>
                    <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">
                      ${order.shipping?.street || ''} ${order.shipping?.streetNumber || ''}, ${order.shipping?.city || ''}<br />
                      Provincia de ${order.shipping?.province || ''} (CP: ${order.shipping?.postalCode || ''})<br />
                      Teléfono de contacto: ${order.customer?.phone || 'No indicado'}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #fcf7f1; padding: 25px 30px; text-align: center; border-top: 1px solid #eee4d9;">
                  <p style="margin: 0; font-size: 12px; color: #777777;">
                    ${storeName} • Alta Perfumería & Fragancias de Selección
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #999999;">
                    Si tienes dudas sobre tu pedido, puedes contactarnos directamente respondiendo a este mensaje o por WhatsApp.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  await sendMail({
    to: order.customer.email,
    subject: `Confirmación de Pedido #${orderNumber} en ${storeName}`,
    html,
    fromName: storeName
  })
}

/**
 * Notificación interna para el dueño de la perfumería cuando entra un pedido
 */
export async function sendStoreOwnerNewOrderAlert({ order, tenant }) {
  const storeName = tenant?.name || 'Gicca Perfumes'
  const adminEmail = tenant?.commercial?.notificationEmail || process.env.STORE_ADMIN_EMAIL
  if (!adminEmail) return

  const orderNumber = order.orderNumber || order.id || 'N/A'
  const total = Number(order.totalAmount || order.total || 0).toLocaleString('es-AR')
  const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Cliente'
  const customerPhone = order.customer?.phone || ''
  const customerEmail = order.customer?.email || ''
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background-color: #f7f7f7; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e0e0e0;">
        <h2 style="color: #2e1911; margin-top: 0;">¡Nueva Venta Recibida!</h2>
        <p style="font-size: 16px; color: #333333;">
          Se ha generado el pedido <strong>#${orderNumber}</strong> en tu tienda <strong>${storeName}</strong> por un total de <strong>$${total}</strong>.
        </p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px;">
          <p style="margin: 4px 0;"><strong>Cliente:</strong> ${customerName}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${customerEmail}</p>
          <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${customerPhone}</p>
          <p style="margin: 4px 0;"><strong>Método de Pago:</strong> ${order.paymentMethod || 'Transferencia'}</p>
          <p style="margin: 4px 0;"><strong>Items:</strong> ${(order.items || []).length} productos</p>
        </div>

        ${cleanPhone ? `
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://wa.me/${cleanPhone}" style="background-color: #128c7e; color: white; padding: 12px 25px; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-block;">
              Contactar al Cliente por WhatsApp
            </a>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `

  await sendMail({
    to: adminEmail,
    subject: `Nueva Venta: $${total} - Pedido #${orderNumber} (${storeName})`,
    html,
    fromName: storeName
  })
}
