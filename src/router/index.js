import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CatalogView from '../views/CatalogView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import CartView from '../views/CartView.vue'
import CheckoutView from '../views/CheckoutView.vue'
import AboutView from '../views/AboutView.vue'
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
    name: 'about',
    component: AboutView,
    meta: { title: 'El Atelier & Filosofía | Gicca Perfumes' }
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
  next()
})

export default router
