import express from 'express'
import { getProducts } from '../db.js'
import { getStoreUrl } from '../config/platform.js'
import { escapeXml } from '../services/seo.js'

const router = express.Router()

const GENDER_MAP = { man: 'male', woman: 'female', unisex: 'unisex' }

/**
 * GET /feeds/productos.xml - Catálogo en formato RSS 2.0 con atributos g: de Google Merchant Center.
 * El mismo feed sirve para el catálogo de Meta (Facebook / Instagram Shopping).
 * Cada presentación (100 ml, 50 ml, decants) es un ítem agrupado por item_group_id.
 */
router.get('/productos.xml', async (req, res) => {
  try {
    if (req.storeNotFound || req.isPlatformHost) return res.status(404).send('Not found')
    const baseUrl = getStoreUrl(req.tenant, req)
    const products = await getProducts(req.tenantId)
    const storeName = req.tenant?.name || 'Tienda'

    const absolute = (url) => (!url ? '' : /^https?:\/\//.test(url) ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`)

    let items = ''
    for (const p of products) {
      const sizes = p.sizes?.length ? p.sizes : [{ size: '', price: p.price }]
      for (const size of sizes) {
        const price = Number(size.price || p.price) || 0
        if (price <= 0) continue
        const stock = typeof size.stock === 'number' ? size.stock : Number(p.stock ?? 1)
        const id = `${p.id}${size.size ? `-${size.size.replace(/\s+/g, '')}` : ''}`
        const title = `${p.brand ? `${p.brand} ` : ''}${p.name}${size.size ? ` ${size.size}` : ''}`
        const images = (p.images || []).map(absolute).filter(Boolean)
        items += `
    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:item_group_id>${escapeXml(p.id)}</g:item_group_id>
      <g:title>${escapeXml(title.slice(0, 150))}</g:title>
      <g:description>${escapeXml((p.description || p.shortDescription || title).slice(0, 4900))}</g:description>
      <g:link>${escapeXml(`${baseUrl}/producto/${p.slug || p.id}`)}</g:link>
      ${images[0] ? `<g:image_link>${escapeXml(images[0])}</g:image_link>` : ''}
      ${images.slice(1, 10).map(img => `<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('')}
      <g:availability>${stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${price.toFixed(2)} ARS</g:price>
      <g:brand>${escapeXml(p.brand || storeName)}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>479</g:google_product_category>
      ${GENDER_MAP[p.gender] ? `<g:gender>${GENDER_MAP[p.gender]}</g:gender>` : ''}
      ${size.size ? `<g:size>${escapeXml(size.size)}</g:size>` : ''}
      <g:identifier_exists>no</g:identifier_exists>
    </item>`
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(storeName)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(`Catálogo de ${storeName}`)}</description>${items}
  </channel>
</rss>`

    res.set('Content-Type', 'application/xml; charset=utf-8').set('Cache-Control', 'public, max-age=1800').send(xml)
  } catch (err) {
    console.error('Error generando feed:', err)
    res.status(500).send('Error')
  }
})

export default router
