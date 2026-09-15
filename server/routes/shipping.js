import express from 'express'
import {
  quoteAndreaniShipping,
  getAndreaniBranches,
  createAndreaniShipment,
  getAndreaniTracking,
  checkAndreaniConnection
} from '../services/andreani.js'
import { getOrders, updateOrder } from '../db.js'

const router = express.Router()

/**
 * GET /api/shipping/status
 * Verifica el estado de conexión con la API de Andreani (Sandbox / Producción)
 */
router.get('/status', async (req, res) => {
  try {
    const status = await checkAndreaniConnection()
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar conexión con Andreani', message: err.message })
  }
})

/**
 * POST /api/shipping/quote
 * Cotiza las opciones de Andreani (domicilio, sucursal, urgente)
 */
router.post('/quote', async (req, res) => {
  try {
    const { postalCode, cartTotal, weightGrams, volumeCm3 } = req.body

    if (!postalCode) {
      return res.status(400).json({ error: 'El código postal es requerido' })
    }

    const result = await quoteAndreaniShipping({
      postalCode,
      cartTotal: Number(cartTotal) || 0,
      weightGrams: Number(weightGrams) || 500,
      volumeCm3: Number(volumeCm3) || 1000
    })

    res.json(result)
  } catch (err) {
    console.error('Error al cotizar con Andreani:', err.message)
    res.status(400).json({ error: err.message || 'Error al cotizar con Andreani' })
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

    const result = await quoteAndreaniShipping({
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

    const branches = await getAndreaniBranches(cp)
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

    const trackingInfo = await getAndreaniTracking(trackingCode)
    res.json(trackingInfo)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al consultar tracking' })
  }
})

/**
 * POST /api/shipping/generate
 * Genera la orden de despacho formal en Andreani para un pedido
 */
router.post('/generate', async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ error: 'El orderId es requerido' })
    }

    const orders = getOrders()
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId)

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    // Generar envío en Andreani
    const shipmentResult = await createAndreaniShipment(order)

    if (shipmentResult.success && shipmentResult.trackingCode) {
      // Actualizar la orden con el código de seguimiento
      updateOrder(order.id, {
        trackingCode: shipmentResult.trackingCode,
        fulfillmentStatus: 'shipped',
        shippingCarrier: 'Andreani',
        shippingLabelUrl: shipmentResult.labelUrl || ''
      })
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
