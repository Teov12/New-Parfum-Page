import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
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
  const transferPrice = Number(p.transferPrice) || (price > 0 ? Math.round(price * 0.8) : 0)
  const costPrice = Number(p.costPrice) || Math.round(price * 0.45)
  const stock = p.stock !== undefined ? Math.max(0, Number(p.stock)) : 10
  return {
    ...p,
    stock,
    price,
    transferPrice,
    costPrice,
    profit: Math.max(0, (transferPrice || price) - costPrice),
    profitMargin: (transferPrice || price) > 0 ? Math.round((((transferPrice || price) - costPrice) / (transferPrice || price)) * 100) : 0,
    sizes: (p.sizes || []).map(s => {
      const sPrice = typeof s === 'object' ? Number(s.price) || price : price
      const sTransfer = typeof s === 'object' && s.transferPrice !== undefined && s.transferPrice !== null
        ? Number(s.transferPrice)
        : (sPrice > 0 ? Math.round(sPrice * 0.8) : 0)
      const sCost = typeof s === 'object' && s.costPrice !== undefined ? Number(s.costPrice) : Math.round(sPrice * 0.45)
      return {
        size: typeof s === 'string' ? s : s.size,
        price: sPrice,
        transferPrice: sTransfer,
        costPrice: sCost,
        profit: Math.max(0, (sTransfer || sPrice) - sCost),
        profitMargin: (sTransfer || sPrice) > 0 ? Math.round((((sTransfer || sPrice) - sCost) / (sTransfer || sPrice)) * 100) : 0,
        ...(typeof s === 'object' && typeof s.stock === 'number' ? { stock: Math.max(0, s.stock) } : {}),
        default: typeof s === 'object' ? Boolean(s.default) : false
      }
    })
  }
}

// ==========================================
// PRODUCTS CRUD
// ==========================================

