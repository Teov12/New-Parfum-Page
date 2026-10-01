import { defineStore } from 'pinia'

const TOKEN_KEY = 'customer_token'

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

const request = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api/customers${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error || 'No pudimos completar la operación')
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

// Cuenta del comprador en la tienda actual
export const useCustomerStore = defineStore('customer', {
  state: () => ({
    token: readToken(),
    customer: null,
    orders: [],
    isLoading: false
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token && state.customer)
  },

  actions: {
    setSession({ token, customer }) {
      this.token = token
      this.customer = customer
      try { localStorage.setItem(TOKEN_KEY, token) } catch { /* sin almacenamiento */ }
    },

    logout() {
      this.token = ''
      this.customer = null
      this.orders = []
      try { localStorage.removeItem(TOKEN_KEY) } catch { /* sin almacenamiento */ }
    },

    async fetchMe() {
      if (!this.token) return null
      try {
        const data = await request('/me', { token: this.token })
        this.customer = data.customer
        return data.customer
      } catch (err) {
        if (err.status === 401) this.logout()
        return null
      }
    },

    async register(payload) {
      return request('/register', { method: 'POST', body: payload })
    },

    async verify(email, code) {
      const data = await request('/verify', { method: 'POST', body: { email, code } })
      this.setSession(data)
      return data
    },

    async resendCode(email, purpose = 'verify') {
      return request('/resend-code', { method: 'POST', body: { email, purpose } })
    },

    async login(email, password) {
      const data = await request('/login', { method: 'POST', body: { email, password } })
      this.setSession(data)
      return data
    },

    async resetPassword(email, code, password) {
      const data = await request('/reset-password', { method: 'POST', body: { email, code, password } })
      this.setSession(data)
      return data
    },

    async updateProfile(payload) {
      const data = await request('/me', { method: 'PUT', body: payload, token: this.token })
      this.customer = data.customer
      return data.customer
    },

    async fetchOrders() {
      this.isLoading = true
      try {
        const data = await request('/orders', { token: this.token })
        this.orders = data.orders || []
        return this.orders
      } finally {
        this.isLoading = false
      }
    }
  }
})
