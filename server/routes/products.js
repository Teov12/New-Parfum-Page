import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  getProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct
} from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { assertProductCapacity, seedStarterCatalog } from '../services/tenantService.js'

// Límite de perfumes del plan: responde 403 con el mensaje para el panel
const checkCapacity = async (req, res, adding) => {
  try {
    await assertProductCapacity(req.tenant, adding)
    return true
  } catch (err) {
    res.status(err.status || 403).json({ error: err.message, code: 'plan_limit' })
    return false
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
      const famLower = family.toLowerCase().trim()
      list = list.filter(p => {
        const pFam = p.fragranceFamily?.toLowerCase().trim() || ''
        return pFam === famLower || pFam.includes(famLower) || famLower.includes(pFam)
      })
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
    if (!(await checkCapacity(req, res, itemsToCreate.length))) return

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

// POST /api/products/seed-starter - Cargar catálogo base sugerido (protegido con requireAuth)
router.post('/seed-starter', requireAuth, async (req, res) => {
  try {
    const starterPath = path.join(__dirname, '..', 'data', 'starter-catalog.json')
    if (!fs.existsSync(starterPath)) {
      return res.status(404).json({ error: 'No se encontró el archivo de catálogo sugerido' })
    }
    const starterCount = JSON.parse(fs.readFileSync(starterPath, 'utf-8')).length
    if (!(await checkCapacity(req, res, starterCount))) return

    const created = await seedStarterCatalog(req.tenantId)
    res.status(201).json({
      success: true,
      count: created.length,
      message: `Se importaron ${created.length} perfumes recomendados con éxito`,
      created
    })
  } catch (err) {
    console.error('Error seeding starter catalog:', err)
    res.status(500).json({ error: 'Error al importar catálogo sugerido' })
  }
})

// POST /api/products/bulk-price-update - Actualización masiva de precios en lote (protegido con requireAuth)
router.post('/bulk-price-update', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId || 'gicca'
    const { 
      brand = 'all', 
      category = 'all', 
      adjustmentType = 'percentage', // 'percentage' | 'fixed'
      value = 0, 
      roundTo = 'hundred', // 'none' | 'hundred' | 'thousand'
      updateSizes = true 
    } = req.body

    const numValue = Number(value)
    if (isNaN(numValue) || numValue === 0) {
      return res.status(400).json({ error: 'El valor de ajuste debe ser distinto de 0' })
    }

    const allProducts = await getProducts(tenantId)
    let targets = allProducts

    if (brand && brand !== 'all') {
      const bLower = brand.toLowerCase().trim()
      targets = targets.filter(p => p.brand && p.brand.toLowerCase().trim() === bLower)
    }

    if (category && category !== 'all') {
      const cNorm = normalizeCategory(category)
      targets = targets.filter(p => normalizeCategory(p.category) === cNorm)
    }

    if (targets.length === 0) {
      return res.json({ 
        success: true, 
        count: 0, 
        message: 'No se encontraron perfumes que coincidan con los filtros seleccionados' 
      })
    }

    const applyAdjustment = (oldVal) => {
      if (oldVal === undefined || oldVal === null || isNaN(oldVal) || oldVal <= 0) return oldVal
      let newVal = Number(oldVal)
      if (adjustmentType === 'percentage') {
        newVal = newVal * (1 + (numValue / 100))
      } else if (adjustmentType === 'fixed') {
        newVal = newVal + numValue
      }
      newVal = Math.max(0, newVal)
      if (roundTo === 'hundred') {
        newVal = Math.round(newVal / 100) * 100
      } else if (roundTo === 'thousand') {
        newVal = Math.round(newVal / 1000) * 1000
      } else {
        newVal = Math.round(newVal)
      }
      return newVal
    }

    let updatedCount = 0
    const updatedProducts = []

    for (const prod of targets) {
      const newPrice = applyAdjustment(prod.price)
      const newTransfer = prod.transferPrice !== undefined && prod.transferPrice !== null
        ? applyAdjustment(prod.transferPrice)
        : Math.round(newPrice * 0.8)

      let newSizes = prod.sizes
      if (updateSizes && Array.isArray(prod.sizes) && prod.sizes.length > 0) {
        newSizes = prod.sizes.map(s => {
          const sPrice = applyAdjustment(s.price)
          const sTransfer = s.transferPrice !== undefined && s.transferPrice !== null
            ? applyAdjustment(s.transferPrice)
            : Math.round(sPrice * 0.8)
          return {
            ...s,
            price: sPrice,
            transferPrice: sTransfer
          }
        })
      }

      const updated = await updateProduct(prod.id, {
        price: newPrice,
        transferPrice: newTransfer,
        sizes: newSizes
      }, tenantId)

      if (updated) {
        updatedCount++
        updatedProducts.push(updated)
      }
    }

    res.json({
      success: true,
      count: updatedCount,
      message: `Se actualizaron los precios de ${updatedCount} perfumes con éxito`,
      products: updatedProducts
    })
  } catch (err) {
    console.error('Error in bulk price update:', err)
    res.status(500).json({ error: err.message || 'Error al procesar el ajuste masivo de precios' })
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
    if (!(await checkCapacity(req, res, 1))) return

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
