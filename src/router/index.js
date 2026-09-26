import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CatalogView from '../views/CatalogView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import CartView from '../views/CartView.vue'
import CheckoutView from '../views/CheckoutView.vue'
import ContactView from '../views/ContactView.vue'
import QuizView from '../views/QuizView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'Gicca Perfumes | Inicio' }
  },
  {
    path: '/catalogo',
    name: 'catalog',
    component: CatalogView,
    meta: { title: 'Perfumes & Fragancias | Gicca Perfumes' }
  },
  {
    path: '/producto/:slug',
    name: 'product-detail',
    component: ProductDetailView,
    meta: { title: 'Detalle de Fragancia | Gicca Perfumes' }
  },
  {
    path: '/carrito',
    name: 'cart',
    component: CartView,
    meta: { title: 'Tu Carrito | Gicca Perfumes' }
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: CheckoutView,
    meta: { title: 'Finalizar Compra | Gicca Perfumes' }
  },
  {
    path: '/nosotros',
    redirect: '/'
  },
  {
    path: '/contacto',
    name: 'contact',
    component: ContactView,
    meta: { title: 'Contacto & Asesoramiento | Gicca Perfumes' }
  },
  {
    path: '/quiz',
    name: 'quiz',
    component: QuizView,
    meta: { title: 'Encontrá tu Perfume Ideal | Gicca Perfumes' }
  },
  // Admin Login (Standalone)
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/AdminLoginView.vue'),
    meta: { title: 'Acceso Administración | Gicca Perfumes' }
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
        meta: { title: 'Ventas & Pedidos | Admin Gicca', requiresAuth: true }
      },
      {
        path: 'productos',
        name: 'admin-products',
        component: () => import('../views/admin/AdminProductsView.vue'),
        meta: { title: 'Perfumes & Catálogo | Admin Gicca', requiresAuth: true }
      },
      {
        path: 'finanzas',
        name: 'admin-finances',
        component: () => import('../views/admin/AdminFinancesView.vue'),
        meta: { title: 'Finanzas & Rentabilidad | Admin Gicca', requiresAuth: true }
      },
      {
        path: 'diseno',
        name: 'admin-design',
        component: () => import('../views/admin/AdminDesignView.vue'),
        meta: { title: 'Diseño & Contenido | Admin Gicca', requiresAuth: true }
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
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// Navigation Guards: Page Title & Auth Protection
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
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
  if (to.name === 'admin-login' && token) {
    next({ name: 'admin-sales' })
    return
  }

  next()
})

export default router
