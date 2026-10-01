import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { clearTenantCache } from '../middleware/tenant.js'
import { PLATFORM, PLAN_IDS, getPlan, getDefaultTenantId } from '../config/platform.js'

/**
 * Suscripciones de las tiendas a la plataforma con Mercado Pago (API de preapproval).
 * Se cobran en la cuenta de Mercado Pago del dueño de la plataforma (PLATFORM_MP_ACCESS_TOKEN).
 * https://www.mercadopago.com.ar/developers/es/docs/subscriptions/overview
 */
const MP_API = 'https://api.mercadopago.com'

export const isBillingConfigured = () => Boolean(process.env.PLATFORM_MP_ACCESS_TOKEN?.trim())

const mpRequest = async (path, { method = 'GET', body } = {}) => {
  const token = process.env.PLATFORM_MP_ACCESS_TOKEN?.trim()
  if (!token) throw new Error('El cobro de suscripciones no está configurado (PLATFORM_MP_ACCESS_TOKEN).')

  const res = await fetch(`${MP_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || `Error de Mercado Pago (${res.status})`)
  }
  return data
}

const parseReference = (reference) => {
  const [tenantId, plan] = String(reference || '').split('|')
  return { tenantId, plan: PLAN_IDS.includes(plan) ? plan : null }
}

/**
 * Crea la suscripción mensual y devuelve el link de Mercado Pago donde el dueño la autoriza.
 */
export const createSubscription = async ({ tenant, planId, payerEmail, backUrl }) => {
  const plan = getPlan(planId)
  const preapproval = await mpRequest('/preapproval', {
    method: 'POST',
    body: {
      reason: `${PLATFORM.name} - Plan ${plan.name} (${tenant.name})`,
      external_reference: `${tenant.tenantId}|${plan.id}`,
      payer_email: payerEmail,
      back_url: backUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.price,
        currency_id: 'ARS'
      }
    }
  })

  await Tenant.updateOne(
    { tenantId: tenant.tenantId },
    { $set: { 'billing.pendingPlan': plan.id, 'billing.pendingPreapprovalId': preapproval.id } }
  )
  return { initPoint: preapproval.init_point, preapprovalId: preapproval.id }
}

/**
 * Aplica a la tienda el estado actual de una suscripción de Mercado Pago.
 */
export const syncPreapproval = async (preapprovalId) => {
  const preapproval = await mpRequest(`/preapproval/${encodeURIComponent(preapprovalId)}`)
  const { tenantId, plan } = parseReference(preapproval.external_reference)
  if (!tenantId) return null

  const tenant = await Tenant.findOne({ tenantId })
  if (!tenant) return null

  const previousId = tenant.billing?.preapprovalId
  if (preapproval.status === 'authorized') {
    tenant.billing.status = 'active'
    tenant.billing.preapprovalId = preapproval.id
    tenant.billing.pendingPlan = ''
    tenant.billing.pastDueSince = undefined
    if (preapproval.next_payment_date) tenant.billing.currentPeriodEnd = new Date(preapproval.next_payment_date)
    if (plan) tenant.plan = plan
    if (tenant.status === 'suspended' && tenant.suspendedReason !== 'manual') {
      tenant.status = 'active'
      tenant.suspendedReason = ''
    }
    if (tenant.status === 'trial') tenant.status = 'active'

    // Cambio de plan: se da de baja la suscripción anterior para no cobrar dos veces
    if (previousId && previousId !== preapproval.id) {
      mpRequest(`/preapproval/${encodeURIComponent(previousId)}`, { method: 'PUT', body: { status: 'cancelled' } })
        .catch(err => console.warn(`[Billing] No se pudo cancelar la suscripción anterior ${previousId}:`, err.message))
    }
  } else if (['paused', 'cancelled'].includes(preapproval.status) && preapproval.id === previousId) {
    tenant.billing.status = preapproval.status === 'cancelled' ? 'cancelled' : 'past_due'
    tenant.billing.pastDueSince = tenant.billing.pastDueSince || new Date()
  }

  await tenant.save()
  clearTenantCache()
  return tenant
}

/**
 * Registra un cobro mensual (authorized_payment) de una suscripción.
 */
export const syncAuthorizedPayment = async (authorizedPaymentId) => {
  const payment = await mpRequest(`/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`)
  if (!payment.preapproval_id) return null

  const tenant = await syncPreapproval(payment.preapproval_id)
  if (!tenant) return null

  const approved = payment.payment?.status === 'approved' || payment.status === 'processed'
  if (approved) {
    tenant.billing.lastPaymentAt = new Date(payment.debit_date || Date.now())
    tenant.billing.pastDueSince = undefined
    if (tenant.billing.status === 'past_due') tenant.billing.status = 'active'
  } else if (['rejected', 'cancelled'].includes(payment.payment?.status) || payment.status === 'recycling') {
    tenant.billing.status = 'past_due'
    tenant.billing.pastDueSince = tenant.billing.pastDueSince || new Date()
  }
  await tenant.save()
  clearTenantCache()
  return tenant
}

export const cancelSubscription = async (tenant) => {
  const id = tenant.billing?.preapprovalId
  if (id) {
    await mpRequest(`/preapproval/${encodeURIComponent(id)}`, { method: 'PUT', body: { status: 'cancelled' } })
  }
  await Tenant.updateOne(
    { tenantId: tenant.tenantId },
    { $set: { 'billing.status': 'cancelled', 'billing.pastDueSince': new Date() } }
  )
  clearTenantCache()
}

/**
 * Pausa las tiendas con la prueba vencida o el pago atrasado más allá de los días de gracia.
 */
export const enforceBilling = async () => {
  if (!isMongoConnected()) return 0
  const graceLimit = new Date(Date.now() - PLATFORM.graceDays * 86400000)
  const base = { tenantId: { $ne: getDefaultTenantId() }, status: { $ne: 'suspended' } }

  const expiredTrials = await Tenant.updateMany(
    { ...base, 'billing.status': 'trialing', 'billing.trialEndsAt': { $lt: graceLimit } },
    { $set: { status: 'suspended', suspendedReason: 'trial_expired' } }
  )
  const unpaid = await Tenant.updateMany(
    { ...base, 'billing.status': { $in: ['past_due', 'cancelled'] }, 'billing.pastDueSince': { $lt: graceLimit } },
    { $set: { status: 'suspended', suspendedReason: 'billing' } }
  )

  const total = (expiredTrials.modifiedCount || 0) + (unpaid.modifiedCount || 0)
  if (total > 0) clearTenantCache()
  return total
}
