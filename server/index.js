import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import uploadRoutes from './routes/upload.js'
import shippingRoutes from './routes/shipping.js'
import orderRoutes from './routes/orders.js'
import siteContentRoutes from './routes/siteContent.js'
import { connectDatabase } from './dbConnection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Conectar a base de datos (MongoDB si está configurado, o fallback JSON)
connectDatabase()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/site-content', siteContentRoutes)

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Gicca Perfumes Backend API',
    timestamp: new Date().toISOString()
  })
})

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API no encontrado' })
})

// Serve production frontend dist (SPA Mode)
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(distPath, 'index.html'))
    }
    next()
  })
}

app.listen(PORT, () => {
  console.log(`Servidor Backend Gicca Perfumes ejecutandose en http://localhost:${PORT}`)
})
