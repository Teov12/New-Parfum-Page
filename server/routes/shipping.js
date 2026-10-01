import express from 'express'
import {
  getAndreaniConfig,
  getAndreaniBranches,
  createAndreaniShipment,
  getAndreaniTracking,
  checkAndreaniConnection
} from '../services/andreani.js'
import { quoteShippingOptions } from '../services/shippingQuote.js'
import { getOrderByIdOrNumber, updateOrder } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/shipping/status
 * Verifica el estado de conexión con la API de Andreani (Sandbox / Producción) de la tienda actual
 */
router.get('/status', async (req, res) => {
  try {
    const status = await checkAndreaniConnection(getAndreaniConfig(req.tenant))
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar conexión con Andreani', message: err.message })
  }
})

/**
 * POST /api/shipping/quote
 * Cotiza las opciones de envío de la tienda (Andreani + métodos propios)
 */
router.post('/quote', async (req, res) => {
  try {
    const { postalCode, cartTotal } = req.body

    if (!postalCode) {
      return res.status(400).json({ error: 'El código postal es requerido' })
    }

    const result = await quoteShippingOptions({
      tenant: req.tenant,
      postalCode,
      cartTotal: Number(cartTotal) || 0
    })

    res.json(result)
  } catch (err) {
    console.error('Error al cotizar envío:', err.message)
    res.status(400).json({ error: err.message || 'Error al cotizar el envío' })
  }
})

/**
 * GET /api/shipping/estimate
 * Consulta rápida de cotización por query param
 */
router.get('/estimate', async (req, res) => {
  try {
    const { cp, total } = req.query
    if (!cp) {
      return res.status(400).json({ error: 'El parámetro cp es requerido' })
    }

    const result = await quoteShippingOptions({
      tenant: req.tenant,
      postalCode: cp,
      cartTotal: Number(total) || 0
    })

    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error al cotizar envío' })
  }
})

/**
 * GET /api/shipping/sucursales
 * Lista de sucursales Andreani cercanas según el código postal
 */
router.get('/sucursales', async (req, res) => {
  try {
    const { cp } = req.query
    if (!cp) {
      return res.status(400).json({ error: 'El código postal es requerido' })
    }

    const branches = await getAndreaniBranches(cp, getAndreaniConfig(req.tenant))
    res.json({
      success: true,
      postalCode: cp,
      branches
    })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error al buscar sucursales' })
  }
})

/**
 * GET /api/shipping/tracking/:trackingCode
 * Consulta la trazabilidad en tiempo real de un envío
 */
router.get('/tracking/:trackingCode', async (req, res) => {
  try {
    const { trackingCode } = req.params
    if (!trackingCode) {
      return res.status(400).json({ error: 'Código de tracking requerido' })
    }

    const trackingInfo = await getAndreaniTracking(trackingCode, getAndreaniConfig(req.tenant))
    res.json(trackingInfo)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al consultar tracking' })
  }
})

/**
 * POST /api/shipping/generate
 * Genera la orden de despacho formal en Andreani para un pedido de la tienda actual
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ error: 'El orderId es requerido' })
    }

    const order = await getOrderByIdOrNumber(orderId, req.tenantId)
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    // Generar envío en Andreani con la cuenta de la tienda
    const shipmentResult = await createAndreaniShipment(order, getAndreaniConfig(req.tenant))

    if (shipmentResult.success && shipmentResult.trackingCode) {
      // Actualizar la orden con el código de seguimiento
      await updateOrder(order.id, {
        trackingCode: shipmentResult.trackingCode,
        fulfillmentStatus: 'shipped',
        shippingCarrier: 'Andreani',
        shippingLabelUrl: shipmentResult.labelUrl || ''
      }, req.tenantId)
    }

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      trackingCode: shipmentResult.trackingCode,
      labelUrl: shipmentResult.labelUrl,
      live: shipmentResult.live,
      note: shipmentResult.note
    })
  } catch (err) {
    console.error('Error al generar envío en Andreani:', err)
    res.status(500).json({ error: err.message || 'Error al procesar el despacho con Andreani' })
  }
})

export default router
