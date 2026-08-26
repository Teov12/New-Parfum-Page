<script setup>
import { ref } from 'vue'
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

const selectedSize = ref(
  props.product.sizes.find(s => s.default) || props.product.sizes[0]
)

const handleQuickAdd = () => {
  cartStore.addItem(props.product, selectedSize.value, 1)
  toastStore.show(`¡${props.product.name} (${selectedSize.value.size}) añadido a tu bolsa!`, 'success')
}

const handleWishlist = () => {
  wishlistStore.toggleWishlist(props.product.id)
  const isNowIn = wishlistStore.isInWishlist(props.product.id)
  toastStore.show(
    isNowIn ? `Guardaste ${props.product.name} en tus favoritos` : `Eliminaste ${props.product.name} de favoritos`,
    'info'
  )
}
</script>

<template>
  <!-- Modern Luxury Product Card -->
  <div class="group relative flex flex-col bg-white rounded-2xl border border-neutral-200/70 hover:border-neutral-400/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 ease-out">
    
    <!-- Image & Floating Controls Container (3:4 ratio) -->
    <div class="relative aspect-[3/4] bg-neutral-100/70 overflow-hidden">
      <!-- Product Image with Smooth Zoom -->
      <RouterLink :to="`/producto/${product.slug}`" class="block w-full h-full">
        <img 
          :src="product.images[0]" 
          :alt="product.name"
          class="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
          loading="lazy"
        />
        <!-- Subtle gradient overlay on hover -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </RouterLink>

      <!-- Floating Badges Top-Left -->
      <div class="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <span 
          v-if="product.badge" 
          class="bg-neutral-900/85 text-white font-sans text-[10px] font-semibold px-3 py-1 uppercase tracking-wider rounded-full backdrop-blur-md shadow-sm"
        >
          {{ product.badge }}
        </span>
      </div>

      <!-- Wishlist Heart Button (Frosted Floating Glass) -->
      <button 
        @click.stop="handleWishlist"
        class="absolute top-3 right-3 z-10 w-9 h-9 bg-white/85 backdrop-blur-md hover:bg-white rounded-full flex items-center justify-center text-neutral-700 hover:text-rose-600 shadow-md hover:scale-110 active:scale-90 transition-all duration-200"
        :aria-label="wishlistStore.isInWishlist(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      >
        <span 
          class="material-symbols-outlined text-lg transition-colors"
          :class="wishlistStore.isInWishlist(product.id) ? 'fill-icon text-rose-600' : 'text-neutral-600 hover:text-rose-600'"
        >
          favorite
        </span>
      </button>

      <!-- Quick Add Overlay (Modern Slide-up Glass on Desktop Hover) -->
      <div class="absolute bottom-0 left-0 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 hidden md:block">
        <div class="bg-white/95 backdrop-blur-md border-t border-neutral-200/80 p-3 space-y-2 shadow-2xl">
          <!-- Size Selector Pills -->
          <div class="flex justify-center gap-1.5">
            <button
              v-for="s in product.sizes"
              :key="s.size"
              @click.stop="selectedSize = s"
              class="font-sans text-[11px] font-semibold px-3 py-1 uppercase tracking-wider rounded-lg transition-all duration-200"
              :class="selectedSize.size === s.size 
                ? 'bg-neutral-900 text-white shadow-sm scale-105' 
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80'"
            >
              {{ s.size }}
            </button>
          </div>

          <!-- Add to Cart CTA Button -->
          <button 
            @click.stop="handleQuickAdd"
            class="w-full bg-neutral-900 hover:bg-black text-white font-sans text-xs font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-98"
          >
            <span class="material-symbols-outlined text-sm">shopping_bag</span>
            <span>Agregar • ${{ selectedSize.price.toLocaleString('es-AR') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Product Info Content -->
    <div class="p-4 sm:p-5 flex flex-col flex-grow justify-between gap-3 bg-white">
      <div>
        <!-- Brand, Category & Rating Row -->
        <div class="flex justify-between items-center text-xs font-sans text-neutral-400 uppercase tracking-widest mb-1.5">
          <span class="font-bold text-neutral-500">{{ product.brand }}</span>
          <span v-if="product.rating" class="flex items-center gap-1 font-bold text-neutral-700 lowercase tracking-normal">
            <span class="material-symbols-outlined fill-icon text-amber-500 text-xs">star</span>
            <span>{{ product.rating }}</span>
          </span>
        </div>

        <!-- Product Name -->
        <RouterLink :to="`/producto/${product.slug}`" class="block group/link">
          <h3 class="font-sans text-base sm:text-lg font-bold text-neutral-900 leading-snug group-hover/link:text-neutral-600 transition-colors line-clamp-1">
            {{ product.name }}
          </h3>
        </RouterLink>

        <!-- Concentration & Fragrance Family -->
        <p class="font-sans text-xs text-neutral-500 mt-0.5">
          {{ product.concentration }} • {{ product.fragranceFamily }}
        </p>

        <!-- Top Notes Pills -->
        <div class="flex flex-wrap gap-1.5 mt-3">
          <span 
            v-for="note in product.olfactoryPyramid.topNotes.slice(0, 2)" 
            :key="note"
            class="font-sans text-[10px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md"
          >
            {{ note }}
          </span>
        </div>
      </div>

      <!-- Price & Actions Row -->
      <div class="pt-3 border-t border-neutral-100 flex justify-between items-end">
        <div>
          <div class="flex items-baseline gap-2">
            <span class="font-sans font-extrabold text-lg sm:text-xl text-neutral-900">
              ${{ selectedSize.price.toLocaleString('es-AR') }}
            </span>
          </div>
          <p class="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mt-0.5">
            3 cuotas sin interés de ${{ Math.round(selectedSize.price / 3).toLocaleString('es-AR') }}
          </p>
        </div>

        <!-- Mobile Add Button -->
        <button 
          @click.stop="handleQuickAdd"
          class="md:hidden p-2.5 bg-neutral-900 text-white rounded-xl hover:bg-black transition-colors shadow-sm active:scale-95 flex items-center justify-center"
          aria-label="Agregar a la bolsa"
        >
          <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
        </button>
      </div>

    </div>

  </div>
</template>
