/**
 * Vista previa de una tienda desde la consola de superadmin (/?tenant=<id>).
 * Mientras dure la pestaña, todas las llamadas a /api viajan con el header x-tenant-id de esa tienda.
 * Se importa primero en main.js para que corra antes de que se creen los stores.
 */
const readPreview = () => {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has('tenant')) {
      const value = (params.get('tenant') || '').trim().toLowerCase()
      if (value) sessionStorage.setItem('preview_tenant', value)
      else sessionStorage.removeItem('preview_tenant')
    }
    return sessionStorage.getItem('preview_tenant') || ''
  } catch {
    return ''
  }
}

export const previewTenantId = typeof window !== 'undefined' ? readPreview() : ''

if (previewTenantId) {
  // La configuración inyectada en el HTML corresponde al dominio, no a la tienda en vista previa
  delete window.__TENANT__

  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url
    if (url.startsWith('/api/')) {
      const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers))
      if (!headers.has('x-tenant-id')) headers.set('x-tenant-id', previewTenantId)
      init = { ...init, headers }
    }
    return originalFetch(input, init)
  }
}
