import express from 'express'
import {
  getSiteContent,
  saveSiteContent,
  addCategory,
  updateCategory,
  deleteCategory,
  addOlfactiveFamily,
  updateOlfactiveFamily,
  deleteOlfactiveFamily
} from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// GET /api/site-content (Público: para renderizar la web)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const content = await getSiteContent(tenantId)
    res.json(content)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener contenido del sitio' })
  }
})

// PUT /api/site-content (Admin: guardar todo el contenido o bloques específicos)
router.put('/', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const updated = await saveSiteContent(req.body, tenantId)
    if (!updated) {
      return res.status(500).json({ error: 'No se pudo guardar el contenido' })
    }
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar contenido' })
  }
})

// ==========================================
// CATEGORÍAS PRINCIPALES CRUD
// ==========================================

router.post('/categories', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const newCat = await addCategory(req.body, tenantId)
    res.status(201).json({ success: true, category: newCat })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al crear categoría' })
  }
})

router.put('/categories/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const updated = await updateCategory(req.params.id, req.body, tenantId)
    if (!updated) {
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }
    res.json({ success: true, category: updated })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar categoría' })
  }
})

router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const deleted = await deleteCategory(req.params.id, tenantId)
    if (!deleted) {
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }
    res.json({ success: true, message: 'Categoría eliminada' })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al eliminar categoría' })
  }
})

// ==========================================
// FAMILIAS OLFATIVAS CRUD
// ==========================================

router.post('/families', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const newFam = await addOlfactiveFamily(req.body, tenantId)
    res.status(201).json({ success: true, family: newFam })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al crear familia olfativa' })
  }
})

router.put('/families/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const updated = await updateOlfactiveFamily(req.params.id, req.body, tenantId)
    if (!updated) {
      return res.status(404).json({ error: 'Familia olfativa no encontrada' })
    }
    res.json({ success: true, family: updated })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar familia olfativa' })
  }
})

router.delete('/families/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const deleted = await deleteOlfactiveFamily(req.params.id, tenantId)
    if (!deleted) {
      return res.status(404).json({ error: 'Familia olfativa no encontrada' })
    }
    res.json({ success: true, message: 'Familia olfativa eliminada' })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al eliminar familia olfativa' })
  }
})

export default router
