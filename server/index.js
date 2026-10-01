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
import tenantRoutes from './routes/tenants.js'
import checkoutRoutes from './routes/checkout.js'
import { tenantMiddleware } from './middleware/tenant.js'
import { connectDatabase } from './dbConnection.js'
import { getProducts, cancelStaleMercadoPagoOrders } from './db.js'
import swaggerUi from 'swagger-ui-express'
import { swaggerDocument } from './swagger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Conectar a base de datos (MongoDB si está configurado, o fallback JSON)
connectDatabase()

const app = express()
const PORT = process.env.PORT || 3001

// Detrás del proxy del hosting (Render, Railway, Nginx) para que los límites por IP usen la IP real
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
  : '*'

app.use(cors({
  origin: allowedOrigins === '*' ? '*' : allowedOrigins,
  credentials: true
}))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Multi-tenant Middleware (detecta automáticamente la tienda según dominio o cabecera x-tenant-id)
app.use(tenantMiddleware)

// Static uploads directory with cache
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  immutable: true
}))

// Direct favicon & touch icons serving with 7 days cache
app.get(['/favicon.ico', '/favicon.png', '/apple-touch-icon.png'], (req, res) => {
  const fileName = path.basename(req.path)
  const distFile = path.join(__dirname, '..', 'dist', fileName)
  const pubFile = path.join(__dirname, '..', 'public', fileName)
  const target = fs.existsSync(distFile) ? distFile : (fs.existsSync(pubFile) ? pubFile : null)
  
  if (target) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    return res.sendFile(target)
  }
  res.status(204).end()
})

// API Routes
app.use('/api/tenant', tenantRoutes)
app.use('/api/tenants', tenantRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/site-content', siteContentRoutes)

// Helper to escape XML special entities
const escapeXml = (unsafe) => {
  if (!unsafe) return ''
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

// Dynamic XML Sitemap for Google Search & Google Images
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.SITE_URL || 'https://giccaparfum.com'
    const products = await getProducts()
    const today = new Date().toISOString().split('T')[0]

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`

    // Static primary landing pages
    const staticPages = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/catalogo`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/catalogo?category=arabes`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/catalogo?gender=man`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/catalogo?gender=woman`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/catalogo?gender=unisex`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/quiz`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${baseUrl}/contacto`, priority: '0.6', changefreq: 'monthly' }
    ]

    for (const page of staticPages) {
      xml += `  <url>\n`
      xml += `    <loc>${escapeXml(page.loc)}</loc>\n`
      xml += `    <lastmod>${today}</lastmod>\n`
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`
      xml += `    <priority>${page.priority}</priority>\n`
      xml += `  </url>\n`
    }

    // Dynamic Product pages from MongoDB Atlas with Image indexing
    for (const p of products) {
      const slug = p.slug || p.id
      const lastModDate = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : today
      const mainImage = p.images && p.images[0] ? p.images[0] : ''
      const safeTitle = escapeXml(p.name || '')
      const safeBrand = escapeXml(p.brand || '')

      xml += `  <url>\n`
      xml += `    <loc>${escapeXml(`${baseUrl}/producto/${slug}`)}</loc>\n`
      xml += `    <lastmod>${lastModDate}</lastmod>\n`
      xml += `    <changefreq>weekly</changefreq>\n`
      xml += `    <priority>0.9</priority>\n`
      if (mainImage) {
        xml += `    <image:image>\n`
        xml += `      <image:loc>${escapeXml(mainImage)}</image:loc>\n`
        xml += `      <image:title>Perfume ${safeTitle} - ${safeBrand}</image:title>\n`
        xml += `      <image:caption>Perfume ${safeTitle} 100% Original en Gicca Perfumes Boutique</image:caption>\n`
        xml += `    </image:image>\n`
      }
      xml += `  </url>\n`
    }

    xml += `</urlset>`

    res.header('Content-Type', 'application/xml; charset=utf-8')
    res.header('Cache-Control', 'public, max-age=3600')
    res.send(xml)
  } catch (err) {
    console.error('Error generating sitemap:', err)
    res.status(500).send('Error generating sitemap')
  }
})

// Health Check (Lightweight endpoint for UptimeRobot / Ping / Keep-Alive)
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache')
  res.json({
    status: 'ok',
    service: 'Gicca Perfumes Backend API',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  })
})

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Gicca Perfumes API Docs',
  customCss: '.swagger-ui .topbar { display: none }'
}))
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerDocument)
})

// 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint API no encontrado' })
})

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err)
  if (res.headersSent) {
    return next(err)
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Ocurrió un error interno en el servidor.'
      : (err.message || 'Error interno del servidor')
  })
})

// Serve production frontend dist (SPA Mode) with optimized HTTP caching
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      }
    }
  }))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      return res.sendFile(path.join(distPath, 'index.html'))
    }
    next()
  })
}

// Pedidos de Mercado Pago nunca pagados: se cancelan y liberan su stock reservado
const STALE_ORDER_HOURS = Number(process.env.MP_PENDING_ORDER_TTL_HOURS) || 72
setInterval(() => {
  cancelStaleMercadoPagoOrders(STALE_ORDER_HOURS)
    .then(count => { if (count > 0) console.log(`[Orders] ${count} pedido(s) de Mercado Pago vencidos fueron cancelados.`) })
    .catch(err => console.error('[Orders] Error cancelando pedidos vencidos:', err.message))
}, 30 * 60 * 1000).unref()

app.listen(PORT, () => {
  console.log(`Servidor Backend Gicca Perfumes ejecutandose en http://localhost:${PORT}`)
  console.log(`Swagger API Docs disponible en http://localhost:${PORT}/api/docs`)
})
