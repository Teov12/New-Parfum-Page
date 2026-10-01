import { defineStore } from 'pinia'
import { applyTheme } from '@/utils/themePresets.js'

// Utility function to update favicon dynamically in the document head
export function applyDynamicFavicon(branding, storeName) {
  if (typeof document === 'undefined') return
  try {
    const customImage = branding?.iconUrl || branding?.faviconUrl || branding?.logoUrl || '/favicon.png'

    const links = document.querySelectorAll("link[rel*='icon']")
    if (links && links.length > 0) {
      links.forEach(l => {
        l.href = customImage
        if (customImage.endsWith('.png')) l.type = 'image/png'
      })
      return
    }

    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = customImage.endsWith('.png') ? 'image/png' : 'image/svg+xml'
    link.href = customImage
    document.head.appendChild(link)
  } catch (err) {
    console.warn('[Tenant] Error updating favicon:', err)
  }
}

// Configuración pública que el servidor inyecta en el HTML (evita mostrar otra marca mientras carga)
const bootTenant = typeof window !== 'undefined' ? window.__TENANT__ : null

const emptyState = () => ({
  tenantId: '',
  name: '',
  slug: '',
  domain: '',
  subdomain: '',
  status: 'active',
  isPlatformHost: false,
  platform: { name: 'Perfumerías Online', domain: '' },
  branding: {
    tagline: '',
    logoUrl: '',
    iconUrl: '',
    storeIcon: 'spa',
    faviconUrl: '',
    paletteId: 'amber',
    primaryColor: '#2E1911',
    primaryContainer: '#784233',
    surface: '#fffdfa',
    whatsappNumber: '',
    instagram: '',
    instagramUrl: ''
  },
  commercial: {
    alias: '',
    cbu: '',
    bankName: '',
    accountHolder: '',
    cardFeeRate: 28,
    maxInstallments: 6,
    freeShippingThreshold: 250000
  },
  legal: {},
  marketing: {}
})

const applyPayload = (state, data) => {
  state.tenantId = data.tenantId
  state.name = data.name || ''
  state.slug = data.slug || ''
  state.domain = data.domain || ''
  state.subdomain = data.subdomain || ''
  state.status = data.status || 'active'
  state.isPlatformHost = Boolean(data.isPlatformHost)
  state.platform = data.platform || state.platform
  state.branding = { ...state.branding, ...(data.branding || {}) }
  state.commercial = { ...state.commercial, ...(data.commercial || {}) }
  state.legal = data.legal || {}
  state.marketing = data.marketing || {}
}

export const useTenantStore = defineStore('tenant', {
  state: () => {
    const state = {
      ...emptyState(),
      isLoaded: false,
      loading: false,
      error: null
    }
    if (bootTenant?.tenantId) {
      applyPayload(state, bootTenant)
      state.isLoaded = true
    }
    return state
  },

  getters: {
    storeName: (state) => state.name || 'Mi Tienda',
    storeLogo: (state) => state.branding?.logoUrl || '',
    storeIconUrl: (state) => state.branding?.iconUrl || '',
    storeIcon: (state) => state.branding?.storeIcon || 'spa',
    whatsappNumber: (state) => state.branding?.whatsappNumber || '',
    whatsappUrl: (state) => {
      const clean = (state.branding?.whatsappNumber || '').replace(/[^0-9]/g, '')
      return clean ? `https://wa.me/${clean}` : ''
    },
    instagramUrl: (state) => {
      if (state.branding?.instagramUrl) return state.branding.instagramUrl
      const handle = (state.branding?.instagram || '').replace('@', '').trim()
      return handle ? `https://instagram.com/${handle}` : ''
    },
    instagramHandle: (state) => {
      const raw = state.branding?.instagram || state.branding?.instagramUrl || ''
      const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/[@/]/g, '').trim()
      return handle ? `@${handle}` : ''
    },
    cardFeeRate: (state) => Number(state.commercial?.cardFeeRate ?? 28),
    maxInstallments: (state) => Number(state.commercial?.maxInstallments ?? 6),
    // 0 = la tienda no ofrece envío gratis
    freeShippingThreshold: (state) => {
      const value = Number(state.commercial?.freeShippingThreshold ?? 250000)
      return value > 0 ? value : Infinity
    },
    bankDetails: (state) => state.commercial || {},
    isSuspended: (state) => state.status === 'suspended',
    isNotFound: (state) => state.status === 'not_found',
    platformName: (state) => state.platform?.name || 'Perfumerías Online'
  },

  actions: {
    async fetchCurrentTenant(force = false) {
      if (this.isLoaded && !force) {
        applyDynamicFavicon(this.branding, this.name)
        applyTheme(this.branding)
        return
      }
      this.loading = true
      try {
        const res = await fetch('/api/tenant/current')
        if (res.ok) {
          const data = await res.json()
          if (data && data.tenantId) {
            applyPayload(this, data)
            applyDynamicFavicon(this.branding, this.name)
            applyTheme(this.branding)
          }
        }
      } catch (err) {
        console.warn('[TenantStore] Error al cargar tenant:', err.message)
      } finally {
        this.loading = false
        this.isLoaded = true
      }
    },

    async uploadIcon(file) {
      const formData = new FormData()
      formData.append('images', file)
      const token = localStorage.getItem('gicca_admin_token') || ''

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir ícono')
      return data.url || (data.urls && data.urls[0])
    },

    async updateSettings(settingsData) {
      const token = localStorage.getItem('gicca_admin_token') || ''
      const res = await fetch('/api/tenant/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settingsData)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error actualizando tienda')
      }

      const result = await res.json()
      if (result.tenant) {
        this.name = result.tenant.name || this.name
        if (result.tenant.domain !== undefined) this.domain = result.tenant.domain || ''
        if (result.tenant.subdomain !== undefined) this.subdomain = result.tenant.subdomain || ''
        if (result.tenant.branding) {
          this.branding = { ...this.branding, ...result.tenant.branding }
        }
        if (result.tenant.commercial) {
          const { alias, cbu, bankName, accountHolder, cardFeeRate, maxInstallments, freeShippingThreshold } = result.tenant.commercial
          this.commercial = { ...this.commercial, alias, cbu, bankName, accountHolder, cardFeeRate, maxInstallments, freeShippingThreshold }
        }
        if (result.tenant.legal) this.legal = { ...this.legal, ...result.tenant.legal }
        if (result.tenant.marketing) this.marketing = { ...this.marketing, ...result.tenant.marketing }
        applyDynamicFavicon(this.branding, this.name)
        applyTheme(this.branding)
      }
      return result
    },

    previewTheme(branding) {
      if (branding) {
        applyTheme(branding)
      }
    }
  }
})
