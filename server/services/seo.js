import { getProductByIdOrSlug } from '../db.js'
import { getStoreUrl, PLATFORM } from '../config/platform.js'
import { toPublicTenant } from './tenantService.js'

const escapeAttr = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]))

// JSON seguro dentro de <script> (evita cerrar la etiqueta desde un texto cargado por la tienda)
const safeJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029')

const truncate = (text, max) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean
}

const absoluteUrl = (base, url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

const PLATFORM_PAGE = {
  title: () => `${PLATFORM.name} | Creá la tienda online de tu perfumería`,
  description: () => `${PLATFORM.name}: la plataforma para vender perfumes online. Catálogo con pirámides olfativas, Mercado Pago, envíos con Andreani y tu propio dominio. Probala gratis.`
}

/**
 * Arma las etiquetas <head> de la página según la tienda y la ruta (home, producto, etc.).
 */
const buildHead = async ({ tenant, req }) => {
  const baseUrl = getStoreUrl(tenant, req)
  const pathOnly = req.path || '/'
  const canonical = `${baseUrl}${pathOnly === '/' ? '/' : pathOnly}`
  const seo = tenant.seo || {}
  const branding = tenant.branding || {}
  const storeName = tenant.name || 'Perfumería'

  let title = seo.title || `${storeName} | Perfumes originales`
  let description = seo.description || `Perfumes originales en ${storeName}. Envíos a todo el país.`
  let image = absoluteUrl(baseUrl, seo.ogImage || branding.logoUrl || '')
  let ogType = 'website'
  let productLd = null

  if (req.isPlatformHost) {
    title = PLATFORM_PAGE.title()
    description = PLATFORM_PAGE.description()
  }

  const productMatch = pathOnly.match(/^\/producto\/([^/]+)\/?$/)
  if (productMatch && !req.isPlatformHost) {
    const product = await getProductByIdOrSlug(decodeURIComponent(productMatch[1]), tenant.tenantId).catch(() => null)
    if (product) {
      title = `${product.name} ${product.brand ? `- ${product.brand}` : ''} | ${storeName}`.replace(/\s+/g, ' ')
      description = truncate(product.shortDescription || product.description || description, 160)
      image = absoluteUrl(baseUrl, product.images?.[0]) || image
      ogType = 'product'
      const sizes = product.sizes?.length ? product.sizes : [{ price: product.price }]
      const prices = sizes.map(s => Number(s.price) || 0).filter(p => p > 0)
      productLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        description: truncate(product.description || product.shortDescription, 500),
        image: (product.images || []).map(img => absoluteUrl(baseUrl, img)),
        sku: product.id,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'ARS',
          lowPrice: prices.length ? Math.min(...prices) : product.price,
          highPrice: prices.length ? Math.max(...prices) : product.price,
          availability: (product.stock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: canonical
        }
      }
    }
  }

  const favicon = branding.faviconUrl || branding.iconUrl || '/favicon.png'
  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: storeName,
    url: `${baseUrl}/`,
    logo: absoluteUrl(baseUrl, branding.logoUrl || branding.iconUrl || ''),
    image: image || undefined,
    telephone: branding.whatsappNumber || undefined,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/catalogo?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }

  const tags = [
    `<link rel="icon" href="${escapeAttr(favicon)}" />`,
    `<link rel="apple-touch-icon" href="${escapeAttr(branding.iconUrl || '/apple-touch-icon.png')}" />`,
    `<title>${escapeAttr(title)}</title>`,
    `<meta name="title" content="${escapeAttr(title)}" />`,
    `<meta name="description" content="${escapeAttr(truncate(description, 300))}" />`,
    seo.keywords ? `<meta name="keywords" content="${escapeAttr(seo.keywords)}" />` : '',
    `<meta name="author" content="${escapeAttr(storeName)}" />`,
    `<meta name="robots" content="${req.storeNotFound ? 'noindex' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    '<meta property="og:locale" content="es_AR" />',
    `<meta property="og:site_name" content="${escapeAttr(storeName)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(truncate(description, 200))}" />`,
    image ? `<meta property="og:image" content="${escapeAttr(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(truncate(description, 200))}" />`,
    image ? `<meta name="twitter:image" content="${escapeAttr(image)}" />` : '',
    tenant.marketing?.googleSiteVerification
      ? `<meta name="google-site-verification" content="${escapeAttr(tenant.marketing.googleSiteVerification)}" />`
      : '',
    branding.primaryColor ? `<meta name="theme-color" content="${escapeAttr(branding.primaryColor)}" />` : '',
    `<script type="application/ld+json">${safeJson(organizationLd)}</script>`,
    productLd ? `<script type="application/ld+json">${safeJson(productLd)}</script>` : ''
  ]
  return tags.filter(Boolean).join('\n    ')
}

/**
 * Devuelve el index.html de la SPA con el SEO y la configuración pública de la tienda ya cargados.
 */
export const renderStoreHtml = async ({ template, tenant, req }) => {
  const head = await buildHead({ tenant, req })
  const boot = `<script>window.__TENANT__ = ${safeJson(toPublicTenant(tenant, req))}</script>`
  return template
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, head)
    .replace('<!--tenant:boot-->', boot)
}

/**
 * robots.txt y sitemap.xml por tienda
 */
export const renderRobots = ({ tenant, req }) => {
  const baseUrl = getStoreUrl(tenant, req)
  if (req.storeNotFound) return 'User-agent: *\nDisallow: /\n'
  return [
    `# robots.txt de ${tenant.name || 'la tienda'}`,
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /superadmin',
    'Disallow: /api/',
    'Disallow: /checkout',
    'Disallow: /cuenta',
    'Disallow: /pedido/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ''
  ].join('\n')
}

export const escapeXml = (unsafe) => String(unsafe ?? '').replace(/[<>&'"]/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
}[c]))
