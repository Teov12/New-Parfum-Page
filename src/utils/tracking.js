/**
 * Píxeles de marketing de cada tienda: Meta Pixel, Google Analytics 4 y Google Tag Manager.
 * Los IDs los carga el dueño en Admin > Marketing. Solo se activan en la vidriera (no en el panel).
 */
let initialized = false
let config = { metaPixelId: '', ga4Id: '', gtmId: '' }

const isValidId = (value, pattern) => typeof value === 'string' && pattern.test(value.trim())

const loadScript = (src) => {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

export const initTracking = (marketing = {}) => {
  if (initialized || typeof window === 'undefined') return
  config = {
    metaPixelId: isValidId(marketing.metaPixelId, /^\d{6,20}$/) ? marketing.metaPixelId.trim() : '',
    ga4Id: isValidId(marketing.ga4Id, /^G-[A-Z0-9]{4,15}$/i) ? marketing.ga4Id.trim() : '',
    gtmId: isValidId(marketing.gtmId, /^GTM-[A-Z0-9]{4,12}$/i) ? marketing.gtmId.trim() : ''
  }
  if (!config.metaPixelId && !config.ga4Id && !config.gtmId) return
  initialized = true

  if (config.metaPixelId) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    /* eslint-enable */
    window.fbq('init', config.metaPixelId)
  }

  if (config.ga4Id || config.gtmId) {
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments) }
  }
  if (config.ga4Id) {
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4Id)}`)
    window.gtag('js', new Date())
    // Las páginas vistas se envían manualmente en cada cambio de ruta (SPA)
    window.gtag('config', config.ga4Id, { send_page_view: false })
  }
  if (config.gtmId) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmId)}`)
  }
}

const toGaItem = (item) => ({
  item_id: item.id,
  item_name: item.name,
  item_brand: item.brand,
  item_variant: item.size,
  price: Number(item.price) || 0,
  quantity: Number(item.quantity) || 1
})

/**
 * Eventos estándar: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.
 */
export const trackEvent = (event, data = {}) => {
  if (!initialized || typeof window === 'undefined') return
  try {
    const value = Number(data.value ?? data.price ?? 0)
    const items = data.items || (data.id ? [data] : [])

    if (config.metaPixelId && window.fbq) {
      if (event === 'PageView') {
        window.fbq('track', 'PageView')
      } else {
        window.fbq('track', event, {
          content_ids: items.map(i => i.id),
          content_type: 'product',
          value,
          currency: 'ARS',
          ...(data.orderNumber ? { order_id: data.orderNumber } : {})
        })
      }
    }

    if ((config.ga4Id || config.gtmId) && window.gtag) {
      const gaEvent = {
        PageView: 'page_view',
        ViewContent: 'view_item',
        AddToCart: 'add_to_cart',
        InitiateCheckout: 'begin_checkout',
        Purchase: 'purchase'
      }[event]
      if (!gaEvent) return
      if (gaEvent === 'page_view') {
        window.gtag('event', 'page_view', { page_location: window.location.href, page_title: document.title })
      } else {
        window.gtag('event', gaEvent, {
          currency: 'ARS',
          value,
          items: items.map(toGaItem),
          ...(data.orderNumber ? { transaction_id: data.orderNumber } : {})
        })
      }
    }
  } catch (err) {
    console.warn('[Tracking]', err.message)
  }
}
