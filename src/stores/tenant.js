import { defineStore } from 'pinia'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenantId: 'gicca',
    name: 'Gicca Perfumes',
    slug: 'gicca',
    domain: '',
    subdomain: '',
    branding: {
      tagline: 'Alta Perfumería y Fragancias Exclusivas',
      logo: '',
      favicon: '',
      primaryColor: '#D4AF37',
      whatsappNumber: '5493512345678',
      instagram: '@giccaparfum'
    },
    commercial: {
      alias: 'GICCA.PERFUMES.MP',
      cbu: '0000003100010000000000',
      bankName: 'Mercado Pago',
      accountHolder: 'Gicca Perfumes S.A.',
      cardFeeRate: 20,
      freeShippingThreshold: 250000
    },
    isLoaded: false,
    loading: false,
    error: null
  }),

  getters: {
    storeName: (state) => state.name || 'Gicca Perfumes',
    whatsappNumber: (state) => state.branding?.whatsappNumber || '5493512345678',
    whatsappUrl: (state) => {
      const clean = (state.branding?.whatsappNumber || '').replace(/[^0-9]/g, '')
      return `https://wa.me/${clean}`
    },
    instagramUrl: (state) => {
      const handle = (state.branding?.instagram || '').replace('@', '').trim()
      return handle ? `https://instagram.com/${handle}` : 'https://instagram.com'
    },
    cardFeeRate: (state) => Number(state.commercial?.cardFeeRate ?? 20),
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
          }
        }
      } catch (err) {
        console.warn('[TenantStore] Error al cargar tenant:', err.message)
      } finally {
        this.loading = false
        this.isLoaded = true
      }
    },

    async updateSettings(settingsData) {
      const token = localStorage.getItem('gicca_token')
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
        if (result.tenant.branding) this.branding = { ...this.branding, ...result.tenant.branding }
        if (result.tenant.commercial) this.commercial = { ...this.commercial, ...result.tenant.commercial }
      }
      return result
    }
  }
})
