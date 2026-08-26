import { defineStore } from 'pinia'

export const useProductStore = defineStore('products', {
  state: () => ({
    items: [],
    loading: false,
    error: null,
    stats: {
      totalProducts: 0,
      totalBrands: 0,
      featuredCount: 0,
      bestSellerCount: 0,
      averagePrice: 0
    }
  }),

  getters: {
    allProducts: (state) => state.items,
    featuredProducts: (state) => state.items.filter(p => p.isFeatured),
    bestSellers: (state) => state.items.filter(p => p.isBestSeller),
    brandsList: (state) => {
      const set = new Set(state.items.map(p => p.brand).filter(Boolean))
      return Array.from(set).sort()
    },
    totalCount: (state) => state.items.length
  },

  actions: {
    async fetchProducts(filters = {}) {
      this.loading = true
      this.error = null
      try {
        const query = new URLSearchParams()
        if (filters.gender) query.append('gender', filters.gender)
        if (filters.category) query.append('category', filters.category)
        if (filters.family) query.append('family', filters.family)
        if (filters.brand) query.append('brand', filters.brand)
        if (filters.q) query.append('q', filters.q)

        const res = await fetch(`/api/products?${query.toString()}`)
        if (!res.ok) throw new Error('Error al cargar perfumes')
        const data = await res.json()
        this.items = data
        return data
      } catch (err) {
        console.error(err)
        this.error = err.message
        return []
      } finally {
        this.loading = false
      }
    },

    async fetchProduct(idOrSlug) {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(idOrSlug)}`)
        if (!res.ok) return null
        return await res.json()
      } catch (err) {
        console.error(err)
        return null
      }
    },

    async fetchStats() {
      try {
        const res = await fetch('/api/products/stats')
        if (res.ok) {
          this.stats = await res.json()
        }
      } catch (err) {
        console.error(err)
      }
    },

    async addProduct(productData) {
      this.loading = true
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Error al guardar el perfume')
        }
        const created = await res.json()
        this.items.unshift(created)
        await this.fetchStats()
        return { success: true, product: created }
      } catch (err) {
        return { success: false, error: err.message }
      } finally {
        this.loading = false
      }
    },

    async updateProduct(id, productData) {
      this.loading = true
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Error al actualizar el perfume')
        }
        const updated = await res.json()
        const index = this.items.findIndex(p => p.id === id || p.slug === id)
        if (index !== -1) {
          this.items[index] = updated
        }
        await this.fetchStats()
        return { success: true, product: updated }
      } catch (err) {
        return { success: false, error: err.message }
      } finally {
        this.loading = false
      }
    },

    async deleteProduct(id) {
      this.loading = true
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        })
        if (!res.ok) throw new Error('Error al eliminar el perfume')
        this.items = this.items.filter(p => p.id !== id && p.slug !== id)
        await this.fetchStats()
        return { success: true }
      } catch (err) {
        return { success: false, error: err.message }
      } finally {
        this.loading = false
      }
    },

    async uploadImage(file) {
      try {
        const formData = new FormData()
        formData.append('image', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        if (!res.ok) throw new Error('Error al subir la imagen')
        const data = await res.json()
        return { success: true, url: data.url }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }
  }
})
