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
import platformRoutes from './routes/platform.js'
import billingRoutes from './routes/billing.js'
import staffRoutes from './routes/staff.js'
import mercadopagoOAuthRoutes from './routes/mercadopagoOAuth.js'
import couponRoutes from './routes/coupons.js'
import legalRoutes from './routes/legal.js'
import customerRoutes from './routes/customers.js'
import cartRoutes from './routes/carts.js'
import feedRoutes from './routes/feeds.js'
import { tenantMiddleware } from './middleware/tenant.js'
import { sanitizeBody } from './middleware/sanitize.js'
import { connectDatabase } from './dbConnection.js'
import { getProducts, cancelStaleMercadoPagoOrders } from './db.js'
import { enforceBilling } from './services/billing.js'
import { refreshExpiringConnections } from './services/mercadopagoOAuth.js'
import { sendAbandonedCartReminders, purgeOldCarts } from './services/abandonedCarts.js'
import { renderStoreHtml, renderRobots, escapeXml } from './services/seo.js'
import { getStoreUrl, PLATFORM } from './config/platform.js'
import swaggerUi from 'swagger-ui-express'
import { swaggerDocument } from './swagger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isProduction = process.env.NODE_ENV === 'production'

// Conectar a base de datos (MongoDB si está configurado, o fallback JSON)
connectDatabase()

if (isProduction && !process.env.MONGODB_URI) {
  console.warn('[Plataforma] Sin MONGODB_URI el servidor funciona como una sola tienda (modo archivos JSON): el registro de nuevas perfumerías queda deshabilitado.')
}

const app = express()
const PORT = process.env.PORT || 3001

// Detrás del proxy del hosting (Render, Railway, Nginx) para que los límites por IP usen la IP real
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))
app.disable('x-powered-by')

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*'

app.use(cors({
  origin: allowedOrigins === '*' ? '*' : allowedOrigins,
  credentials: true
}))
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
// Nunca dejar pasar operadores de MongoDB desde el cliente
app.use(sanitizeBody)

// Cabeceras de seguridad básicas
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  next()
})

// Multi-tenant Middleware (detecta automáticamente la tienda según dominio o cabecera x-tenant-id)
app.use(tenantMiddleware)

// Imágenes subidas. Los SVG se sirven aislados para que no puedan ejecutar scripts en el dominio de una tienda.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.svg')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
    }
  }
}))

