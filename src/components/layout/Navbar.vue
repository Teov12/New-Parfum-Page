<script setup>
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useTenantStore } from '@/stores/tenant'
import SearchModal from '@/components/ui/SearchModal.vue'

const cartStore = useCartStore()
const wishlistStore = useWishlistStore()
const tenantStore = useTenantStore()
const route = useRoute()

const isSearchOpen = ref(false)
const isMobileMenuOpen = ref(false)
const isCartPopping = ref(false)
const isWishlistPopping = ref(false)

watch(() => cartStore.totalItems, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    isCartPopping.value = true
    setTimeout(() => { isCartPopping.value = false }, 350)
  }
})

watch(() => wishlistStore.totalItems, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    isWishlistPopping.value = true
    setTimeout(() => { isWishlistPopping.value = false }, 350)
  }
})

const navLinks = [
  { name: 'Masculino', path: '/catalogo?gender=man' },
  { name: 'Femenino', path: '/catalogo?gender=woman' },
  { name: 'Unisex', path: '/catalogo?gender=unisex' },
  { name: 'Árabes', path: '/catalogo?category=arabes' },
  { name: 'Diseñador', path: '/catalogo?category=disenador' }
]

const isActive = (path) => {
  if (path === '/' && route.path === '/') return true
  if (path !== '/' && route.fullPath === path) return true
  return false
}
</script>

