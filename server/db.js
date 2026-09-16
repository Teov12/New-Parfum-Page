import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Product } from './models/Product.js'
import { Order } from './models/Order.js'
import { SiteContent } from './models/SiteContent.js'
import { isMongoConnected } from './dbConnection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'products.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const SITE_CONTENT_FILE = path.join(DATA_DIR, 'site-content.json')

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Ensure products database file exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8')
}

// Ensure orders database file exists
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8')
}

// Ensure site content file exists
if (!fs.existsSync(SITE_CONTENT_FILE)) {
  fs.writeFileSync(SITE_CONTENT_FILE, JSON.stringify({
    heroSlides: [],
    mainCategories: [],
    olfactiveFamilies: [],
    editorial: {}
  }, null, 2), 'utf-8')
}

const formatProduct = (p) => {
  if (!p) return null
  const price = Number(p.price) || 0
  const costPrice = Number(p.costPrice) || Math.round(price * 0.45)
  const stock = p.stock !== undefined ? Math.max(0, Number(p.stock)) : 10
  return {
    ...p,
    stock,
    price,
    costPrice,
    profit: Math.max(0, price - costPrice),
    profitMargin: price > 0 ? Math.round(((price - costPrice) / price) * 100) : 0,
    sizes: (p.sizes || []).map(s => {
      const sPrice = typeof s === 'object' ? Number(s.price) || price : price
      const sCost = typeof s === 'object' && s.costPrice !== undefined ? Number(s.costPrice) : Math.round(sPrice * 0.45)
      return {
        size: typeof s === 'string' ? s : s.size,
        price: sPrice,
        costPrice: sCost,
        profit: Math.max(0, sPrice - sCost),
        profitMargin: sPrice > 0 ? Math.round(((sPrice - sCost) / sPrice) * 100) : 0,
        default: typeof s === 'object' ? Boolean(s.default) : false
      }
    })
  }
}

// ==========================================
// PRODUCTS CRUD
// ==========================================

