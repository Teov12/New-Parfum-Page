import { defineStore } from 'pinia'

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    items: [],
    stats: {
      ordersCount: 0,
      paidOrdersCount: 0,
      pendingPaymentCount: 0,
      pendingShippingCount: 0,
      deliveredCount: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      overallProfitMargin: 0,
      averageTicket: 0
    },
    isLoading: false,
    error: null
  }),

  actions: {
    async fetchOrders(filters = {}) {
      this.isLoading = true
      this.error = null
      try {
        const token = localStorage.getItem('gicca_admin_token')
        const headers = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const queryParams = new URLSearchParams()
        if (filters.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus)
        if (filters.fulfillmentStatus) queryParams.append('fulfillmentStatus', filters.fulfillmentStatus)
        if (filters.source) queryParams.append('source', filters.source)
        if (filters.q) queryParams.append('q', filters.q)

        const url = `/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error('Error al cargar ventas')
        const data = await res.json()
        this.items = data
        return data
      } catch (err) {
        this.error = err.message
        console.error('Error fetching orders:', err)
        return []
      } finally {
        this.isLoading = false
      }
    },

    async fetchStats() {
      try {
        const token = localStorage.getItem('gicca_admin_token')
        const headers = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch('/api/orders/stats', { headers })
        if (!res.ok) throw new Error('Error al cargar estadísticas')
        const data = await res.json()
        this.stats = data
        return data
      } catch (err) {
        console.error('Error fetching orders stats:', err)
        return null
      }
    },

    async createOrder(orderData) {
      this.isLoading = true
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al registrar pedido')
        this.items.unshift(data)
        await this.fetchStats()
        return { success: true, data }
      } catch (err) {
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    async updateOrder(id, updateData) {
      try {
        const token = localStorage.getItem('gicca_admin_token')
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`/api/orders/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateData)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al actualizar pedido')
        
        const index = this.items.findIndex(o => o.id === id || o.orderNumber === id)
        if (index !== -1) {
          this.items[index] = data
        }
        await this.fetchStats()
        return { success: true, data }
      } catch (err) {
        return { success: false, error: err.message }
      }
    },

    async deleteOrder(id) {
      try {
        const token = localStorage.getItem('gicca_admin_token')
        const headers = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`/api/orders/${id}`, {
          method: 'DELETE',
          headers
        })
        if (!res.ok) throw new Error('Error al eliminar pedido')
        this.items = this.items.filter(o => o.id !== id && o.orderNumber !== id)
        await this.fetchStats()
        return { success: true }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }
  }
})
