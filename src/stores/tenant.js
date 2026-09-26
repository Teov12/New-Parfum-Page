import { defineStore } from 'pinia'

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

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenantId: 'gicca',
    name: 'Gicca Perfumes',
    slug: 'gicca',
    domain: '',
    subdomain: '',
    branding: {
      tagline: 'Alta Perfumería y Fragancias Exclusivas',
      logoUrl: '',
      iconUrl: '/uploads/perfume_1790448931002_az0ndj.png',
      storeIcon: 'spa',
      faviconUrl: '/favicon.png',
      primaryColor: '#2E1911',
      whatsappNumber: '5493564622055',
      instagram: '@giccaparfum'
    },
    commercial: {
      alias: 'GICCA.PERFUMES.MP',
      cbu: '0000003100010000000000',
      bankName: 'Mercado Pago',
      accountHolder: 'Gicca Perfumes S.A.',
      cardFeeRate: 28,
      freeShippingThreshold: 250000
    },
    isLoaded: false,
    loading: false,
    error: null
  }),

  getters: {
    storeName: (state) => state.name || 'Gicca Perfumes',
    storeLogo: (state) => state.branding?.logoUrl || '',
    storeIconUrl: (state) => state.branding?.iconUrl || '',
    storeIcon: (state) => state.branding?.storeIcon || 'spa',
    whatsappNumber: (state) => state.branding?.whatsappNumber || '5493564622055',
    whatsappUrl: (state) => {
      const clean = (state.branding?.whatsappNumber || '').replace(/[^0-9]/g, '')
      return `https://wa.me/${clean}`
    },
    instagramUrl: (state) => {
      const handle = (state.branding?.instagram || '').replace('@', '').trim()
      return handle ? `https://instagram.com/${handle}` : 'https://instagram.com'
    },
    cardFeeRate: (state) => Number(state.commercial?.cardFeeRate ?? 28),
    freeShippingThreshold: (state) => Number(state.commercial?.freeShippingThreshold ?? 250000),
    bankDetails: (state) => state.commercial || {}
  },

  actions: {
    async fetchCurrentTenant() {
      if (this.isLoaded) return
      this.loading = true
      try {
        const res = await fetch('/api/tenant/current')
        if (res.ok) {
          const data = await res.json()
          if (data && data.tenantId) {
            this.tenantId = data.tenantId
            this.name = data.name || this.name
            this.slug = data.slug || this.slug
            this.domain = data.domain || ''
            this.subdomain = data.subdomain || ''
            if (data.branding) {
              this.branding = { ...this.branding, ...data.branding }
            }
            if (data.commercial) {
              this.commercial = { ...this.commercial, ...data.commercial }
            }
            applyDynamicFavicon(this.branding, this.name)
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
      const token = localStorage.getItem('gicca_admin_token') || 'gicca_admin_token_secure_2026'

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
      const token = localStorage.getItem('gicca_admin_token') || localStorage.getItem('gicca_token') || 'gicca_admin_token_secure_2026'
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
        if (result.tenant.branding) {
          this.branding = { ...this.branding, ...result.tenant.branding }
        }
        if (result.tenant.commercial) {
          this.commercial = { ...this.commercial, ...result.tenant.commercial }
        }
        applyDynamicFavicon(this.branding, this.name)
      }
      return result
    }
  }
})
