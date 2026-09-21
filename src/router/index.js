import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const CatalogView = () => import('../views/CatalogView.vue')
const ProductDetailView = () => import('../views/ProductDetailView.vue')
const CartView = () => import('../views/CartView.vue')
const CheckoutView = () => import('../views/CheckoutView.vue')
const ContactView = () => import('../views/ContactView.vue')
const QuizView = () => import('../views/QuizView.vue')
const AdminView = () => import('../views/AdminView.vue')

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
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { 
      title: 'Panel de Administración | Gicca Perfumes',
      robots: 'noindex, nofollow'
    }
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

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // Meta description
  if (to.meta.description) {
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', to.meta.description)
  }

  // Meta robots
  let metaRobots = document.querySelector('meta[name="robots"]')
  if (!metaRobots) {
    metaRobots = document.createElement('meta')
    metaRobots.setAttribute('name', 'robots')
    document.head.appendChild(metaRobots)
  }
  metaRobots.setAttribute('content', to.meta.robots || 'index, follow')

  next()
})

export default router