// Favicon de cada tienda (si cargó su ícono) o el genérico
app.get(['/favicon.ico', '/favicon.png', '/apple-touch-icon.png'], (req, res) => {
  const customIcon = req.tenant?.branding?.faviconUrl || req.tenant?.branding?.iconUrl
  if (customIcon && !req.isPlatformHost) {
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.redirect(302, customIcon)
  }

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
app.use('/api/platform', platformRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/mercadopago/oauth', mercadopagoOAuthRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/legal', legalRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/carts', cartRoutes)
app.use('/feeds', feedRoutes)

// robots.txt de cada tienda
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(renderRobots({ tenant: req.tenant, req }))
})

// Sitemap XML de cada tienda (Google Search & Google Images)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = getStoreUrl(req.tenant, req)
    const products = req.storeNotFound ? [] : await getProducts(req.tenantId)
    const today = new Date().toISOString().split('T')[0]

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`

    const staticPages = req.isPlatformHost
      ? [{ loc: `${baseUrl}/`, priority: '1.0', changefreq: 'weekly' }, { loc: `${baseUrl}/crear-tienda`, priority: '0.9', changefreq: 'monthly' }]
      : [
          { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
          { loc: `${baseUrl}/catalogo`, priority: '0.9', changefreq: 'daily' },
          { loc: `${baseUrl}/catalogo?gender=man`, priority: '0.8', changefreq: 'weekly' },
          { loc: `${baseUrl}/catalogo?gender=woman`, priority: '0.8', changefreq: 'weekly' },
          { loc: `${baseUrl}/catalogo?gender=unisex`, priority: '0.8', changefreq: 'weekly' },
          { loc: `${baseUrl}/quiz`, priority: '0.7', changefreq: 'monthly' },
          { loc: `${baseUrl}/contacto`, priority: '0.6', changefreq: 'monthly' }
        ]

    for (const page of staticPages) {
      xml += `  <url>\n    <loc>${escapeXml(page.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`
    }

    if (!req.isPlatformHost) {
      for (const p of products) {
        const slug = p.slug || p.id
        const lastModDate = p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : today
        const mainImage = p.images && p.images[0] ? p.images[0] : ''
        const imageUrl = mainImage && !/^https?:\/\//.test(mainImage) ? `${baseUrl}${mainImage}` : mainImage

        xml += `  <url>\n    <loc>${escapeXml(`${baseUrl}/producto/${slug}`)}</loc>\n    <lastmod>${lastModDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n`
        if (imageUrl) {
          xml += `    <image:image>\n      <image:loc>${escapeXml(imageUrl)}</image:loc>\n      <image:title>${escapeXml(`${p.name || ''} - ${p.brand || ''}`)}</image:title>\n    </image:image>\n`
        }
        xml += `  </url>\n`
      }
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
    service: `${PLATFORM.name} API`,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  })
})

// Documentación de la API (en producción solo si se habilita explícitamente)
if (!isProduction || process.env.ENABLE_API_DOCS === 'true') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'API Docs',
    customCss: '.swagger-ui .topbar { display: none }'
  }))
  app.get('/api/docs.json', (req, res) => {
    res.json(swaggerDocument)
  })
}

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
    error: isProduction
      ? 'Ocurrió un error interno en el servidor.'
      : (err.message || 'Error interno del servidor')
  })
})

// Serve production frontend dist (SPA Mode) with optimized HTTP caching
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  const indexTemplate = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8')

  app.use(express.static(distPath, {
    // index.html se arma por tienda (SEO + configuración pública), nunca se sirve estático
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      }
    }
  }))
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/feeds')) {
      return next()
    }
    try {
      const html = await renderStoreHtml({ template: indexTemplate, tenant: req.tenant, req })
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      res.status(req.storeNotFound ? 404 : 200).type('html').send(html)
    } catch (err) {
      console.error('[SEO] Error renderizando la página:', err.message)
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      res.type('html').send(indexTemplate)
    }
  })
}

// Tareas periódicas
const STALE_ORDER_HOURS = Number(process.env.MP_PENDING_ORDER_TTL_HOURS) || 72
const runJob = (name, fn) => fn()
  .then(count => { if (count > 0) console.log(`[Jobs] ${name}: ${count}`) })
  .catch(err => console.error(`[Jobs] Error en ${name}:`, err.message))

// Pedidos de Mercado Pago nunca pagados: se cancelan y liberan su stock reservado
setInterval(() => runJob('pedidos de Mercado Pago vencidos cancelados', () => cancelStaleMercadoPagoOrders(STALE_ORDER_HOURS)), 30 * 60 * 1000).unref()
// Tiendas con prueba vencida o pago atrasado: se pausan
setInterval(() => runJob('tiendas pausadas por suscripción', enforceBilling), 60 * 60 * 1000).unref()
// Recordatorio único de carritos abandonados y limpieza de carritos viejos
setInterval(() => runJob('recordatorios de carrito enviados', sendAbandonedCartReminders), 15 * 60 * 1000).unref()
setInterval(() => runJob('carritos viejos eliminados', purgeOldCarts), 24 * 60 * 60 * 1000).unref()
// Tokens de Mercado Pago (OAuth) próximos a vencer: se renuevan
setInterval(() => runJob('conexiones de Mercado Pago renovadas', refreshExpiringConnections), 12 * 60 * 60 * 1000).unref()

app.listen(PORT, () => {
  console.log(`Servidor de ${PLATFORM.name} ejecutándose en http://localhost:${PORT}`)
  if (!isProduction) console.log(`Swagger API Docs disponible en http://localhost:${PORT}/api/docs`)
})
