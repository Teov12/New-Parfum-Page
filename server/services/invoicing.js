import Afip from '@afipsdk/afip.js'
import { getTenantLimits } from '../config/platform.js'
import { decryptSecret } from './secrets.js'

/**
 * Facturación electrónica ARCA (ex AFIP) con Afip SDK (https://afipsdk.com).
 * - Monotributo: Factura C (CbteTipo 11)
 * - Responsable Inscripto vendiendo a consumidor final: Factura B (CbteTipo 6) con IVA 21% incluido
 * Requiere el certificado y la clave privada de ARCA de la tienda y un access token de Afip SDK.
 */

export class InvoiceError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

const round2 = (n) => Math.round(Number(n) * 100) / 100
const onlyDigits = (value) => String(value || '').replace(/\D/g, '')

// Fecha de hoy en Argentina en formato AAAAMMDD
const todayInArgentina = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return parts.replace(/-/g, '')
}

export const isInvoicingReady = (tenant) => {
  const inv = tenant?.invoicing || {}
  return Boolean(inv.enabled && onlyDigits(inv.cuit).length === 11 && Number(inv.pointOfSale) > 0)
}

/**
 * Arma el comprobante para el web service de facturación (WSFE).
 */
export const buildVoucherData = ({ order, invoicing }) => {
  const isResponsableInscripto = invoicing.taxCondition === 'responsable_inscripto'
  const total = round2(order.total)
  if (!(total > 0)) throw new InvoiceError('El pedido no tiene importe para facturar.')

  // Identificación del comprador: DNI (96), CUIT/CUIL (80) o consumidor final sin identificar (99)
  const doc = onlyDigits(order.customer?.dni)
  const docTipo = doc.length === 11 ? 80 : (doc.length >= 7 && doc.length <= 8 ? 96 : 99)

  const data = {
    CantReg: 1,
    PtoVta: Number(invoicing.pointOfSale),
    CbteTipo: isResponsableInscripto ? 6 : 11,
    Concepto: 1, // Productos
    DocTipo: docTipo,
    DocNro: docTipo === 99 ? 0 : Number(doc),
    CbteFch: Number(todayInArgentina()),
    ImpTotal: total,
    ImpTotConc: 0,
    ImpOpEx: 0,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
    CondicionIVAReceptorId: 5 // Consumidor final
  }

  if (isResponsableInscripto) {
    const neto = round2(total / 1.21)
    const iva = round2(total - neto)
    data.ImpNeto = neto
    data.ImpIVA = iva
    data.Iva = [{ Id: 5, BaseImp: neto, Importe: iva }] // 21%
  } else {
    data.ImpNeto = total
    data.ImpIVA = 0
  }
  return data
}

/**
 * Emite la factura de un pedido y devuelve los datos para guardar en order.invoice.
 */
export const issueInvoice = async ({ tenant, order }) => {
  if (!getTenantLimits(tenant).invoicing) {
    throw new InvoiceError('La facturación electrónica está disponible desde el plan Profesional.', 403)
  }
  const invoicing = tenant.invoicing || {}
  if (!isInvoicingReady(tenant)) {
    throw new InvoiceError('Configurá la facturación (CUIT, punto de venta y certificado) en Admin > Facturación.')
  }
  if (order.invoice?.cae) {
    throw new InvoiceError(`El pedido ya tiene la factura ${order.invoice.type} ${order.invoice.number}.`, 409)
  }
  if (['cancelled', 'refunded'].includes(order.paymentStatus)) {
    throw new InvoiceError('No se puede facturar un pedido cancelado o reintegrado.')
  }

  const accessToken = decryptSecret(invoicing.afipSdkToken)
  if (!accessToken) {
    throw new InvoiceError('Falta el access token de Afip SDK (afipsdk.com).')
  }

  const data = buildVoucherData({ order, invoicing })
  const afip = new Afip({
    CUIT: Number(onlyDigits(invoicing.cuit)),
    production: Boolean(invoicing.production),
    cert: invoicing.certificate || undefined,
    key: decryptSecret(invoicing.privateKey) || undefined,
    access_token: accessToken
  })

  let result
  try {
    result = await afip.ElectronicBilling.createNextVoucher(data)
  } catch (err) {
    const detail = err.data?.message || err.message || 'Error de ARCA'
    throw new InvoiceError(`ARCA rechazó la factura: ${detail}`, 502)
  }

  return {
    type: data.CbteTipo === 6 ? 'B' : 'C',
    cbteTipo: data.CbteTipo,
    pointOfSale: data.PtoVta,
    number: result.voucherNumber,
    cae: result.CAE,
    caeExpiresAt: result.CAEFchVto,
    issuedAt: new Date(),
    total: data.ImpTotal,
    production: Boolean(invoicing.production),
    error: ''
  }
}