export const getProducts = async (tenantId = 'gicca') => {
  if (isMongoConnected()) {
    try {
      const query = tenantId ? { tenantId } : {}
      const list = await Product.find(query).sort({ createdAt: -1 }).lean()
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

export const getProductByIdOrSlug = async (idOrSlug, tenantId = 'gicca') => {
  if (isMongoConnected()) {
    try {
      const conditions = [{ id: idOrSlug }, { slug: idOrSlug }]
      if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        conditions.push({ _id: idOrSlug })
      }
      const query = tenantId ? { tenantId, $or: conditions } : { $or: conditions }
      const p = await Product.findOne(query).lean()
      return p ? formatProduct(p) : null
    } catch (err) {
      console.error('[DB] Error buscando producto en MongoDB:', err.message)
    }
  }

  const products = await getProducts(tenantId)
  return products.find(p => p.id === idOrSlug || p.slug === idOrSlug || p._id === idOrSlug) || null
}

export const createProduct = async (productData, tenantId = 'gicca') => {
  const products = await getProducts(tenantId)
  
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
  const transferPrice = Number(productData.transferPrice) || (price > 0 ? Math.round(price * 0.8) : 0)
  const costPrice = Number(productData.costPrice) || Math.round(price * 0.45)

  const rawSizes = Array.isArray(productData.sizes) && productData.sizes.length > 0
    ? productData.sizes
    : [{ size: '100 ml', price, transferPrice, costPrice, default: true }]

  const formattedSizes = rawSizes.map(s => {
    const sPrice = typeof s === 'object' ? Number(s.price) || price : price
    const sTransfer = typeof s === 'object' && s.transferPrice !== undefined && s.transferPrice !== null
      ? Number(s.transferPrice)
      : (sPrice > 0 ? Math.round(sPrice * 0.8) : transferPrice)
    const sCost = typeof s === 'object' && s.costPrice !== undefined ? Number(s.costPrice) : costPrice
    return {
      size: typeof s === 'string' ? s : s.size,
      price: sPrice,
      transferPrice: sTransfer,
      costPrice: sCost,
      ...(typeof s === 'object' && s.stock !== undefined && s.stock !== null && s.stock !== '' ? { stock: Math.max(0, Number(s.stock) || 0) } : {}),
      default: typeof s === 'object' ? Boolean(s.default) : true
    }
  })

  const newProduct = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    tenantId: tenantId || 'gicca',
    slug: productData.slug || slug,
    brand: productData.brand || 'Gicca',
    name: productData.name || '',
    concentration: productData.concentration || 'Eau de Parfum',
    gender: productData.gender || 'unisex',
    category: productData.category || 'disenador',
    fragranceFamily: productData.fragranceFamily || 'Floral',
    price,
    transferPrice,
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
      occasion: productData.characteristics?.occasion || 'Uso diario y ocasiones especiales',
      timeOfDay: productData.characteristics?.timeOfDay || 'Versátil (Día y Noche)',
      situations: Array.isArray(productData.characteristics?.situations) ? productData.characteristics.situations : []
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

export const updateProduct = async (id, updateData, tenantId = 'gicca') => {
  // Strip immutable / metadata / transient fields that must not be sent to MongoDB
  const { _id, __v, id: rawId, tenantId: _ignoredTenantId, createdAt, profit, profitMargin, ...cleanUpdateData } = updateData

  if (isMongoConnected()) {
    try {
      const conditions = [{ id }, { slug: id }]
      if (mongoose.Types.ObjectId.isValid(id)) {
        conditions.push({ _id: id })
      }

      const query = tenantId ? { tenantId, $or: conditions } : { $or: conditions }
      const updated = await Product.findOneAndUpdate(
        query,
        { ...cleanUpdateData, updatedAt: new Date().toISOString() },
        { returnDocument: 'after' }
      ).lean()

      if (updated) return formatProduct(updated)
    } catch (err) {
      console.error('[DB] Error actualizando producto en MongoDB:', err.message)
      throw err
    }
  }

  const products = await getProducts(tenantId)
  const index = products.findIndex(p => p.id === id || p.slug === id || p._id === id)
  if (index === -1) return null

  const existing = products[index]
  const price = Number(cleanUpdateData.price ?? existing.price)
  const transferPrice = Number(cleanUpdateData.transferPrice ?? (existing.transferPrice || (price > 0 ? Math.round(price * 0.8) : 0)))
  const costPrice = Number(cleanUpdateData.costPrice ?? existing.costPrice)

  const updated = {
    ...existing,
    ...cleanUpdateData,
    id: existing.id,
    price,
    transferPrice,
    costPrice,
    originalPrice: Number(cleanUpdateData.originalPrice ?? existing.originalPrice),
    discountPercentage: Number(cleanUpdateData.discountPercentage ?? existing.discountPercentage),
    isFeatured: Boolean(cleanUpdateData.isFeatured ?? existing.isFeatured),
    isNew: Boolean(cleanUpdateData.isNew ?? existing.isNew),
    isBestSeller: Boolean(cleanUpdateData.isBestSeller ?? existing.isBestSeller),
    sizes: Array.isArray(cleanUpdateData.sizes) ? cleanUpdateData.sizes : existing.sizes,
    images: Array.isArray(cleanUpdateData.images) ? cleanUpdateData.images : existing.images,
    stock: Number(cleanUpdateData.stock ?? existing.stock ?? 10),
    olfactoryPyramid: {
      ...existing.olfactoryPyramid,
      ...(cleanUpdateData.olfactoryPyramid || {})
    },
    characteristics: {
      ...existing.characteristics,
      ...(cleanUpdateData.characteristics || {})
    },
    updatedAt: new Date().toISOString()
  }

  products[index] = updated
  saveProducts(products)
  return formatProduct(updated)
}

export const deleteProduct = async (id, tenantId = 'gicca') => {
  if (isMongoConnected()) {
    try {
      const conditions = [{ id }, { slug: id }]
      if (mongoose.Types.ObjectId.isValid(id)) {
        conditions.push({ _id: id })
      }
      const query = tenantId ? { tenantId, $or: conditions } : { $or: conditions }
      const res = await Product.findOneAndDelete(query)
      if (res) return true
    } catch (err) {
      console.error('[DB] Error eliminando producto en MongoDB:', err.message)
      throw err
    }
  }

  const products = await getProducts(tenantId)
  const index = products.findIndex(p => p.id === id || p.slug === id || p._id === id)
  if (index === -1) return false

  products.splice(index, 1)
  saveProducts(products)
  return true
}

// ==========================================
// ORDERS CRUD (TIENDA NUBE SYSTEM)
// ==========================================

export const getOrders = async (tenantId = 'gicca') => {
  if (isMongoConnected()) {
    try {
      const query = tenantId ? { tenantId } : {}
      return await Order.find(query).sort({ createdAt: -1 }).lean()
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

// ==========================================
// STOCK: se reserva al crear el pedido y se devuelve si el pedido se cancela
// ==========================================

export class OrderError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled', 'refunded']
const FULFILLMENT_STATUSES = ['unfulfilled', 'packing', 'shipped', 'delivered']
const PUBLIC_PAYMENT_METHODS = ['transfer', 'mercadopago']

// Una presentación con stock numérico propio lleva su inventario; si no, se usa el del producto
const findStockSize = (product, size) => {
  const s = product?.sizes?.find(x => x.size === size)
  return s && typeof s.stock === 'number' ? s : null
}

// Agrupa los ítems del pedido en líneas de inventario (producto o producto+presentación)
const buildStockLines = (items, products) => {
  const lines = new Map()
  for (const item of items) {
    const product = products.find(p => p.id === item.id)
    if (!product) continue
    const size = findStockSize(product, item.size) ? item.size : null
    const key = `${product.id}::${size || ''}`
    const line = lines.get(key) || { productId: product.id, name: product.name, size, quantity: 0 }
    line.quantity += Number(item.quantity) || 0
    lines.set(key, line)
  }
  return [...lines.values()].filter(l => l.quantity > 0)
}

const availableStock = (product, line) => {
  if (!product) return 0
  if (line.size) return findStockSize(product, line.size)?.stock ?? 0
  return product.stock !== undefined ? Math.max(0, Number(product.stock)) : 10
}

const shortageError = (line, products) => {
  const product = products.find(p => p.id === line.productId)
  const left = availableStock(product, line)
  const label = `${line.name}${line.size ? ` (${line.size})` : ''}`
  return new OrderError(
    left > 0
      ? `No hay stock suficiente de ${label}: quedan ${left} unidad${left === 1 ? '' : 'es'}.`
      : `${label} se quedó sin stock.`,
    409
  )
}

// Descuenta inventario de forma atómica. allowShortage=true (ventas manuales del admin) nunca rechaza:
// si no alcanza, deja el stock en 0.
const decrementLineMongo = async (tenantId, line, allowShortage) => {
  const base = { tenantId, id: line.productId }
  if (line.size) {
    const res = await Product.updateOne(
      { ...base, sizes: { $elemMatch: { size: line.size, stock: { $gte: line.quantity } } } },
      { $inc: { 'sizes.$.stock': -line.quantity } }
    )
    if (res.modifiedCount === 1) return true
    if (!allowShortage) return false
    await Product.updateOne({ ...base, 'sizes.size': line.size }, { $set: { 'sizes.$.stock': 0 } })
    return true
  }

  const res = await Product.updateOne({ ...base, stock: { $gte: line.quantity } }, { $inc: { stock: -line.quantity } })
  if (res.modifiedCount === 1) return true
  if (!allowShortage) return false
  await Product.updateOne(base, { $set: { stock: 0 } })
  return true
}

const incrementLineMongo = async (tenantId, line) => {
  if (line.size) {
    await Product.updateOne(
      { tenantId, id: line.productId, 'sizes.size': line.size },
      { $inc: { 'sizes.$.stock': line.quantity } }
    )
  } else {
    await Product.updateOne({ tenantId, id: line.productId }, { $inc: { stock: line.quantity } })
  }
}

const applyLineToLocalProduct = (product, line, delta) => {
  const target = line.size ? findStockSize(product, line.size) : product
  if (!target) return
  const current = target === product ? availableStock(product, line) : Number(target.stock) || 0
  target.stock = Math.max(0, current + delta)
}

/**
 * Reserva stock para todas las líneas o ninguna (si una falla, se revierten las anteriores).
 */
const reserveStock = async (tenantId, lines, products, { allowShortage = false } = {}) => {
  if (isMongoConnected()) {
    const reserved = []
    for (const line of lines) {
      const ok = await decrementLineMongo(tenantId, line, allowShortage)
      if (!ok) {
        await Promise.allSettled(reserved.map(l => incrementLineMongo(tenantId, l)))
        throw shortageError(line, products)
      }
      reserved.push(line)
    }
    return
  }

  if (!allowShortage) {
    const missing = lines.find(line => availableStock(products.find(p => p.id === line.productId), line) < line.quantity)
    if (missing) throw shortageError(missing, products)
  }
  for (const line of lines) {
    const product = products.find(p => p.id === line.productId)
    if (product) applyLineToLocalProduct(product, line, -line.quantity)
  }
  saveProducts(products)
}

const releaseStock = async (tenantId, lines) => {
  if (isMongoConnected()) {
    await Promise.allSettled(lines.map(l => incrementLineMongo(tenantId, l)))
    return
  }
  const products = await getProducts(tenantId)
  for (const line of lines) {
    const product = products.find(p => p.id === line.productId)
    if (product) applyLineToLocalProduct(product, line, line.quantity)
  }
  saveProducts(products)
}

const orderNumberExists = async (tenantId, orderNumber) => {
  if (isMongoConnected()) {
    return Boolean(await Order.exists({ tenantId, orderNumber }))
  }
  const orders = await getOrders(tenantId)
  return orders.some(o => o.orderNumber === orderNumber)
}

const generateOrderNumber = async (tenantId) => {
  const prefix = (String(tenantId).replace(/[^a-z0-9]/gi, '').slice(0, 3) || 'ORD').toUpperCase()
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = `${prefix}-${crypto.randomInt(100000, 1000000)}`
    if (!(await orderNumberExists(tenantId, candidate))) return candidate
  }
  return `${prefix}-${Date.now().toString().slice(-9)}`
}

const cleanText = (value, max = 200) => String(value ?? '').trim().slice(0, max)

/**
 * Crea un pedido calculando precios, descuentos y totales del lado del servidor.
 *
 * - Pedido público (web): precios del catálogo, cupón validado por código, envío recotizado
 *   con resolveShipping(subtotal) y estados siempre "pendiente".
 * - Pedido de confianza (venta manual de un admin autenticado): respeta precios, descuento,
 *   envío y estados cargados a mano.
 */
export const createOrder = async (orderData, tenantId = 'gicca', options = {}) => {
  const { trusted = false, findCoupon = () => null, calculateCouponDiscount = () => 0, resolveShipping = null } = options
  const currentTenant = tenantId || 'gicca'
  const products = await getProducts(currentTenant)
  const incomingItems = Array.isArray(orderData.items) ? orderData.items : []

  if (incomingItems.length === 0) {
    throw new OrderError('El pedido debe incluir al menos un producto')
  }

  let subtotal = 0
  let totalCost = 0
  let transferSavings = 0
  const validatedItems = []

  for (const item of incomingItems) {
    const quantity = Math.min(999, Math.max(1, Math.floor(Number(item.quantity) || 1)))
    const dbProduct = products.find(p => p.id === item.id || p.slug === item.id)

    if (!dbProduct && !trusted) {
      throw new OrderError(`El producto "${cleanText(item.name || item.id, 80)}" ya no está disponible.`, 409)
    }

    const dbSize = dbProduct?.sizes?.find(s => s.size === item.size) || null
    if (dbProduct && !dbSize && dbProduct.sizes?.length > 0 && !trusted) {
      throw new OrderError(`La presentación "${cleanText(item.size, 40)}" de ${dbProduct.name} ya no está disponible.`, 409)
    }

    const ref = dbSize || dbProduct || {}
    let price = Number(ref.price) || Number(dbProduct?.price) || 0
    let costPrice = Number(ref.costPrice) || Math.round(price * 0.45)
    const transferPrice = Number(ref.transferPrice) || price

    // En una venta manual el admin puede pactar otro precio
    if (trusted) {
      if (item.price !== undefined && Number.isFinite(Number(item.price))) price = Math.max(0, Number(item.price))
      if (item.costPrice !== undefined && Number.isFinite(Number(item.costPrice))) costPrice = Math.max(0, Number(item.costPrice))
    }

    subtotal += price * quantity
    totalCost += costPrice * quantity
    transferSavings += Math.max(0, price - transferPrice) * quantity

    validatedItems.push({
      id: dbProduct?.id || cleanText(item.id || 'custom', 80),
      name: dbProduct?.name || cleanText(item.name || 'Perfume', 120),
      brand: dbProduct?.brand || cleanText(item.brand, 80),
      size: dbSize?.size || cleanText(item.size || '100 ml', 40),
      quantity,
      price,
      costPrice
    })
  }

  const paymentMethod = trusted
    ? cleanText(orderData.paymentMethod || 'transfer', 40)
    : (PUBLIC_PAYMENT_METHODS.includes(orderData.paymentMethod) ? orderData.paymentMethod : 'transfer')

  let couponDiscount = 0
  let transferDiscount = 0
  let discountAmount = 0
  let couponCode = ''
  let shippingCost = 0
  let shippingMethod = cleanText(orderData.shippingMethod || 'Andreani Estándar a Domicilio', 120)

  if (trusted) {
    discountAmount = Math.min(subtotal, Math.max(0, Number(orderData.discountAmount) || 0))
    shippingCost = Math.max(0, Number(orderData.shippingCost) || 0)
  } else {
    const coupon = findCoupon(orderData.couponCode)
    if (coupon) {
      couponDiscount = calculateCouponDiscount(coupon, subtotal)
      // Solo cuenta como uso del cupón si efectivamente descontó (ej: se cumplió el monto mínimo)
      if (couponDiscount > 0) couponCode = coupon.code
    }
    transferDiscount = paymentMethod === 'transfer' ? transferSavings : 0
    discountAmount = Math.min(subtotal, couponDiscount + transferDiscount)

    if (resolveShipping) {
      const shipping = await resolveShipping(subtotal)
      shippingCost = Math.max(0, Math.round(Number(shipping.cost) || 0))
      if (shipping.name) shippingMethod = shipping.name
    }
  }

  const total = Math.max(0, subtotal - discountAmount) + shippingCost
  const netRevenue = Math.max(0, subtotal - discountAmount)
  const profit = Math.max(0, netRevenue - totalCost)
  const profitMargin = netRevenue > 0 ? Math.round((profit / netRevenue) * 100) : 0

  const paymentStatus = trusted && PAYMENT_STATUSES.includes(orderData.paymentStatus) ? orderData.paymentStatus : 'pending'
  const fulfillmentStatus = trusted && FULFILLMENT_STATUSES.includes(orderData.fulfillmentStatus) ? orderData.fulfillmentStatus : 'unfulfilled'
  const customer = orderData.customer || {}
  const now = new Date().toISOString()

  const newOrder = {
    id: `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    tenantId: currentTenant,
    orderNumber: await generateOrderNumber(currentTenant),
    date: now,
    customer: {
      firstName: cleanText(customer.firstName, 80) || 'Cliente',
      lastName: cleanText(customer.lastName, 80),
      phone: cleanText(customer.phone, 40),
      email: cleanText(customer.email, 120),
      dni: cleanText(customer.dni, 20),
      address: cleanText(customer.address, 200),
      apartment: cleanText(customer.apartment, 80),
      city: cleanText(customer.city, 80),
      province: cleanText(customer.province, 80),
      postalCode: cleanText(customer.postalCode, 12)
    },
    items: validatedItems,
    subtotal,
    shippingCost,
    discountAmount,
    transferDiscount,
    couponDiscount,
    couponCode,
    total,
    totalCost,
    profit,
    profitMargin,
    shippingMethod,
    pickupBranch: orderData.pickupBranch && typeof orderData.pickupBranch === 'object' ? orderData.pickupBranch : null,
    paymentMethod,
    paymentStatus,
    fulfillmentStatus,
    trackingCode: trusted ? cleanText(orderData.trackingCode, 60) : '',
    notes: trusted ? cleanText(orderData.notes, 1000) : '',
    source: trusted ? cleanText(orderData.source || 'manual_admin', 40) : 'web',
    accessToken: crypto.randomBytes(16).toString('hex'),
    stockReleased: paymentStatus === 'cancelled',
    createdAt: now,
    updatedAt: now
  }

  const stockLines = buildStockLines(validatedItems, products)
  if (!newOrder.stockReleased) {
    await reserveStock(currentTenant, stockLines, products, { allowShortage: trusted })
  }

  if (isMongoConnected()) {
    try {
      const created = await Order.create(newOrder)
      return created.toObject()
    } catch (err) {
      console.error('[DB] Error creando pedido en MongoDB:', err.message)
      if (!newOrder.stockReleased) await releaseStock(currentTenant, stockLines)
      throw new OrderError('No se pudo registrar el pedido. Intentá nuevamente.', 500)
    }
  }

  const orders = await getOrders(currentTenant)
  orders.unshift(newOrder)
  saveOrders(orders)
  return newOrder
}

export const getOrderByIdOrNumber = async (id, tenantId = 'gicca') => {
  if (isMongoConnected()) {
    return Order.findOne({ tenantId, $or: [{ id }, { orderNumber: id }] }).lean()
  }
  const orders = await getOrders(tenantId)
  return orders.find(o => o.id === id || o.orderNumber === id) || null
}

/**
 * Mantiene el inventario sincronizado con el estado de pago:
 * - pasar a "cancelado" devuelve el stock reservado (una sola vez)
 * - reactivar un pedido cancelado lo vuelve a reservar
 * Devuelve los campos a guardar en el pedido.
 */
const syncStockWithPaymentStatus = async (existing, nextStatus, tenantId) => {
  if (!nextStatus || nextStatus === existing.paymentStatus) return {}

  const releasing = nextStatus === 'cancelled' && !existing.stockReleased
  const restoring = nextStatus !== 'cancelled' && Boolean(existing.stockReleased)
  if (!releasing && !restoring) return {}

  // Bandera atómica: evita devolver dos veces el stock si llegan dos actualizaciones a la vez
  if (isMongoConnected()) {
    const flipped = await Order.findOneAndUpdate(
      { _id: existing._id, stockReleased: restoring ? true : { $ne: true } },
      { $set: { stockReleased: releasing } }
    )
    if (!flipped) return {}
  }

  const products = await getProducts(tenantId)
  const lines = buildStockLines(existing.items || [], products)
  if (releasing) {
    await releaseStock(tenantId, lines)
  } else {
    await reserveStock(tenantId, lines, products, { allowShortage: true })
  }
  return { stockReleased: releasing }
}

// Campos que nunca se modifican desde una actualización
const IMMUTABLE_ORDER_FIELDS = ['_id', '__v', 'id', 'tenantId', 'orderNumber', 'accessToken', 'stockReleased', 'createdAt']
// Campos que solo escribe el servidor (la factura la emite ARCA, no se carga a mano)
const SERVER_ONLY_ORDER_FIELDS = ['invoice']

export const updateOrder = async (id, updateData, tenantId = 'gicca', { internal = false } = {}) => {
  const existing = await getOrderByIdOrNumber(id, tenantId)
  if (!existing) return null

  const changes = { ...updateData }
  IMMUTABLE_ORDER_FIELDS.forEach(field => delete changes[field])
  if (!internal) SERVER_ONLY_ORDER_FIELDS.forEach(field => delete changes[field])
  if (changes.paymentStatus && !PAYMENT_STATUSES.includes(changes.paymentStatus)) delete changes.paymentStatus
  if (changes.fulfillmentStatus && !FULFILLMENT_STATUSES.includes(changes.fulfillmentStatus)) delete changes.fulfillmentStatus

  const stockChanges = await syncStockWithPaymentStatus(existing, changes.paymentStatus, tenantId)

  if (isMongoConnected()) {
    return Order.findOneAndUpdate(
      { _id: existing._id },
      { ...changes, ...stockChanges, updatedAt: new Date().toISOString() },
      { returnDocument: 'after' }
    ).lean()
  }

  const orders = await getOrders(tenantId)
  const index = orders.findIndex(o => o.id === existing.id)
  if (index === -1) return null

  const updated = {
    ...existing,
    ...changes,
    ...stockChanges,
    id: existing.id,
    orderNumber: existing.orderNumber,
    customer: {
      ...existing.customer,
      ...(changes.customer || {})
    },
    updatedAt: new Date().toISOString()
  }

  orders[index] = updated
  saveOrders(orders)
  return updated
}

export const deleteOrder = async (id, tenantId = 'gicca') => {
  const existing = await getOrderByIdOrNumber(id, tenantId)
  if (!existing) return false

  // Un pedido nunca pagado que se borra devuelve su reserva de stock
  if (existing.paymentStatus === 'pending' && !existing.stockReleased) {
    await syncStockWithPaymentStatus(existing, 'cancelled', tenantId)
  }

  if (isMongoConnected()) {
    const res = await Order.deleteOne({ _id: existing._id })
    return res.deletedCount === 1
  }

  const orders = await getOrders(tenantId)
  const index = orders.findIndex(o => o.id === existing.id)
  if (index === -1) return false

  orders.splice(index, 1)
  saveOrders(orders)
  return true
}

/**
 * Cancela pedidos de Mercado Pago que nunca se pagaron y libera su stock.
 * Los pagos en efectivo (Rapipago / Pago Fácil) pueden tardar hasta 3 días en acreditarse.
 */
export const cancelStaleMercadoPagoOrders = async (maxAgeHours = 72) => {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
  let stale = []

  if (isMongoConnected()) {
    stale = await Order.find({
      paymentMethod: 'mercadopago',
      paymentStatus: 'pending',
      createdAt: { $lt: cutoff }
    }).lean()
  } else {
    const orders = await getOrders()
    stale = orders.filter(o =>
      o.paymentMethod === 'mercadopago' &&
      o.paymentStatus === 'pending' &&
      new Date(o.createdAt || o.date) < cutoff
    )
  }

  for (const order of stale) {
    try {
      await updateOrder(order.id, {
        paymentStatus: 'cancelled',
        notes: [order.notes, `Cancelado automáticamente: pago de Mercado Pago no acreditado en ${maxAgeHours} hs.`].filter(Boolean).join(' | ')
      }, order.tenantId || 'gicca')
    } catch (err) {
      console.error(`[Orders] Error cancelando pedido vencido ${order.orderNumber}:`, err.message)
    }
  }
  return stale.length
}

// ==========================================
// SITE CONTENT & STATIC IMAGES MANAGEMENT
// ==========================================

export const getSiteContent = async (tenantId = 'gicca') => {
  const currentTenant = tenantId || 'gicca'
  if (isMongoConnected()) {
    try {
      // Si la tienda aún no guardó contenido propio, se usa la plantilla base de server/data/site-content.json
      // (nunca el contenido personalizado de otra tienda)
      const doc = await SiteContent.findOne({ key: 'global_content', tenantId: currentTenant }).lean()
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

export const saveSiteContent = async (content, tenantId = 'gicca') => {
  const currentTenant = tenantId || 'gicca'
  const current = await getSiteContent(currentTenant)
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
        { key: 'global_content', tenantId: currentTenant },
        { ...merged, key: 'global_content', tenantId: currentTenant },
        { upsert: true, returnDocument: 'after' }
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

export const addCategory = async (categoryData, tenantId = 'gicca') => {
  const content = await getSiteContent(tenantId)
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
  await saveSiteContent(content, tenantId)
  return newCat
}

export const updateCategory = async (id, categoryData, tenantId = 'gicca') => {
  const content = await getSiteContent(tenantId)
  const index = content.mainCategories.findIndex(c => c.id === id)
  if (index === -1) return null

  content.mainCategories[index] = {
    ...content.mainCategories[index],
    ...categoryData,
    id: content.mainCategories[index].id,
    updatedAt: new Date().toISOString()
  }
  await saveSiteContent(content, tenantId)
  return content.mainCategories[index]
}

export const deleteCategory = async (id, tenantId = 'gicca') => {
  const content = await getSiteContent(tenantId)
  const index = content.mainCategories.findIndex(c => c.id === id)
  if (index === -1) return false

  content.mainCategories.splice(index, 1)
  await saveSiteContent(content, tenantId)
  return true
}

export const addOlfactiveFamily = async (familyData, tenantId = 'gicca') => {
  const content = await getSiteContent(tenantId)
  const newFam = {
    id: familyData.id || `fam_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: familyData.name || 'Nueva Familia',
    description: familyData.description || '',
    image: familyData.image || 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString()
  }
  content.olfactiveFamilies.push(newFam)
  await saveSiteContent(content, tenantId)
  return newFam
}

export const updateOlfactiveFamily = async (id, familyData, tenantId = 'gicca') => {
  const content = await getSiteContent(tenantId)
  const index = content.olfactiveFamilies.findIndex(f => f.id === id || f.name?.toLowerCase() === id?.toLowerCase())
  if (index === -1) return null

  content.olfactiveFamilies[index] = {
    ...content.olfactiveFamilies[index],
    ...familyData,
    id: content.olfactiveFamilies[index].id,
    updatedAt: new Date().toISOString()
  }
  await saveSiteContent(content, tenantId)
  return content.olfactiveFamilies[index]
}

export const deleteOlfactiveFamily = async (id, tenantId = 'gicca') => {
  const content = await getSiteContent(tenantId)
  const index = content.olfactiveFamilies.findIndex(f => f.id === id || f.name?.toLowerCase() === id?.toLowerCase())
  if (index === -1) return false

  content.olfactiveFamilies.splice(index, 1)
  await saveSiteContent(content, tenantId)
  return true
}
