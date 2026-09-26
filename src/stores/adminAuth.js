import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from './toast'
import { useProductStore } from './products'
import { useOrdersStore } from './orders'
import { useSiteContentStore } from './siteContent'

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const token = ref(localStorage.getItem('gicca_admin_token') || '')
  const adminUser = ref(null)
  const isVerifying = ref(false)
  const loginError = ref('')
  const isLoggingIn = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  /**
   * Verify token validity against the backend
   */
  const verifySession = async () => {
    if (!token.value) {
      adminUser.value = null
      return false
    }

    isVerifying.value = true
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token.value}` }
      })

      if (res.ok) {
        const data = await res.json()
        adminUser.value = data.user || { username: 'Admin Gicca', role: 'superadmin' }
        return true
      } else {
        logout(false)
        return false
      }
    } catch (err) {
      // If server unreachable, keep token unless unauthorized
      return true
    } finally {
      isVerifying.value = false
    }
  }

  /**
   * Attempt admin login
   */
  const login = async (password) => {
    loginError.value = ''
    if (!password || !password.trim()) {
      loginError.value = 'Por favor ingresá la contraseña de administrador'
      return false
    }

    isLoggingIn.value = true
    const toastStore = useToastStore()

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (!res.ok) {
        loginError.value = data.error || 'Contraseña de administrador incorrecta'
        return false
      }

      token.value = data.token
      adminUser.value = data.user || { username: 'Admin Gicca', role: 'superadmin' }
      localStorage.setItem('gicca_admin_token', data.token)
      toastStore.show('¡Bienvenido al Panel de Administración!', 'success')

      // Pre-load data in background
      loadDashboardData()
      return true
    } catch (err) {
      loginError.value = 'Error al conectar con el servidor backend'
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  /**
   * Logout and clear admin credentials
   */
  const logout = (notify = true) => {
    token.value = ''
    adminUser.value = null
    localStorage.removeItem('gicca_admin_token')

    if (notify) {
      const toastStore = useToastStore()
      toastStore.show('Sesión cerrada correctamente', 'info')
    }
  }

  /**
   * Load dashboard data for admin
   */
  const loadDashboardData = async () => {
    const productStore = useProductStore()
    const ordersStore = useOrdersStore()
    const siteContentStore = useSiteContentStore()

    await Promise.allSettled([
      productStore.fetchProducts(),
      productStore.fetchStats(),
      ordersStore.fetchOrders(),
      ordersStore.fetchStats(),
      siteContentStore.fetchSiteContent()
    ])
  }

  return {
    token,
    adminUser,
    isVerifying,
    loginError,
    isLoggingIn,
    isAuthenticated,
    verifySession,
    login,
    logout,
    loadDashboardData
  }
})
