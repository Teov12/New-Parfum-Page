import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CatalogView from '../views/CatalogView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import CartView from '../views/CartView.vue'
import CheckoutView from '../views/CheckoutView.vue'
import ContactView from '../views/ContactView.vue'
import QuizView from '../views/QuizView.vue'
import { useTenantStore } from '@/stores/tenant'

// Los títulos usan {store}: se reemplaza por el nombre de la tienda actual
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '{store} | Perfumes Originales' }
  },
  {
    path: '/catalogo',
    name: 'catalog',
    component: CatalogView,
    meta: { title: 'Catálogo de Perfumes | {store}' }
  },
  {
    path: '/producto/:slug',
    name: 'product-detail',
    component: ProductDetailView,
    meta: { title: 'Perfume Original | {store}' }
  },
  {
    path: '/carrito',
    name: 'cart',
    component: CartView,
    meta: { title: 'Bolsa de Compras | {store}' }
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: CheckoutView,
    meta: { title: 'Finalizar Compra Segura | {store}' }
  },
  {
    path: '/checkout/success',
    name: 'checkout-success',
    component: CheckoutView,
    meta: { title: '¡Gracias por tu compra! | {store}' }
  },
  {
    path: '/checkout/pending',
    name: 'checkout-pending',
    component: CheckoutView,
    meta: { title: 'Pago en Proceso | {store}' }
  },
  {
    path: '/checkout/failure',
    name: 'checkout-failure',
    component: CheckoutView,
    meta: { title: 'Pago No Concretado | {store}' }
  },
  {
    path: '/pedido/:orderNumber',
    name: 'order-status',
    component: () => import('../views/OrderStatusView.vue'),
    meta: { title: 'Estado de tu pedido | {store}' }
  },
  {
    path: '/nosotros',
    redirect: '/'
  },
  {
    path: '/contacto',
    name: 'contact',
    component: ContactView,
    meta: { title: 'Contacto & Asesoramiento | {store}' }
  },
  {
    path: '/quiz',
    name: 'quiz',
    component: QuizView,
    meta: { title: 'Test Olfativo: Descubrí tu Perfume Ideal | {store}' }
  },
  // Sitio de la plataforma (alta de nuevas perfumerías)
  {
    path: '/plataforma',
    name: 'platform-landing',
    component: () => import('../views/platform/PlatformLandingView.vue'),
    meta: { title: '{platform} | Creá la tienda online de tu perfumería', platform: true }
  },
  {
    path: '/crear-tienda',
    name: 'platform-signup',
    component: () => import('../views/platform/SignupView.vue'),
    meta: { title: 'Creá tu tienda | {platform}', platform: true }
  },
  // Superadmin SaaS Command Center
  {
    path: '/superadmin',
    name: 'superadmin',
    component: () => import('../views/admin/SuperAdminView.vue'),
    meta: { title: 'Consola de la Plataforma | {platform}', requiresAuth: true }
  },
  // Admin Login (Standalone)
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/AdminLoginView.vue'),
    meta: { title: 'Acceso Administración | {store}' }
  },
  // Admin Dashboard (Layout with Child Views)
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'admin-sales' }
      },
      {
        path: 'ventas',
        name: 'admin-sales',
        component: () => import('../views/admin/AdminSalesView.vue'),
        meta: { title: 'Ventas & Pedidos | Admin {store}', requiresAuth: true }
      },
      {
        path: 'productos',
        name: 'admin-products',
        component: () => import('../views/admin/AdminProductsView.vue'),
        meta: { title: 'Perfumes & Catálogo | Admin {store}', requiresAuth: true }
      },
      {
        path: 'finanzas',
        name: 'admin-finances',
        component: () => import('../views/admin/AdminFinancesView.vue'),
        meta: { title: 'Finanzas & Rentabilidad | Admin {store}', requiresAuth: true }
      },
      {
        path: 'diseno',
        alias: 'diseño',
        name: 'admin-design',
        component: () => import('../views/admin/AdminDesignView.vue'),
        meta: { title: 'Diseño & Contenido | Admin {store}', requiresAuth: true }
      },
      {
        path: 'tienda',
        name: 'admin-settings',
        component: () => import('../views/admin/AdminSettingsView.vue'),
        meta: { title: 'Mi Tienda & Pagos | Admin {store}', requiresAuth: true }
      },
      {
        path: 'plan',
        name: 'admin-plan',
        component: () => import('../views/admin/AdminPlanView.vue'),
        meta: { title: 'Mi Plan | Admin {store}', requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    // Return a Promise synchronized with the page-fade leave transition (180ms)
    // so the new page renders cleanly from the top without layout thrashing from bottom scrolls
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ top: 0, left: 0 })
      }, 190)
    })
  }
})

// Navigation Guards: Page Title & Auth Protection
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    const tenantStore = useTenantStore()
    document.title = to.meta.title
      .replace('{store}', tenantStore.storeName)
      .replace('{platform}', tenantStore.platformName)
  }

  const token = localStorage.getItem('gicca_admin_token')

  // Protect Admin Routes
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token) {
      next({
        name: 'admin-login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }

  // If already logged in and heading to login screen, redirect to sales
  // (salvo que traiga un acceso nuevo desde el registro de la tienda)
  if (to.name === 'admin-login' && token && !to.hash.includes('acceso=')) {
    next({ name: 'admin-sales' })
    return
  }

  next()
})

export default router
