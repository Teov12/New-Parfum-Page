import express from 'express'
import {
  getProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct
} from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

const normalizeGender = (g) => {
  if (!g) return ''
  const val = String(g).toLowerCase().trim()
  if (['woman', 'mujer', 'femenino', 'mujeres', 'female', 'f'].includes(val)) return 'woman'
  if (['man', 'hombre', 'masculino', 'hombres', 'male', 'm'].includes(val)) return 'man'
  if (['unisex', 'ambos', 'todos', 'all'].includes(val)) return 'unisex'
  return val
}

const normalizeCategory = (c) => {
  if (!c) return ''
  const val = String(c).toLowerCase().trim()
  if (['arabe', 'arabes', 'árabe', 'árabes'].includes(val)) return 'arabe'
  if (['disenador', 'diseñador', 'designer', 'diseñadores'].includes(val)) return 'disenador'
  if (['nicho', 'niche'].includes(val)) return 'nicho'
  return val
}

// GET /api/products - List all products with optional filters (público)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    let list = await getProducts(tenantId)
    const { gender, category, family, brand, q } = req.query

    if (gender) {
      const gNorm = normalizeGender(gender)
      list = list.filter(p => normalizeGender(p.gender) === gNorm)
    }
    if (category) {
      const cNorm = normalizeCategory(category)
      list = list.filter(p => normalizeCategory(p.category) === cNorm)
    }
    if (family) {
      list = list.filter(p => p.fragranceFamily?.toLowerCase() === family.toLowerCase())
    }
    if (brand) {
      list = list.filter(p => p.brand?.toLowerCase() === brand.toLowerCase())
    }
    if (q) {
      const search = q.toLowerCase().trim()
      list = list.filter(p => 
        p.name?.toLowerCase().includes(search) ||
        p.brand?.toLowerCase().includes(search) ||
        p.fragranceFamily?.toLowerCase().includes(search) ||
        p.olfactoryPyramid?.topNotes?.some(n => n.toLowerCase().includes(search)) ||
        p.olfactoryPyramid?.heartNotes?.some(n => n.toLowerCase().includes(search)) ||
        p.olfactoryPyramid?.baseNotes?.some(n => n.toLowerCase().includes(search))
      )
    }

    res.json(list)
  } catch (err) {
    console.error('Error fetching products:', err)
    res.status(500).json({ error: 'Error al obtener los perfumes' })
  }
})

// GET /api/products/stats - Dashboard summary metrics (público)
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const list = await getProducts(tenantId)
    const brandsSet = new Set(list.map(p => p.brand).filter(Boolean))
    const totalRevenue = list.reduce((acc, p) => acc + (Number(p.price) || 0), 0)

    res.json({
      totalProducts: list.length,
      totalBrands: brandsSet.size,
      featuredCount: list.filter(p => p.isFeatured).length,
      bestSellerCount: list.filter(p => p.isBestSeller).length,
      averagePrice: list.length > 0 ? Math.round(totalRevenue / list.length) : 0
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

// GET /api/products/:idOrSlug - Get single product (público)
router.get('/:idOrSlug', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const product = await getProductByIdOrSlug(req.params.idOrSlug, tenantId)
    if (!product) {
      return res.status(404).json({ error: 'Perfume no encontrado' })
    }
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el perfume' })
  }
})

// POST /api/products/bulk - Bulk create products (protegido con requireAuth)
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const { products: itemsToCreate } = req.body
    if (!Array.isArray(itemsToCreate) || itemsToCreate.length === 0) {
      return res.status(400).json({ error: 'La lista de perfumes es requerida' })
    }

    const created = []
    const errors = []

    for (let i = 0; i < itemsToCreate.length; i++) {
      const item = itemsToCreate[i]
      if (!item || !item.name || !item.brand || item.price === undefined) {
        errors.push({
          index: i,
          name: item?.name || `Fila ${i + 1}`,
          error: 'Nombre, marca y precio son obligatorios'
        })
        continue
      }
      try {
        const prod = await createProduct(item, tenantId)
        created.push(prod)
      } catch (err) {
        errors.push({
          index: i,
          name: item.name,
          error: err.message || 'Error al guardar el perfume'
        })
      }
    }

    res.status(201).json({
      success: true,
      count: created.length,
      errorsCount: errors.length,
      created,
      errors
    })
  } catch (err) {
    console.error('Error in bulk import:', err)
    res.status(500).json({ error: 'Error al procesar la importación masiva de perfumes' })
  }
})

// POST /api/products - Create new product (protegido con requireAuth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const { name, brand, price } = req.body
    if (!name || !brand || price === undefined) {
      return res.status(400).json({ error: 'Nombre, marca y precio son obligatorios' })
    }

    const newProduct = await createProduct(req.body, tenantId)
    res.status(201).json(newProduct)
  } catch (err) {
    console.error('Error creating product:', err)
    res.status(500).json({ error: 'Error al guardar el perfume' })
  }
})

// PUT /api/products/:id - Update product (protegido con requireAuth)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const updated = await updateProduct(req.params.id, req.body, tenantId)
    if (!updated) {
      return res.status(404).json({ error: 'Perfume no encontrado para actualizar' })
    }
    res.json(updated)
  } catch (err) {
    console.error('Error updating product:', err)
    res.status(500).json({ error: 'Error al actualizar el perfume' })
  }
})

// DELETE /api/products/:id - Delete product (protegido con requireAuth)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const deleted = await deleteProduct(req.params.id, tenantId)
    if (!deleted) {
      return res.status(404).json({ error: 'Perfume no encontrado para eliminar' })
    }
    res.json({ success: true, message: 'Perfume eliminado con éxito' })
  } catch (err) {
    console.error('Error deleting product:', err)
    res.status(500).json({ error: 'Error al eliminar el perfume' })
  }
})

export default router
