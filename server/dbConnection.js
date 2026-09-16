import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Product } from './models/Product.js'
import { Order } from './models/Order.js'
import { SiteContent } from './models/SiteContent.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let isConnected = false

export const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI?.trim()

  if (!uri) {
    console.log('[Database] MONGODB_URI no configurada. Operando en modo local (archivos JSON en server/data).')
    return false
  }

  try {
    await mongoose.connect(uri)
    isConnected = true
    console.log('[Database] Conexión establecida con éxito a MongoDB Atlas.')

    // Auto-migración si las colecciones están vacías
    await autoMigrateFromJson()

    return true
  } catch (err) {
    console.error('[Database] Error al conectar con MongoDB Atlas:', err.message)
    console.log('[Database] Continuando en modo fallback (archivos JSON).')
    isConnected = false
    return false
  }
}

export const isMongoConnected = () => isConnected

async function autoMigrateFromJson() {
  try {
    const dataDir = path.join(__dirname, 'data')
    const productsFile = path.join(dataDir, 'products.json')
    const ordersFile = path.join(dataDir, 'orders.json')
    const siteContentFile = path.join(dataDir, 'site-content.json')

    // 1. Migrar Productos
    const productCount = await Product.countDocuments()
    if (productCount === 0 && fs.existsSync(productsFile)) {
      const raw = fs.readFileSync(productsFile, 'utf-8')
      const products = JSON.parse(raw || '[]')
      if (products.length > 0) {
        await Product.insertMany(products)
        console.log(`[Database] Auto-migración: ${products.length} productos transferidos a MongoDB Atlas.`)
      }
    }

    // 2. Migrar Pedidos
    const orderCount = await Order.countDocuments()
    if (orderCount === 0 && fs.existsSync(ordersFile)) {
      const raw = fs.readFileSync(ordersFile, 'utf-8')
      const orders = JSON.parse(raw || '[]')
      if (orders.length > 0) {
        await Order.insertMany(orders)
        console.log(`[Database] Auto-migración: ${orders.length} pedidos transferidos a MongoDB Atlas.`)
      }
    }

    // 3. Migrar Contenido del Sitio
    const contentCount = await SiteContent.countDocuments()
    if (contentCount === 0 && fs.existsSync(siteContentFile)) {
      const raw = fs.readFileSync(siteContentFile, 'utf-8')
      const content = JSON.parse(raw || '{}')
      await SiteContent.create({
        key: 'global_content',
        heroSlides: content.heroSlides || [],
        mainCategories: content.mainCategories || [],
        olfactiveFamilies: content.olfactiveFamilies || [],
        editorial: content.editorial || {}
      })
      console.log('[Database] Auto-migración: Contenido y banners transferidos a MongoDB Atlas.')
    }
  } catch (err) {
    console.error('[Database] Error durante auto-migración a MongoDB:', err.message)
  }
}