export const getProducts = async () => {
  if (isMongoConnected()) {
    try {
      const list = await Product.find().sort({ createdAt: -1 }).lean()
      return list.map(formatProduct)
    } catch (err) {
      console.error('[DB] Error leyendo productos desde MongoDB:', err.message)
    }
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8')
    const list = JSON.parse(content || '[]')
    return list.map(formatProduct)
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

export const getProductByIdOrSlug = async (idOrSlug) => {
  if (isMongoConnected()) {
    try {
      const p = await Product.findOne({ $or: [{ id: idOrSlug }, { slug: idOrSlug }] }).lean()
      return p ? formatProduct(p) : null
    } catch (err) {
      console.error('[DB] Error buscando producto en MongoDB:', err.message)
    }
  }

  const products = await getProducts()
  return products.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null
}

export const createProduct = async (productData) => {
  const products = await getProducts()
  
  // Generate slug if not present
  const baseSlug = (productData.name || 'perfume')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  let slug = baseSlug
  let counter = 1
  while (products.some(p => p.slug === slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const price = Number(productData.price) || 0
  const costPrice = Number(productData.costPrice) || Math.round(price * 0.45)

  const rawSizes = Array.isArray(productData.sizes) && productData.sizes.length > 0
    ? productData.sizes
    : [{ size: '100 ml', price, costPrice, default: true }]

  const formattedSizes = rawSizes.map(s => {
    const sPrice = typeof s === 'object' ? Number(s.price) || price : price
    const sCost = typeof s === 'object' && s.costPrice !== undefined ? Number(s.costPrice) : costPrice
    return {
      size: typeof s === 'string' ? s : s.size,
      price: sPrice,
      costPrice: sCost,
      default: typeof s === 'object' ? Boolean(s.default) : true
    }
  })

  const newProduct = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    slug: productData.slug || slug,
    brand: productData.brand || 'Gicca',
    name: productData.name || '',
    concentration: productData.concentration || 'Eau de Parfum',
    gender: productData.gender || 'unisex',
    category: productData.category || 'disenador',
    fragranceFamily: productData.fragranceFamily || 'Floral',
    price,
    costPrice,
    originalPrice: Number(productData.originalPrice) || (price > 0 ? Math.round(price * 1.2) : 0),
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
    sizes: formattedSizes,
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
    stock: Number(productData.stock) || 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (isMongoConnected()) {
    try {
      const created = await Product.create(newProduct)
      return formatProduct(created.toObject())
    } catch (err) {
      console.error('[DB] Error creando producto en MongoDB:', err.message)
    }
  }

  products.unshift(newProduct)
  saveProducts(products)
  return formatProduct(newProduct)
}

export const updateProduct = async (id, updateData) => {
  if (isMongoConnected()) {
    try {
      const updated = await Product.findOneAndUpdate(
        { $or: [{ id }, { slug: id }] },
        { ...updateData, updatedAt: new Date().toISOString() },
        { new: true }
      ).lean()
      if (updated) return formatProduct(updated)
    } catch (err) {
      console.error('[DB] Error actualizando producto en MongoDB:', err.message)
    }
  }

  const products = await getProducts()
  const index = products.findIndex(p => p.id === id || p.slug === id)
  if (index === -1) return null

  const existing = products[index]
  const price = Number(updateData.price ?? existing.price)
  const costPrice = Number(updateData.costPrice ?? existing.costPrice)

  const updated = {
    ...existing,
    ...updateData,
    id: existing.id,
    price,
    costPrice,
    originalPrice: Number(updateData.originalPrice ?? existing.originalPrice),
    discountPercentage: Number(updateData.discountPercentage ?? existing.discountPercentage),
    isFeatured: Boolean(updateData.isFeatured ?? existing.isFeatured),
    isNew: Boolean(updateData.isNew ?? existing.isNew),
    isBestSeller: Boolean(updateData.isBestSeller ?? existing.isBestSeller),
    sizes: Array.isArray(updateData.sizes) ? updateData.sizes : existing.sizes,
    images: Array.isArray(updateData.images) ? updateData.images : existing.images,
    stock: Number(updateData.stock ?? existing.stock ?? 10),
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
  return formatProduct(updated)
}

export const deleteProduct = async (id) => {
  if (isMongoConnected()) {
    try {
      const res = await Product.findOneAndDelete({ $or: [{ id }, { slug: id }] })
      if (res) return true
    } catch (err) {
      console.error('[DB] Error eliminando producto en MongoDB:', err.message)
    }
  }

  const products = await getProducts()
  const index = products.findIndex(p => p.id === id || p.slug === id)
  if (index === -1) return false

  products.splice(index, 1)
  saveProducts(products)
  return true
}

// ==========================================
// ORDERS CRUD (TIENDA NUBE SYSTEM)
// ==========================================

export const getOrders = async () => {
  if (isMongoConnected()) {
    try {
      return await Order.find().sort({ createdAt: -1 }).lean()
    } catch (err) {
      console.error('[DB] Error leyendo pedidos desde MongoDB:', err.message)
    }
  }

  try {
    const content = fs.readFileSync(ORDERS_FILE, 'utf-8')
    return JSON.parse(content || '[]')
  } catch (err) {
    console.error('Error reading orders database:', err)
    return []
  }
}

export const saveOrders = (orders) => {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error writing orders database:', err)
    return false
  }
}

export const createOrder = async (orderData) => {
  const products = await getProducts()
  const incomingItems = Array.isArray(orderData.items) ? orderData.items : []
  
  let calculatedSubtotal = 0
  let calculatedTotalCost = 0
  const validatedItems = []

  for (const item of incomingItems) {
    const qty = Math.max(1, Number(item.quantity) || 1)
    
    // Buscar precio oficial en catálogo para evitar manipulación desde cliente
    const dbProduct = products.find(p => p.id === item.id || p.slug === item.id)
    let officialPrice = Number(item.price) || 0
    let officialCost = Number(item.costPrice) || Math.round(officialPrice * 0.45)

    if (dbProduct) {
      const dbSize = dbProduct.sizes?.find(s => s.size === item.size || s.size == item.size)
      if (dbSize && dbSize.price) {
        officialPrice = Number(dbSize.price)
        officialCost = Number(dbSize.costPrice) || Math.round(officialPrice * 0.45)
      } else if (dbProduct.price) {
        officialPrice = Number(dbProduct.price)
        officialCost = Number(dbProduct.costPrice) || Math.round(officialPrice * 0.45)
      }

      // Descontar inventario automáticamente
      if (isMongoConnected()) {
        try {
          await Product.findOneAndUpdate(
            { $or: [{ id: item.id }, { slug: item.id }] },
            { $inc: { stock: -qty } }
          )
        } catch (e) {}
      } else {
        const currentStock = dbProduct.stock !== undefined ? Math.max(0, Number(dbProduct.stock)) : 10
        dbProduct.stock = Math.max(0, currentStock - qty)
      }
    }

    calculatedSubtotal += officialPrice * qty
    calculatedTotalCost += officialCost * qty

    validatedItems.push({
      id: item.id,
      name: dbProduct?.name || item.name || 'Perfume',
      brand: dbProduct?.brand || item.brand || 'Gicca',
      size: item.size || '100 ml',
      quantity: qty,
      price: officialPrice,
      costPrice: officialCost
    })
  }

  if (!isMongoConnected()) {
    saveProducts(products)
  }

  const isTransfer = (orderData.paymentMethod || 'transfer') === 'transfer'
  const transferDiscount = isTransfer ? Math.round(calculatedSubtotal * 0.20) : 0
  const couponDiscount = Number(orderData.couponDiscount) || 0
  const discountAmount = transferDiscount + couponDiscount

  const shippingCost = Number(orderData.shippingCost) || 0
  const subtotal = calculatedSubtotal
  const total = Math.max(0, subtotal - discountAmount + shippingCost)
  const totalCost = calculatedTotalCost
  const profit = Math.max(0, (subtotal - discountAmount) - totalCost)
  const profitMargin = (subtotal - discountAmount) > 0 
    ? Math.round((profit / (subtotal - discountAmount)) * 100) 
    : 0

  const newOrder = {
    id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    orderNumber: orderData.orderNumber || `GIC-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString(),
    customer: {
      firstName: orderData.customer?.firstName || 'Cliente',
      lastName: orderData.customer?.lastName || '',
      phone: orderData.customer?.phone || '',
      email: orderData.customer?.email || '',
      dni: orderData.customer?.dni || '',
      address: orderData.customer?.address || '',
      apartment: orderData.customer?.apartment || '',
      city: orderData.customer?.city || 'Córdoba',
      province: orderData.customer?.province || 'Córdoba',
      postalCode: orderData.customer?.postalCode || ''
    },
    items: validatedItems,
    subtotal,
    shippingCost,
    discountAmount,
    transferDiscount,
    couponDiscount,
    total,
    totalCost,
    profit,
    profitMargin,
    shippingMethod: orderData.shippingMethod || 'Andreani Estándar a Domicilio',
    pickupBranch: orderData.pickupBranch || null,
    paymentMethod: orderData.paymentMethod || 'transfer',
    paymentStatus: orderData.paymentStatus || 'pending',
    fulfillmentStatus: orderData.fulfillmentStatus || 'unfulfilled',
    trackingCode: orderData.trackingCode || '',
    notes: '',
    source: orderData.source || 'web',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (isMongoConnected()) {
    try {
      const created = await Order.create(newOrder)
      return created.toObject()
    } catch (err) {
      console.error('[DB] Error creando pedido en MongoDB:', err.message)
    }
  }

  const orders = await getOrders()
  orders.unshift(newOrder)
  saveOrders(orders)
  return newOrder
}

export const updateOrder = async (id, updateData) => {
  if (isMongoConnected()) {
    try {
      const updated = await Order.findOneAndUpdate(
        { $or: [{ id }, { orderNumber: id }] },
        { ...updateData, updatedAt: new Date().toISOString() },
        { new: true }
      ).lean()
      if (updated) return updated
    } catch (err) {
      console.error('[DB] Error actualizando pedido en MongoDB:', err.message)
    }
  }

  const orders = await getOrders()
  const index = orders.findIndex(o => o.id === id || o.orderNumber === id)
  if (index === -1) return null

  const existing = orders[index]
  const updated = {
    ...existing,
    ...updateData,
    id: existing.id,
    orderNumber: existing.orderNumber,
    customer: {
      ...existing.customer,
      ...(updateData.customer || {})
    },
    updatedAt: new Date().toISOString()
  }

  orders[index] = updated
  saveOrders(orders)
  return updated
}

export const deleteOrder = async (id) => {
  if (isMongoConnected()) {
    try {
      const res = await Order.findOneAndDelete({ $or: [{ id }, { orderNumber: id }] })
      if (res) return true
    } catch (err) {
      console.error('[DB] Error eliminando pedido en MongoDB:', err.message)
    }
  }

  const orders = await getOrders()
  const index = orders.findIndex(o => o.id === id || o.orderNumber === id)
  if (index === -1) return false

  orders.splice(index, 1)
  saveOrders(orders)
  return true
}

// ==========================================
// SITE CONTENT & STATIC IMAGES MANAGEMENT
// ==========================================

export const getSiteContent = async () => {
  if (isMongoConnected()) {
    try {
      const doc = await SiteContent.findOne({ key: 'global_content' }).lean()
      if (doc) {
        return {
          heroSlides: Array.isArray(doc.heroSlides) ? doc.heroSlides : [],
          mainCategories: Array.isArray(doc.mainCategories) ? doc.mainCategories : [],
          olfactiveFamilies: Array.isArray(doc.olfactiveFamilies) ? doc.olfactiveFamilies : [],
          editorial: doc.editorial || {}
        }
      }
    } catch (err) {
      console.error('[DB] Error leyendo contenido desde MongoDB:', err.message)
    }
  }

  try {
    const content = fs.readFileSync(SITE_CONTENT_FILE, 'utf-8')
    const parsed = JSON.parse(content || '{}')
    return {
      heroSlides: Array.isArray(parsed.heroSlides) ? parsed.heroSlides : [],
      mainCategories: Array.isArray(parsed.mainCategories) ? parsed.mainCategories : [],
      olfactiveFamilies: Array.isArray(parsed.olfactiveFamilies) ? parsed.olfactiveFamilies : [],
      editorial: parsed.editorial || {}
    }
  } catch (err) {
    console.error('Error reading site content database:', err)
    return {
      heroSlides: [],
      mainCategories: [],
      olfactiveFamilies: [],
      editorial: {}
    }
  }
}

export const saveSiteContent = async (content) => {
  const current = await getSiteContent()
  const merged = {
    ...current,
    ...content,
    heroSlides: Array.isArray(content.heroSlides) ? content.heroSlides : current.heroSlides,
    mainCategories: Array.isArray(content.mainCategories) ? content.mainCategories : current.mainCategories,
    olfactiveFamilies: Array.isArray(content.olfactiveFamilies) ? content.olfactiveFamilies : current.olfactiveFamilies,
    editorial: content.editorial ? { ...current.editorial, ...content.editorial } : current.editorial,
    updatedAt: new Date().toISOString()
  }

  if (isMongoConnected()) {
    try {
      const updated = await SiteContent.findOneAndUpdate(
        { key: 'global_content' },
        { ...merged, key: 'global_content' },
        { upsert: true, new: true }
      ).lean()
      return updated
    } catch (err) {
      console.error('[DB] Error guardando contenido en MongoDB:', err.message)
    }
  }

  try {
    fs.writeFileSync(SITE_CONTENT_FILE, JSON.stringify(merged, null, 2), 'utf-8')
    return merged
  } catch (err) {
    console.error('Error saving site content database:', err)
    return null
  }
}

export const addCategory = async (categoryData) => {
  const content = await getSiteContent()
  const newCat = {
    id: categoryData.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title: categoryData.title || 'Nueva Categoría',
    subtitle: categoryData.subtitle || '',
    description: categoryData.description || '',
    link: categoryData.link || '/catalogo',
    image: categoryData.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85',
    badge: categoryData.badge || '',
    buttonText: categoryData.buttonText || 'Ver Colección',
    span: Number(categoryData.span) || 6,
    active: categoryData.active !== undefined ? Boolean(categoryData.active) : true,
    createdAt: new Date().toISOString()
  }
  content.mainCategories.push(newCat)
  await saveSiteContent(content)
  return newCat
}

export const updateCategory = async (id, categoryData) => {
  const content = await getSiteContent()
  const index = content.mainCategories.findIndex(c => c.id === id)
  if (index === -1) return null

  content.mainCategories[index] = {
    ...content.mainCategories[index],
    ...categoryData,
    id: content.mainCategories[index].id,
    updatedAt: new Date().toISOString()
  }
  await saveSiteContent(content)
  return content.mainCategories[index]
}

export const deleteCategory = async (id) => {
  const content = await getSiteContent()
  const index = content.mainCategories.findIndex(c => c.id === id)
  if (index === -1) return false

  content.mainCategories.splice(index, 1)
  await saveSiteContent(content)
  return true
}

export const addOlfactiveFamily = async (familyData) => {
  const content = await getSiteContent()
  const newFam = {
    id: familyData.id || `fam_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: familyData.name || 'Nueva Familia',
    description: familyData.description || '',
    image: familyData.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString()
  }
  content.olfactiveFamilies.push(newFam)
  await saveSiteContent(content)
  return newFam
}

export const updateOlfactiveFamily = async (id, familyData) => {
  const content = await getSiteContent()
  const index = content.olfactiveFamilies.findIndex(f => f.id === id || f.name?.toLowerCase() === id?.toLowerCase())
  if (index === -1) return null

  content.olfactiveFamilies[index] = {
    ...content.olfactiveFamilies[index],
    ...familyData,
    id: content.olfactiveFamilies[index].id,
    updatedAt: new Date().toISOString()
  }
  await saveSiteContent(content)
  return content.olfactiveFamilies[index]
}

export const deleteOlfactiveFamily = async (id) => {
  const content = await getSiteContent()
  const index = content.olfactiveFamilies.findIndex(f => f.id === id || f.name?.toLowerCase() === id?.toLowerCase())
  if (index === -1) return false

  content.olfactiveFamilies.splice(index, 1)
  await saveSiteContent(content)
  return true
}
