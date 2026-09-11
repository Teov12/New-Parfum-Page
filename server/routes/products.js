import express from 'express'
import {
  getProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct,
  saveProducts
} from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// GET /api/products - List all products with optional filters (público)
router.get('/', (req, res) => {
  try {
    let list = getProducts()
    const { gender, category, family, brand, q } = req.query

    if (gender) {
      list = list.filter(p => p.gender === gender)
    }
    if (category) {
      list = list.filter(p => p.category === category)
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
router.get('/stats', (req, res) => {
  try {
    const list = getProducts()
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
router.get('/:idOrSlug', (req, res) => {
  try {
    const product = getProductByIdOrSlug(req.params.idOrSlug)
    if (!product) {
      return res.status(404).json({ error: 'Perfume no encontrado' })
    }
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el perfume' })
  }
})

// POST /api/products - Create new product (protegido con requireAuth)
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, brand, price } = req.body
    if (!name || !brand || price === undefined) {
      return res.status(400).json({ error: 'Nombre, marca y precio son obligatorios' })
    }

    const newProduct = createProduct(req.body)
    res.status(201).json(newProduct)
  } catch (err) {
    console.error('Error creating product:', err)
    res.status(500).json({ error: 'Error al guardar el perfume' })
  }
})

// PUT /api/products/:id - Update product (protegido con requireAuth)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const updated = updateProduct(req.params.id, req.body)
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
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const deleted = deleteProduct(req.params.id)
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
