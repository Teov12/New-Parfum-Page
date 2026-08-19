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
  <div class="group relative flex flex-col bg-surface border border-outline-variant hover:border-primary rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300">
    
    <!-- Image & Badges Container (3:4 ratio) -->
    <div class="relative aspect-[3/4] bg-surface-container overflow-hidden rounded-t-2xl">
      <!-- Product Image with Zoom -->
      <RouterLink :to="`/producto/${product.slug}`" class="block w-full h-full">
        <img 
          :src="product.images[0]" 
          :alt="product.name"
          class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />
      </RouterLink>

      <!-- Badge (Top Left) -->
      <div v-if="product.badge" class="absolute top-3 left-3 z-10">
        <span class="bg-primary-container text-on-primary font-label text-[10px] px-3 py-1 uppercase tracking-widest rounded-full shadow-xs">
          {{ product.badge }}
        </span>
      </div>

      <!-- Wishlist Heart Button (Top Right) -->
      <button 
        @click.stop="handleWishlist"
        class="absolute top-3 right-3 z-10 w-9 h-9 bg-surface/90 backdrop-blur-xs border border-outline-variant hover:border-primary rounded-full flex items-center justify-center text-primary shadow-xs transition-all"
        :aria-label="wishlistStore.isInWishlist(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      >
        <span 
          class="material-symbols-outlined text-lg transition-colors"
          :class="wishlistStore.isInWishlist(product.id) ? 'fill-icon text-primary' : 'text-secondary hover:text-primary'"
        >
          favorite
        </span>
      </button>

      <!-- Quick Add Overlay (Slide Up on Desktop Hover) -->
      <div class="absolute bottom-0 left-0 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 hidden md:block">
        <div class="bg-surface/95 backdrop-blur-xs border-t border-outline-variant p-3.5 space-y-2.5 rounded-t-2xl shadow-lg">
          <!-- Size Selector Buttons -->
          <div class="flex justify-center gap-1.5">
            <button
              v-for="s in product.sizes"
              :key="s.size"
              @click.stop="selectedSize = s"
              class="font-label text-[11px] px-2.5 py-1 uppercase tracking-wider rounded-full border transition-colors"
              :class="selectedSize.size === s.size 
                ? 'bg-primary-container text-on-primary border-primary-container' 
                : 'bg-surface text-primary border-outline-variant hover:border-primary'"
            >
              {{ s.size }}
            </button>
          </div>

          <!-- Add to Cart CTA -->
          <button 
            @click.stop="handleQuickAdd"
            class="w-full bg-primary-container text-on-primary font-label text-xs py-2.5 uppercase tracking-widest rounded-full hover:bg-inverse-surface transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span class="material-symbols-outlined text-sm">shopping_bag</span>
            <span>Añadir (${{ selectedSize.price.toLocaleString('es-AR') }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Product Info Content -->
    <div class="p-5 flex flex-col flex-grow justify-between">
      <div>
        <!-- Brand & Family -->
        <div class="flex justify-between items-center text-xs font-label text-secondary uppercase tracking-widest mb-1.5">
          <span>{{ product.brand }}</span>
          <span class="text-outline font-normal">•</span>
          <span>{{ product.fragranceFamily }}</span>
        </div>

        <!-- Product Name -->
        <RouterLink :to="`/producto/${product.slug}`" class="block">
          <h3 class="font-serif text-lg text-primary font-normal leading-snug group-hover:text-primary-container transition-colors mb-1">
            {{ product.name }}
          </h3>
        </RouterLink>

        <!-- Concentration -->
        <p class="font-sans text-xs text-secondary mb-3">
          {{ product.concentration }} • {{ selectedSize.size }}
        </p>

        <!-- Top Olfactive Notes (Subtle Rounded Tags) -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          <span 
            v-for="note in product.olfactoryPyramid.topNotes.slice(0, 2)" 
            :key="note"
            class="font-label text-[10px] uppercase text-secondary bg-surface-container px-2.5 py-0.5 rounded-full border border-outline-variant"
          >
            {{ note }}
          </span>
        </div>
      </div>

      <!-- Price & Mobile Action -->
      <div class="pt-3 border-t border-outline-variant flex justify-between items-baseline">
        <div>
          <div class="flex items-baseline gap-2">
            <span class="font-sans font-bold text-lg text-primary">
              ${{ selectedSize.price.toLocaleString('es-AR') }}
            </span>
            <span v-if="product.discountPercentage > 0" class="text-xs font-sans text-secondary line-through">
              ${{ product.originalPrice.toLocaleString('es-AR') }}
            </span>
          </div>
          <p class="text-[10px] text-secondary font-label uppercase tracking-wider">
            3 cuotas de ${{ Math.round(selectedSize.price / 3).toLocaleString('es-AR') }}
          </p>
        </div>

        <!-- Mobile Add Button -->
        <button 
          @click.stop="handleQuickAdd"
          class="md:hidden p-2.5 bg-primary-container text-on-primary rounded-full hover:bg-surface hover:text-primary-container transition-colors shadow-xs"
          aria-label="Agregar a la bolsa"
        >
          <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
        </button>
      </div>

    </div>

  </div>
</template>