<template>
  <nav class="bg-surface sticky top-0 z-40 border-b border-outline-variant shadow-xs transition-all">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-4 flex justify-between items-center">
      
      <!-- Brand Logo & Store Icon -->
      <RouterLink to="/" class="flex items-center gap-2.5 sm:gap-3 group">
        <!-- Custom Image Icon -->
        <img 
          v-if="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
          :src="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
          :alt="tenantStore.storeName" 
          class="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl shadow-2xs group-hover:scale-105 transition-transform" 
        />
        <!-- Material Symbol Icon Badge -->
        <div 
          v-else 
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container text-amber-200 flex items-center justify-center shadow-xs border border-primary/20 group-hover:scale-105 transition-transform flex-shrink-0"
        >
          <span class="material-symbols-outlined text-lg sm:text-xl">{{ tenantStore.branding?.storeIcon || 'spa' }}</span>
        </div>

        <span class="font-sans text-2xl sm:text-3xl text-primary font-normal tracking-tight group-hover:text-primary-container transition-colors">
          {{ tenantStore.storeName || 'Gicca Perfumes' }}
        </span>
      </RouterLink>

      <!-- Desktop Navigation Links -->
      <div class="hidden lg:flex items-center gap-6">
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

        <!-- Quiz Olfativo Button -->
        <RouterLink
          to="/quiz"
          class="font-label text-label-sm uppercase tracking-wider transition-all duration-200 py-1.5 px-3.5 rounded-full flex items-center gap-1.5 border border-primary/20 bg-amber-50/70 hover:bg-amber-100/90 text-primary font-bold shadow-2xs group hover:scale-105 active:scale-95"
          :class="isActive('/quiz') ? '!bg-primary !text-amber-200' : ''"
          title="Descubrí tu perfume ideal en 60 segundos"
        >
          <span class="material-symbols-outlined text-sm text-amber-700 group-hover:rotate-12 transition-transform">auto_awesome</span>
          <span>Quiz Olfativo</span>
        </RouterLink>
      </div>

      <!-- Action Icons (Search, Wishlist, Cart, Mobile Menu) -->
      <div class="flex items-center gap-2 sm:gap-3 text-primary">
        <!-- Search Trigger -->
        <button 
          @click="isSearchOpen = true"
          class="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Buscar fragancias"
          title="Buscar fragancias"
        >
          <span class="material-symbols-outlined text-2xl">search</span>
        </button>

        <!-- Wishlist Link -->
        <RouterLink 
          to="/catalogo?wishlist=true" 
          class="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-all duration-200 relative hidden sm:flex hover:scale-110 active:scale-95"
          aria-label="Lista de Deseos"
          title="Favoritos"
        >
          <span class="material-symbols-outlined text-2xl">favorite</span>
          <span 
            v-if="wishlistStore.totalItems > 0"
            class="absolute top-1 right-1 bg-secondary text-surface text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-label font-bold shadow-xs"
            :class="{ 'animate-badge-pop': isWishlistPopping }"
          >
            {{ wishlistStore.totalItems }}
          </span>
        </RouterLink>

        <!-- Cart Trigger Drawer -->
        <button 
          @click="cartStore.openDrawer"
          class="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-all duration-200 relative hover:scale-110 active:scale-95"
          aria-label="Bolsa de Compras"
          title="Tu Bolsa"
        >
          <span class="material-symbols-outlined text-2xl">shopping_cart</span>
          <span 
            v-if="cartStore.totalItems > 0"
            class="absolute top-1 right-1 bg-primary-container text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-label font-bold shadow-xs"
            :class="{ 'animate-badge-pop': isCartPopping }"
          >
            {{ cartStore.totalItems }}
          </span>
        </button>

        <!-- Mobile Menu Toggle -->
        <button 
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="lg:hidden w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Menú de navegación"
        >
          <span class="material-symbols-outlined text-2xl">{{ isMobileMenuOpen ? 'close' : 'menu' }}</span>
        </button>
      </div>
    </div>

    <!-- Mobile Dropdown Menu with Transition -->
    <Transition name="slide-down">
      <div 
        v-if="isMobileMenuOpen" 
        class="lg:hidden bg-surface border-t border-outline-variant px-margin-mobile py-6 space-y-4 shadow-xl rounded-b-3xl"
      >
        <div class="flex flex-col space-y-2">
          <RouterLink
            v-for="link in navLinks"
            :key="link.name"
            :to="link.path"
            @click="isMobileMenuOpen = false"
            class="font-label text-sm uppercase tracking-widest py-2.5 px-3 rounded-xl flex justify-between items-center transition-all hover:translate-x-1"
            :class="isActive(link.path) ? 'text-primary font-bold bg-surface-container' : 'text-secondary hover:bg-surface-container-low'"
          >
            <span>{{ link.name }}</span>
            <span class="material-symbols-outlined text-sm">chevron_right</span>
          </RouterLink>

          <!-- Mobile Wishlist Link -->
          <RouterLink
            to="/catalogo?wishlist=true"
            @click="isMobileMenuOpen = false"
            class="font-label text-sm uppercase tracking-widest py-2.5 px-3 rounded-xl flex justify-between items-center transition-all hover:translate-x-1 text-secondary hover:bg-surface-container-low"
          >
            <span class="flex items-center gap-2">
              <span class="material-symbols-outlined text-lg text-rose-700">favorite</span>
              <span>Mis Favoritos</span>
            </span>
            <span v-if="wishlistStore.totalItems > 0" class="bg-secondary text-surface text-xs px-2 py-0.5 rounded-full font-bold">
              {{ wishlistStore.totalItems }}
            </span>
            <span v-else class="material-symbols-outlined text-sm">chevron_right</span>
          </RouterLink>
        </div>

        <div class="pt-4 border-t border-outline-variant flex justify-between items-center text-xs font-label text-secondary uppercase tracking-widest">
          <div class="flex items-center gap-2">
            <img 
              v-if="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
              :src="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
              :alt="tenantStore.storeName"
              class="w-5 h-5 object-contain rounded-xs" 
            />
            <span v-else class="material-symbols-outlined text-base text-primary">{{ tenantStore.branding?.storeIcon || 'spa' }}</span>
            <span>{{ tenantStore.storeName || 'Gicca Perfumes' }}</span>
          </div>
          <RouterLink to="/quiz" @click="isMobileMenuOpen = false" class="text-primary underline font-bold hover:text-primary-container transition-colors">
            Quiz Olfativo
          </RouterLink>
        </div>
      </div>
    </Transition>

    <!-- Search Modal Component -->
    <SearchModal :is-open="isSearchOpen" @close="isSearchOpen = false" />
  </nav>
</template>
