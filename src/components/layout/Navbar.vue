<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import SearchModal from '@/components/ui/SearchModal.vue'

const cartStore = useCartStore()
const wishlistStore = useWishlistStore()
const route = useRoute()

const isSearchOpen = ref(false)
const isMobileMenuOpen = ref(false)

const navLinks = [
  { name: 'Inicio', path: '/' },
  { name: 'Perfumes', path: '/catalogo' },
  { name: 'Woman', path: '/catalogo?gender=woman' },
  { name: 'Man', path: '/catalogo?gender=man' },
  { name: 'Unisex', path: '/catalogo?gender=unisex' },
  { name: 'Ofertas', path: '/catalogo?offers=true' },
  { name: 'El Atelier', path: '/nosotros' },
  { name: 'Contacto', path: '/contacto' }
]

const isActive = (path) => {
  if (path === '/' && route.path === '/') return true
  if (path !== '/' && route.fullPath.startsWith(path)) return true
  return false
}
</script>

<template>
  <nav class="bg-surface sticky top-0 z-40 border-b border-outline-variant shadow-xs transition-all">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-4 flex justify-between items-center">
      
      <!-- Brand Logo -->
      <RouterLink to="/" class="flex items-baseline gap-2 group">
        <span class="font-serif text-2xl sm:text-3xl text-primary font-normal tracking-tight group-hover:text-primary-container transition-colors">
          Gicca Perfumes
        </span>
        <span class="hidden sm:inline-block font-label text-[10px] text-secondary uppercase tracking-widest border-l border-outline-variant pl-2">
          Boutique de Alta Perfumería
        </span>
      </RouterLink>

      <!-- Desktop Navigation Links -->
      <div class="hidden lg:flex items-center gap-7">
        <RouterLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.path"
          class="font-label text-label-sm uppercase tracking-wider transition-all duration-200 relative py-1 px-2.5 rounded-full"
          :class="isActive(link.path) 
            ? 'text-primary font-bold bg-surface-container' 
            : 'text-secondary hover:text-primary hover:bg-surface-container/50'"
        >
          {{ link.name }}
        </RouterLink>
      </div>

      <!-- Action Icons (Search, Wishlist, Cart, Mobile Menu) -->
      <div class="flex items-center gap-2 sm:gap-3 text-primary">
        <!-- Search Trigger -->
        <button 
          @click="isSearchOpen = true"
          class="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors duration-200"
          aria-label="Buscar fragancias"
          title="Buscar fragancias"
        >
          <span class="material-symbols-outlined text-2xl">search</span>
        </button>

        <!-- Wishlist Link -->
        <RouterLink 
          to="/catalogo?wishlist=true" 
          class="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors duration-200 relative hidden sm:flex"
          aria-label="Lista de Deseos"
          title="Favoritos"
        >
          <span class="material-symbols-outlined text-2xl">favorite</span>
          <span 
            v-if="wishlistStore.totalItems > 0"
            class="absolute top-1 right-1 bg-secondary text-surface text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-label font-bold shadow-xs"
          >
            {{ wishlistStore.totalItems }}
          </span>
        </RouterLink>

        <!-- Cart Trigger Drawer -->
        <button 
          @click="cartStore.openDrawer"
          class="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors duration-200 relative"
          aria-label="Bolsa de Compras"
          title="Tu Bolsa"
        >
          <span class="material-symbols-outlined text-2xl">shopping_cart</span>
          <span 
            v-if="cartStore.totalItems > 0"
            class="absolute top-1 right-1 bg-primary-container text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-label font-bold animate-pulse shadow-xs"
          >
            {{ cartStore.totalItems }}
          </span>
        </button>

        <!-- Mobile Menu Toggle -->
        <button 
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="lg:hidden w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors"
          aria-label="Menú de navegación"
        >
          <span class="material-symbols-outlined text-2xl">{{ isMobileMenuOpen ? 'close' : 'menu' }}</span>
        </button>
      </div>
    </div>

    <!-- Mobile Dropdown Menu -->
    <div 
      v-if="isMobileMenuOpen" 
      class="lg:hidden bg-surface border-t border-outline-variant px-margin-mobile py-6 space-y-4 shadow-lg rounded-b-3xl animate-in slide-in-from-top-2 duration-200"
    >
      <div class="flex flex-col space-y-2">
        <RouterLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.path"
          @click="isMobileMenuOpen = false"
          class="font-label text-sm uppercase tracking-widest py-2.5 px-3 rounded-xl flex justify-between items-center transition-colors"
          :class="isActive(link.path) ? 'text-primary font-bold bg-surface-container' : 'text-secondary hover:bg-surface-container-low'"
        >
          <span>{{ link.name }}</span>
          <span class="material-symbols-outlined text-sm">chevron_right</span>
        </RouterLink>
      </div>

      <div class="pt-4 border-t border-outline-variant flex justify-between items-center text-xs font-label text-secondary uppercase tracking-widest">
        <span>Gicca Perfumes Boutique</span>
        <RouterLink to="/quiz" @click="isMobileMenuOpen = false" class="text-primary underline font-bold">
          Quiz Olfativo
        </RouterLink>
      </div>
    </div>

    <!-- Search Modal Component -->
    <SearchModal :is-open="isSearchOpen" @close="isSearchOpen = false" />
  </nav>
</template>
