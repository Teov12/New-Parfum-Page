<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const cartStore = useCartStore()
const wishlistStore = useWishlistStore()
const toastStore = useToastStore()

const hasDecants = computed(() => {
  if (!props.product?.sizes) return false
  return props.product.sizes.some(s => {
    const sizeStr = typeof s === 'object' ? String(s.size || '') : String(s)
    const lower = sizeStr.toLowerCase()
    if (lower.includes('decant') || lower.includes('muestra') || lower.includes('fraccionado')) return true
    const num = parseInt(lower.replace(/\D/g, ''), 10)
    return !isNaN(num) && num > 0 && num <= 15
  })
})

const selectedSize = ref(
  props.product.sizes.find(s => s.default) || props.product.sizes[0]
)

const isBursting = ref(false)

const handleQuickAdd = () => {
  cartStore.addItem(props.product, selectedSize.value, 1)
  toastStore.show(`¡${props.product.name} (${selectedSize.value.size}) añadido a tu bolsa!`, 'success')
}

const handleWishlist = () => {
  isBursting.value = true
  setTimeout(() => {
    isBursting.value = false
  }, 450)
  wishlistStore.toggleWishlist(props.product.id)
  const isNowIn = wishlistStore.isInWishlist(props.product.id)
  toastStore.show(
    isNowIn ? `Guardaste ${props.product.name} en tus favoritos` : `Eliminaste ${props.product.name} de favoritos`,
    'info'
  )
}
</script>

