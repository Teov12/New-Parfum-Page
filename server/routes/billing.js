import express from 'express'
import { Tenant } from '../models/Tenant.js'
import { isMongoConnected } from '../dbConnection.js'
import { requireAuth, requireOwner } from '../middleware/auth.js'
import { PLAN_IDS, getPublicPlans, getStoreUrl, isBillingExempt } from '../config/platform.js'
import { getPlanSummary, countTenantProducts } from '../services/tenantService.js'
import {
  isBillingConfigured,
  createSubscription,
  syncPreapproval,
  syncAuthorizedPayment,
  cancelSubscription
} from '../services/billing.js'

const router = express.Router()

const loadTenant = async (req) => {
  if (!isMongoConnected()) return req.tenant
  return (await Tenant.findOne({ tenantId: req.tenantId }).lean()) || req.tenant
}

// GET /api/billing - Plan actual, prueba, límites y uso (dueño y equipo lo ven; solo el dueño lo cambia)
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenant = await loadTenant(req)
    res.json({
      ...getPlanSummary(tenant),
      usage: {
        products: await countTenantProducts(req.tenantId),
        staff: (tenant.staff || []).length
      },
      plans: getPublicPlans(),
      billingConfigured: isBillingConfigured()
    })
  } catch (err) {
    console.error('Error obteniendo plan:', err)
    res.status(500).json({ error: 'Error al obtener tu plan' })
  }
})

// POST /api/billing/subscribe - Iniciar (o cambiar) la suscripción mensual con Mercado Pago
router.post('/subscribe', requireOwner, async (req, res) => {
  try {
    const { plan } = req.body
    if (!PLAN_IDS.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido.' })
    }
    if (!isBillingConfigured()) {
      return res.status(503).json({ error: 'El cobro de suscripciones todavía no está habilitado en la plataforma. Escribinos para activarlo.' })
    }

    const tenant = await loadTenant(req)
    if (isBillingExempt(tenant)) {
      return res.status(400).json({ error: 'Esta tienda no requiere suscripción.' })
    }

    const payerEmail = String(req.body.payerEmail || tenant.adminUser?.email || '').trim()
    if (!payerEmail) {
      return res.status(400).json({ error: 'Indicá el email de tu cuenta de Mercado Pago.' })
    }

    const { initPoint } = await createSubscription({
      tenant,
      planId: plan,
      payerEmail,
      backUrl: `${getStoreUrl(tenant, req)}/admin/plan?suscripcion=ok`
    })
    res.json({ success: true, initPoint })
  } catch (err) {
    console.error('Error creando suscripción:', err)
    res.status(400).json({ error: err.message || 'No se pudo iniciar la suscripción' })
  }
})

// POST /api/billing/sync - Refrescar el estado al volver de Mercado Pago
router.post('/sync', requireOwner, async (req, res) => {
  try {
    const tenant = await loadTenant(req)
    const id = tenant.billing?.pendingPreapprovalId || tenant.billing?.preapprovalId
    if (id && isBillingConfigured()) {
      await syncPreapproval(id)
    }
    res.json(getPlanSummary(await loadTenant(req)))
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo actualizar el estado de la suscripción' })
  }
})

// POST /api/billing/cancel - Cancelar la suscripción (la tienda sigue online hasta el fin del período de gracia)
router.post('/cancel', requireOwner, async (req, res) => {
  try {
    const tenant = await loadTenant(req)
    await cancelSubscription(tenant)
    res.json({ success: true, message: 'Suscripción cancelada.' })
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo cancelar la suscripción' })
  }
})

// POST /api/billing/webhook - Notificaciones de Mercado Pago sobre suscripciones (cuenta de la plataforma)
router.post('/webhook', async (req, res) => {
  try {
    const type = req.query.type || req.query.topic || req.body?.type
    const id = req.query['data.id'] || req.body?.data?.id || req.query.id

    if (id && isBillingConfigured()) {
      // Se consulta siempre a la API de Mercado Pago: el contenido de la notificación no se usa como fuente
      if (type === 'subscription_preapproval' || type === 'preapproval') {
        await syncPreapproval(String(id))
      } else if (type === 'subscription_authorized_payment' || type === 'authorized_payment') {
        await syncAuthorizedPayment(String(id))
      }
    }
    res.status(200).send('OK')
  } catch (err) {
    console.error('[Billing Webhook]:', err.message)
    res.status(200).send('OK')
  }
})

export default router
