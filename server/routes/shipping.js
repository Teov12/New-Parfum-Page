import express from 'express'
import { quoteAndreaniShipping } from '../services/andreani.js'

const router = express.Router()

/**
 * POST /api/shipping/quote
 * Cotiza las opciones de Andreani para un código postal y monto de carrito
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

export default router
