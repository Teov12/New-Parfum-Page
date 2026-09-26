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
    meta: { 
      title: 'Gicca Perfumes | Perfumes Importados & Árabes 100% Originales en Argentina',
      description: 'Tienda online de perfumes importados y árabes 100% originales en Argentina. Lattafa, Afnan, Armaf, Dior y más. Hasta 6 cuotas sin interés, 20% OFF por transferencia y envíos a todo el país.'
    }
  },
  {
    path: '/catalogo',
    name: 'catalog',
    component: CatalogView,
    meta: { 
      title: 'Catálogo de Perfumes Importados y Árabes | Gicca Perfumes Argentina',
      description: 'Explorá perfumes árabes, fragancias masculinas, femeninas y decants 100% originales. Comprá en cuotas sin interés con envíos a toda la Argentina.'
    }
  },
  {
    path: '/producto/:slug',
    name: 'product-detail',
    component: ProductDetailView,
    meta: { 
      title: 'Perfume Original | Gicca Perfumes Argentina',
      description: 'Fragancias 100% originales en caja cerrada con batch code y garantía de autenticidad en Gicca Perfumes.'
    }
  },
  {
    path: '/carrito',
    name: 'cart',
    component: CartView,
    meta: { 
      title: 'Bolsa de Compras | Gicca Perfumes',
      robots: 'noindex, follow'
    }
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: CheckoutView,
    meta: { 
      title: 'Finalizar Compra Segura | Gicca Perfumes',
      robots: 'noindex, nofollow'
    }
  },
  {
    path: '/checkout/success',
    name: 'checkout-success',
    component: CheckoutView,
    meta: { 
      title: '¡Pago Aprobado con Éxito! | Gicca Perfumes',
      robots: 'noindex, nofollow'
    }
  },
  {
    path: '/checkout/pending',
    name: 'checkout-pending',
    component: CheckoutView,
    meta: { 
      title: 'Pago en Proceso | Gicca Perfumes',
      robots: 'noindex, nofollow'
    }
  },
  {
    path: '/checkout/failure',
    name: 'checkout-failure',
    component: CheckoutView,
    meta: { 
      title: 'Pago No Concretado | Gicca Perfumes',
      robots: 'noindex, nofollow'
    }
  },
  {
    path: '/nosotros',
    redirect: '/'
  },
  {
    path: '/contacto',
    name: 'contact',
    component: ContactView,
    meta: { 
      title: 'Contacto & Asesoramiento en Fragancias | Gicca Perfumes Argentina',
      description: '¿Buscás un perfume en particular? Contactanos por WhatsApp o correo para recibir asesoramiento personalizado en fragancias importadas y árabes.'
    }
  },
  {
    path: '/quiz',
    name: 'quiz',
    component: QuizView,
    meta: { 
      title: 'Test Olfativo: Descubrí tu Perfume Ideal en 60s | Gicca Perfumes',
      description: 'Respondé 4 preguntas simples y encontrá el perfume que mejor combina con tu personalidad, estación del año y estilo de vida.'
    }
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
      },
      {
        path: 'tienda',
        name: 'admin-settings',
        component: () => import('../views/admin/AdminSettingsView.vue'),
        meta: { title: 'Mi Tienda & Pagos | Admin Gicca', requiresAuth: true }
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