<template>
  <!-- Modern Luxury Product Card with Lightened Warm Palette and Soft Shadows -->
  <div class="group relative flex flex-col h-full bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-[0_10px_25px_-8px_rgba(46,25,17,0.05),0_4px_10px_-4px_rgba(46,25,17,0.02)] hover:shadow-[0_22px_45px_-10px_rgba(46,25,17,0.13),0_10px_20px_-4px_rgba(46,25,17,0.06)] hover:-translate-y-2 transition-all duration-400 ease-out will-change-transform">
    
    <!-- Image & Floating Controls Container (3:4 ratio) -->
    <div class="relative aspect-[3/4] bg-surface-container overflow-hidden -mb-px">
      <!-- Product Image with Smooth Zoom -->
      <RouterLink :to="`/producto/${product.slug}`" class="block w-full h-full overflow-hidden">
        <img 
          :src="product.images[0]" 
          :alt="`Perfume ${product.name} de ${product.brand} original`"
          class="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
          loading="lazy"
        />
        <!-- Subtle gradient overlay on hover -->
        <div class="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"></div>
      </RouterLink>

      <!-- Floating Badges Top-Left -->
      <div class="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
        <span v-if="product.badge" class="bg-primary-container text-on-primary font-label text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-md shadow-xs backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
          {{ product.badge }}
        </span>
        <span v-if="hasDecants" class="bg-amber-100 text-amber-900 border border-amber-300/80 font-label text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md shadow-2xs backdrop-blur-sm flex items-center gap-1">
          <span class="material-symbols-outlined text-[10px]">science</span>
          <span>Decants</span>
        </span>
      </div>

      <!-- Wishlist Heart Button -->
      <button 
        @click.stop="handleWishlist"
        class="absolute top-3 right-3 z-10 w-9 h-9 bg-surface/90 backdrop-blur-md hover:bg-surface border border-outline-variant rounded-md flex items-center justify-center text-primary shadow-xs hover:scale-110 active:scale-95 transition-all duration-200"
        :aria-label="wishlistStore.isInWishlist(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      >
        <span 
          class="material-symbols-outlined text-lg transition-colors"
          :class="[
            wishlistStore.isInWishlist(product.id) ? 'fill-icon text-rose-700' : 'text-secondary hover:text-primary',
            { 'animate-heart-burst': isBursting }
          ]"
        >
          favorite
        </span>
      </button>

      <!-- Quick Add Overlay -->
      <div class="absolute -bottom-px left-0 w-full translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) z-20 hidden md:block">
        <div class="bg-surface/95 backdrop-blur-md border-t border-outline-variant p-3 space-y-2 shadow-[0_-8px_20px_rgba(46,25,17,0.06)]">
          <!-- Size Selector Pills -->
          <div class="flex justify-center gap-1.5">
            <button
              v-for="s in product.sizes"
              :key="s.size"
              @click.stop="selectedSize = s"
              class="font-label text-[11px] font-bold px-3 py-1 uppercase tracking-wider rounded-md border transition-all duration-200 active:scale-95"
              :class="selectedSize.size === s.size 
                ? 'bg-primary-container text-on-primary border-primary-container shadow-xs scale-105' 
                : 'bg-surface text-primary border-outline-variant hover:border-outline'"
            >
              {{ s.size }}
            </button>
          </div>

          <!-- Add to Cart CTA Button -->
          <button 
            @click.stop="handleQuickAdd"
            class="w-full bg-primary-container hover:bg-inverse-surface text-on-primary font-label text-xs font-bold py-2.5 px-4 rounded-md transition-all duration-300 flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.98]"
          >
            <span class="material-symbols-outlined text-sm">shopping_bag</span>
            <span>Añadir • ${{ selectedSize.price.toLocaleString('es-AR') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Product Info Content -->
    <div class="p-4 sm:p-5 flex flex-col flex-grow justify-between gap-3 bg-surface">
      <div>
        <!-- Brand, Category & Rating Row -->
        <div class="flex justify-between items-center text-xs font-label text-secondary uppercase tracking-widest mb-1.5">
          <span class="font-bold text-primary">{{ product.brand }}</span>
          <span v-if="product.rating" class="flex items-center gap-1 font-bold text-primary lowercase tracking-normal">
            <span class="material-symbols-outlined fill-icon text-amber-700 text-xs">star</span>
            <span>{{ product.rating }}</span>
          </span>
        </div>

        <!-- Product Name -->
        <RouterLink :to="`/producto/${product.slug}`" class="block group/link">
          <h3 class="font-serif text-base sm:text-lg font-normal text-primary leading-snug group-hover/link:text-primary-container transition-colors line-clamp-1">
            {{ product.name }}
          </h3>
        </RouterLink>

        <!-- Concentration -->
        <p v-if="product.concentration" class="font-sans text-xs text-secondary mt-0.5">
          {{ product.concentration }}
        </p>
      </div>

      <!-- Price & Actions Row -->
      <div class="pt-3 border-t border-outline-variant/70 flex justify-between items-end gap-2">
        <div class="space-y-1 flex-1 min-w-0">
          <!-- Precio exclusivo Transferencia -->
          <div>
            <span class="block text-[9px] font-bold uppercase tracking-wider text-emerald-800">
              Transferencia (28% OFF)
            </span>
            <span class="font-sans font-bold text-lg sm:text-xl text-primary leading-none">
              ${{ (selectedSize.transferPrice || Math.round(selectedSize.price * 0.72)).toLocaleString('es-AR') }}
            </span>
          </div>

          <!-- Precio de Lista & Cuotas Sin Interés -->
          <div class="pt-1 border-t border-outline-variant/50 text-[11px] font-sans leading-tight">
            <p class="text-secondary text-[11px]">
              Precio de lista: <strong class="text-primary font-semibold">${{ selectedSize.price.toLocaleString('es-AR') }}</strong>
            </p>
            <p class="text-amber-800 text-[10px] font-semibold flex items-center gap-1 mt-0.5">
              <span class="material-symbols-outlined text-[13px] leading-none">credit_card</span>
              <span>Hasta <strong>6 cuotas s/int</strong> de ${{ Math.round(selectedSize.price / 6).toLocaleString('es-AR') }}</span>
            </p>
          </div>
        </div>

        <!-- Mobile Add Button -->
        <button 
          @click.stop="handleQuickAdd"
          class="md:hidden p-2.5 bg-primary-container text-on-primary rounded-md hover:bg-inverse-surface transition-colors shadow-xs active:scale-95 flex items-center justify-center shrink-0"
          aria-label="Agregar a la bolsa"
        >
          <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
        </button>
      </div>

    </div>

  </div>
</template>
