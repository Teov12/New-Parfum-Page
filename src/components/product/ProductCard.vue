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
  <!-- Modern Luxury Product Card with Original Palette and Elegant Shadows -->
  <div class="group relative flex flex-col bg-surface border border-outline-variant hover:border-primary rounded-md overflow-hidden shadow-[0_4px_18px_rgba(38,17,11,0.06)] hover:shadow-[0_16px_35px_rgba(38,17,11,0.14)] hover:-translate-y-1.5 transition-all duration-300 ease-out">
    
    <!-- Image & Floating Controls Container (3:4 ratio) -->
    <div class="relative aspect-[3/4] bg-surface-container overflow-hidden">
      <!-- Product Image with Smooth Zoom -->
      <RouterLink :to="`/producto/${product.slug}`" class="block w-full h-full">
        <img 
          :src="product.images[0]" 
          :alt="product.name"
          class="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
          loading="lazy"
        />
        <!-- Subtle gradient overlay on hover -->
        <div class="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </RouterLink>

      <!-- Floating Badges Top-Left -->
      <div v-if="product.badge" class="absolute top-3 left-3 z-10">
        <span class="bg-primary-container text-on-primary font-label text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-md shadow-xs backdrop-blur-xs">
          {{ product.badge }}
        </span>
      </div>

      <!-- Wishlist Heart Button -->
      <button 
        @click.stop="handleWishlist"
        class="absolute top-3 right-3 z-10 w-9 h-9 bg-surface/90 backdrop-blur-md hover:bg-surface border border-outline-variant hover:border-primary rounded-md flex items-center justify-center text-primary shadow-xs hover:scale-110 active:scale-95 transition-all duration-200"
        :aria-label="wishlistStore.isInWishlist(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      >
        <span 
          class="material-symbols-outlined text-lg transition-colors"
          :class="wishlistStore.isInWishlist(product.id) ? 'fill-icon text-rose-700' : 'text-secondary hover:text-primary'"
        >
          favorite
        </span>
      </button>

      <!-- Quick Add Overlay -->
      <div class="absolute bottom-0 left-0 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 hidden md:block">
        <div class="bg-surface/95 backdrop-blur-md border-t border-outline-variant p-3 space-y-2 shadow-2xl">
          <!-- Size Selector Pills -->
          <div class="flex justify-center gap-1.5">
            <button
              v-for="s in product.sizes"
              :key="s.size"
              @click.stop="selectedSize = s"
              class="font-label text-[11px] font-bold px-3 py-1 uppercase tracking-wider rounded-md border transition-all duration-200"
              :class="selectedSize.size === s.size 
                ? 'bg-primary-container text-on-primary border-primary-container shadow-xs scale-105' 
                : 'bg-surface text-primary border-outline-variant hover:border-primary'"
            >
              {{ s.size }}
            </button>
          </div>

          <!-- Add to Cart CTA Button -->
          <button 
            @click.stop="handleQuickAdd"
            class="w-full bg-primary-container hover:bg-inverse-surface text-on-primary font-label text-xs font-bold py-2.5 px-4 rounded-md transition-all duration-200 flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-98"
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

        <!-- Concentration & Fragrance Family -->
        <p class="font-sans text-xs text-secondary mt-0.5">
          {{ product.concentration }} • {{ product.fragranceFamily }}
        </p>

        <!-- Top Notes Pills -->
        <div class="flex flex-wrap gap-1.5 mt-3">
          <span 
            v-for="note in product.olfactoryPyramid.topNotes.slice(0, 2)" 
            :key="note"
            class="font-label text-[10px] font-semibold text-secondary bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/60"
          >
            {{ note }}
          </span>
        </div>
      </div>

      <!-- Price & Actions Row -->
      <div class="pt-3 border-t border-outline-variant/70 flex justify-between items-end">
        <div>
          <div class="flex items-baseline gap-2">
            <span class="font-sans font-bold text-lg sm:text-xl text-primary">
              ${{ selectedSize.price.toLocaleString('es-AR') }}
            </span>
          </div>
          <p class="text-[10px] text-primary-container font-label font-semibold uppercase tracking-wider mt-0.5">
            3 cuotas de ${{ Math.round(selectedSize.price / 3).toLocaleString('es-AR') }}
          </p>
        </div>

        <!-- Mobile Add Button -->
        <button 
          @click.stop="handleQuickAdd"
          class="md:hidden p-2.5 bg-primary-container text-on-primary rounded-md hover:bg-inverse-surface transition-colors shadow-xs active:scale-95 flex items-center justify-center"
          aria-label="Agregar a la bolsa"
        >
          <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
        </button>
      </div>

    </div>

  </div>
</template>
