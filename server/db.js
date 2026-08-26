import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'products.json')

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8')
}

export const getProducts = () => {
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8')
    return JSON.parse(content || '[]')
  } catch (err) {
    console.error('Error reading products database:', err)
    return []
  }
}

export const saveProducts = (products) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error writing products database:', err)
    return false
  }
}

export const getProductByIdOrSlug = (idOrSlug) => {
  const products = getProducts()
  return products.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null
}

export const createProduct = (productData) => {
  const products = getProducts()
  
  // Generate slug if not present
  const baseSlug = (productData.name || 'perfume')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  let slug = baseSlug
  let counter = 1
  while (products.some(p => p.slug === slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const newProduct = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    slug: productData.slug || slug,
    brand: productData.brand || 'Gicca',
    name: productData.name || '',
    concentration: productData.concentration || 'Eau de Parfum',
    gender: productData.gender || 'unisex',
    category: productData.category || 'disenador',
    fragranceFamily: productData.fragranceFamily || 'Floral',
    price: Number(productData.price) || 0,
    originalPrice: Number(productData.originalPrice) || 0,
    discountPercentage: Number(productData.discountPercentage) || 0,
    isFeatured: Boolean(productData.isFeatured),
    isNew: Boolean(productData.isNew),
    isBestSeller: Boolean(productData.isBestSeller),
    badge: productData.badge || '',
    shortDescription: productData.shortDescription || '',
    description: productData.description || '',
    images: Array.isArray(productData.images) && productData.images.length > 0 
      ? productData.images 
      : ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85'],
    sizes: Array.isArray(productData.sizes) && productData.sizes.length > 0
      ? productData.sizes
      : [{ size: '100 ml', price: Number(productData.price) || 0, default: true }],
    olfactoryPyramid: {
      topNotes: Array.isArray(productData.olfactoryPyramid?.topNotes) ? productData.olfactoryPyramid.topNotes : [],
      heartNotes: Array.isArray(productData.olfactoryPyramid?.heartNotes) ? productData.olfactoryPyramid.heartNotes : [],
      baseNotes: Array.isArray(productData.olfactoryPyramid?.baseNotes) ? productData.olfactoryPyramid.baseNotes : []
    },
    characteristics: {
      longevity: productData.characteristics?.longevity || '8 a 12 horas',
      sillage: productData.characteristics?.sillage || 'Moderada',
      season: productData.characteristics?.season || 'Todo el año',
      occasion: productData.characteristics?.occasion || 'Uso diario y ocasiones especiales'
    },
    usageTips: productData.usageTips || 'Pulverizar en puntos de pulso (cuello y muñecas).',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  products.unshift(newProduct)
  saveProducts(products)
  return newProduct
}

export const updateProduct = (id, updateData) => {
  const products = getProducts()
  const index = products.findIndex(p => p.id === id || p.slug === id)
  if (index === -1) return null

  const existing = products[index]
  const updated = {
    ...existing,
    ...updateData,
    id: existing.id, // preserve original id
    price: Number(updateData.price ?? existing.price),
    originalPrice: Number(updateData.originalPrice ?? existing.originalPrice),
    discountPercentage: Number(updateData.discountPercentage ?? existing.discountPercentage),
    isFeatured: Boolean(updateData.isFeatured ?? existing.isFeatured),
    isNew: Boolean(updateData.isNew ?? existing.isNew),
    isBestSeller: Boolean(updateData.isBestSeller ?? existing.isBestSeller),
    sizes: Array.isArray(updateData.sizes) ? updateData.sizes : existing.sizes,
    images: Array.isArray(updateData.images) ? updateData.images : existing.images,
    olfactoryPyramid: {
      ...existing.olfactoryPyramid,
      ...(updateData.olfactoryPyramid || {})
    },
    characteristics: {
      ...existing.characteristics,
      ...(updateData.characteristics || {})
    },
    updatedAt: new Date().toISOString()
  }

  products[index] = updated
  saveProducts(products)
  return updated
}

export const deleteProduct = (id) => {
  const products = getProducts()
  const index = products.findIndex(p => p.id === id || p.slug === id)
  if (index === -1) return false

  products.splice(index, 1)
  saveProducts(products)
  return true
}
