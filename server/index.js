import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import uploadRoutes from './routes/upload.js'
import shippingRoutes from './routes/shipping.js'
import orderRoutes from './routes/orders.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Gicca Perfumes Backend API',
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, () => {
  console.log(`Servidor Backend Gicca Perfumes ejecutandose en http://localhost:${PORT}`)
})
