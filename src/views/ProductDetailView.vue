<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { products } from '@/data/products'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useToastStore } from '@/stores/toast'
import OlfactivePyramid from '@/components/product/OlfactivePyramid.vue'
import ProductCard from '@/components/product/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const wishlistStore = useWishlistStore()
const toastStore = useToastStore()

// Find product by slug
const product = computed(() => {
  const found = products.find(p => p.slug === route.params.slug || p.id === route.params.slug)
  return found || products[0] // fallback to first product (YSL Libre)
})

// Selected size state
const selectedSize = ref(null)
const selectedImageIndex = ref(0)
const quantity = ref(1)
const activeTab = ref('pyramid')

// Postal code calculator state
const postalCode = ref('')
const shippingEstimate = ref(null)

// Review submission state
const isReviewModalOpen = ref(false)
const newReviewAuthor = ref('')
const newReviewComment = ref('')
const newReviewRating = ref(5)

const initProduct = () => {
  if (product.value) {
    selectedSize.value = product.value.sizes.find(s => s.default) || product.value.sizes[0]
    selectedImageIndex.value = 0
    quantity.value = 1
    shippingEstimate.value = null
  }
}

watch(() => route.params.slug, () => {
  initProduct()
}, { immediate: true })

const currentPrice = computed(() => {
  return selectedSize.value ? selectedSize.value.price : product.value.price
})

const relatedProducts = computed(() => {
  return products.filter(p => p.id !== product.value.id).slice(0, 4)
})

const handleAddToCart = () => {
  cartStore.addItem(product.value, selectedSize.value, quantity.value)
  toastStore.show(`¡Agregaste ${quantity.value}x ${product.value.name} (${selectedSize.value.size}) a tu bolsa!`, 'success')
}

const handleBuyNow = () => {
  cartStore.addItem(product.value, selectedSize.value, quantity.value)
  cartStore.closeDrawer()
  router.push('/checkout')
}

const handleToggleWishlist = () => {
  wishlistStore.toggleWishlist(product.value.id)
  const isNowIn = wishlistStore.isInWishlist(product.value.id)
  toastStore.show(
    isNowIn ? `Guardaste ${product.value.name} en tus favoritos` : `Eliminaste ${product.value.name} de favoritos`,
    'info'
  )
}

const calculateShipping = () => {
  if (!postalCode.value || postalCode.value.length < 4) {
    toastStore.show('Ingresá un código postal válido de 4 dígitos.', 'error')
    return
  }
  const isCabaGba = postalCode.value.startsWith('1')
  shippingEstimate.value = {
    standardCost: currentPrice.value >= 200000 ? 'GRATIS' : (isCabaGba ? '$3.900' : '$5.200'),
    standardDays: isCabaGba ? '24 a 48 hs hábiles' : '3 a 5 días hábiles',
    expressCost: '$6.500',
    expressDays: 'Mismo día / 24 hs (Express Gicca)'
  }
}

const handleAddReview = () => {
  if (!newReviewAuthor.value.trim() || !newReviewComment.value.trim()) {
    toastStore.show('Por favor completá tu nombre y opinión.', 'error')
    return
  }
  product.value.reviews.unshift({
    id: Date.now(),
    author: newReviewAuthor.value,
    rating: newReviewRating.value,
    date: 'Hoy',
    comment: newReviewComment.value,
    verified: true
  })
  isReviewModalOpen.value = false
  newReviewAuthor.value = ''
  newReviewComment.value = ''
  toastStore.show('¡Muchas gracias por compartir tu experiencia olfativa!', 'success')
}
</script>

<template>
  <div class="bg-surface py-8">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Breadcrumbs -->
      <nav class="font-label text-xs uppercase tracking-widest text-secondary flex items-center gap-2 mb-8">
        <RouterLink to="/" class="hover:text-primary transition-colors">Inicio</RouterLink>
        <span>/</span>
        <RouterLink to="/catalogo" class="hover:text-primary transition-colors">Perfumes</RouterLink>
        <span>/</span>
        <RouterLink :to="`/catalogo?brand=${encodeURIComponent(product.brand)}`" class="hover:text-primary transition-colors">
          {{ product.brand }}
        </RouterLink>
        <span>/</span>
        <span class="text-primary font-bold truncate max-w-[200px] sm:max-w-none">{{ product.name }}</span>
      </nav>

      <!-- Main Product View: Gallery (Left) + Details & Purchase (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
        
        <!-- IMAGE GALLERY (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Main Selected Image (High-Res Container) -->
          <div class="relative aspect-[4/5] bg-surface-container overflow-hidden border border-outline-variant group">
            <img 
              :src="product.images[selectedImageIndex] || product.images[0]" 
              :alt="product.name"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div class="absolute top-4 left-4 z-10 flex gap-2">
              <span v-if="product.badge" class="bg-primary-container text-on-primary font-label text-[10px] px-3 py-1 uppercase tracking-widest">
                {{ product.badge }}
              </span>
              <span class="bg-surface/90 backdrop-blur-xs text-primary font-label text-[10px] px-3 py-1 uppercase tracking-widest border border-outline-variant">
                100% Original
              </span>
            </div>

            <!-- Wishlist Floating Button -->
            <button 
              @click="handleToggleWishlist"
              class="absolute top-4 right-4 z-10 w-10 h-10 bg-surface/90 backdrop-blur-xs border border-outline-variant hover:border-primary flex items-center justify-center text-primary transition-colors"
              :aria-label="wishlistStore.isInWishlist(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
            >
              <span 
                class="material-symbols-outlined text-xl transition-colors"
                :class="wishlistStore.isInWishlist(product.id) ? 'fill-icon text-primary' : 'text-secondary hover:text-primary'"
              >
                favorite
              </span>
            </button>
          </div>

          <!-- Thumbnails Row -->
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button
              v-for="(img, idx) in product.images"
              :key="idx"
              @click="selectedImageIndex = idx"
              class="w-20 h-24 flex-shrink-0 bg-surface-container border overflow-hidden transition-all"
              :class="selectedImageIndex === idx ? 'border-primary ring-1 ring-primary' : 'border-outline-variant opacity-70 hover:opacity-100'"
            >
              <img :src="img" :alt="`${product.name} vista ${idx + 1}`" class="w-full h-full object-cover" />
            </button>
          </div>
        </div>

        <!-- DETAILS & BUY BOX (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- Brand & Rating Header -->
          <div class="border-b border-outline-variant pb-5">
            <div class="flex justify-between items-center mb-2">
              <RouterLink 
                :to="`/catalogo?brand=${encodeURIComponent(product.brand)}`" 
                class="font-label text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors"
              >
                {{ product.brand }}
              </RouterLink>

              <!-- Star Rating -->
              <div class="flex items-center gap-1.5 text-xs text-secondary">
                <div class="flex text-primary">
                  <span v-for="star in 5" :key="star" class="material-symbols-outlined text-sm fill-icon">star</span>
                </div>
                <span class="font-bold text-primary">{{ product.rating }}</span>
                <span>({{ product.reviewCount || product.reviews.length }} opiniones)</span>
              </div>
            </div>

            <!-- Product Title -->
            <h1 class="font-serif text-3xl sm:text-4xl text-primary font-normal leading-tight mb-2">
              {{ product.name }}
            </h1>

            <p class="font-sans text-sm text-secondary">
              {{ product.concentration }} • Familia {{ product.fragranceFamily }} • Importado Oficial
            </p>
          </div>

          <!-- Price & Installments -->
          <div class="bg-surface-container-low border border-outline-variant p-4 space-y-2">
            <div class="flex items-baseline gap-3">
              <span class="font-sans font-bold text-3xl text-primary">
                ${{ currentPrice.toLocaleString('es-AR') }}
              </span>
              <span v-if="product.discountPercentage > 0" class="text-sm font-sans text-secondary line-through">
                ${{ product.originalPrice.toLocaleString('es-AR') }}
              </span>
              <span v-if="product.discountPercentage > 0" class="bg-secondary-container text-primary font-label text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold">
                {{ product.discountPercentage }}% OFF
              </span>
            </div>

            <div class="space-y-1 text-xs font-label text-secondary uppercase tracking-wider">
              <p class="text-primary font-medium flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm text-tertiary">credit_card</span>
                <strong>3 y 6 cuotas fijas</strong> de ${{ Math.round(currentPrice / 3).toLocaleString('es-AR') }}
              </p>
              <p class="text-tertiary font-semibold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm">payments</span>
                <strong>10% OFF extra</strong> pagando por Transferencia Bancaria (${{ Math.round(currentPrice * 0.9).toLocaleString('es-AR') }})
              </p>
            </div>
          </div>

          <!-- Short Description -->
          <p class="font-sans text-sm text-secondary leading-relaxed">
            {{ product.shortDescription }}
          </p>

          <!-- Size Selector -->
          <div class="space-y-2.5">
            <div class="flex justify-between items-baseline">
              <label class="font-label text-xs uppercase tracking-widest text-primary font-bold">
                Presentación / Tamaño:
              </label>
              <span class="font-label text-xs text-secondary">{{ selectedSize?.size }}</span>
            </div>

            <div class="grid grid-cols-3 gap-2.5">
              <button
                v-for="s in product.sizes"
                :key="s.size"
                @click="selectedSize = s"
                class="font-label text-xs uppercase tracking-wider py-3 px-2 border text-center transition-all flex flex-col items-center justify-center gap-1"
                :class="selectedSize?.size === s.size 
                  ? 'bg-primary-container text-on-primary border-primary-container ring-1 ring-primary-container' 
                  : 'bg-surface text-primary border-outline-variant hover:border-primary'"
              >
                <span class="font-bold">{{ s.size }}</span>
                <span class="text-[10px] opacity-90">${{ s.price.toLocaleString('es-AR') }}</span>
              </button>
            </div>
          </div>

          <!-- Quantity & Action Buttons -->
          <div class="space-y-3 pt-2">
            <div class="flex gap-3">
              <!-- Quantity Counter -->
              <div class="inline-flex items-center border border-primary bg-surface flex-shrink-0">
                <button 
                  @click="quantity = Math.max(1, quantity - 1)"
                  class="px-3.5 py-3 text-primary hover:bg-surface-container transition-colors text-base"
                >
                  -
                </button>
                <span class="px-4 py-3 font-label text-xs font-bold text-primary min-w-[2.5rem] text-center">
                  {{ quantity }}
                </span>
                <button 
                  @click="quantity++"
                  class="px-3.5 py-3 text-primary hover:bg-surface-container transition-colors text-base"
                >
                  +
                </button>
              </div>

              <!-- Add to Cart CTA -->
              <button 
                @click="handleAddToCart"
                class="flex-grow bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 px-6 border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2"
              >
                <span class="material-symbols-outlined text-base">shopping_bag</span>
                <span>Agregar a la Bolsa</span>
              </button>
            </div>

            <!-- Direct Buy Now CTA -->
            <button 
              @click="handleBuyNow"
              class="w-full bg-transparent text-primary font-label text-xs uppercase tracking-widest py-3.5 border border-primary hover:bg-surface-container transition-all flex items-center justify-center gap-2"
            >
              <span>Comprar Ahora con 1 Click</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <!-- Shipping Calculator Mini Module -->
          <div class="border-t border-outline-variant pt-5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-label text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm">local_shipping</span>
                Calcular Envío a Domicilio:
              </span>
            </div>

            <div class="flex gap-2">
              <input 
                v-model="postalCode"
                type="text" 
                placeholder="Código Postal (ej. 1425)"
                maxlength="5"
                class="bg-surface border border-outline-variant text-xs font-sans px-3 py-2 text-primary w-full focus:border-primary focus:outline-none"
                @keyup.enter="calculateShipping"
              />
              <button 
                @click="calculateShipping"
                class="bg-surface-container text-primary font-label text-xs uppercase tracking-widest px-4 py-2 border border-outline hover:bg-secondary-container transition-colors flex-shrink-0"
              >
                Calcular
              </button>
            </div>

            <!-- Shipping Results -->
            <div v-if="shippingEstimate" class="bg-surface-container p-3 space-y-2 text-xs font-sans text-secondary border border-outline-variant animate-in fade-in">
              <div class="flex justify-between items-center text-primary font-medium">
                <span>📦 Envío Estándar a Domicilio:</span>
                <span class="font-bold text-tertiary">{{ shippingEstimate.standardCost }} ({{ shippingEstimate.standardDays }})</span>
              </div>
              <div class="flex justify-between items-center text-primary font-medium">
                <span>⚡ Envío Express Gicca:</span>
                <span class="font-bold">{{ shippingEstimate.expressCost }} ({{ shippingEstimate.expressDays }})</span>
              </div>
            </div>
          </div>

          <!-- Trust Badges Mini Grid -->
          <div class="grid grid-cols-2 gap-3 pt-2">
            <div class="flex items-center gap-2 p-2.5 bg-surface-container border border-outline-variant">
              <span class="material-symbols-outlined text-base text-primary">verified</span>
              <span class="font-label text-[10px] uppercase text-primary">Batch Code Verificable</span>
            </div>
            <div class="flex items-center gap-2 p-2.5 bg-surface-container border border-outline-variant">
              <span class="material-symbols-outlined text-base text-primary">redeem</span>
              <span class="font-label text-[10px] uppercase text-primary">+1 Muestra de Regalo</span>
            </div>
          </div>

        </div>

      </div>

      <!-- DETAILED TABS SECTION: PYRAMID, DESCRIPTION, LONGEVITY, REVIEWS -->
      <div class="mb-20 border-t border-primary pt-12">
        <!-- Tabs Header -->
        <div class="flex flex-wrap gap-4 sm:gap-8 border-b border-outline-variant mb-8">
          <button
            @click="activeTab = 'pyramid'"
            class="font-label text-xs sm:text-sm uppercase tracking-widest pb-3 transition-colors relative"
            :class="activeTab === 'pyramid' ? 'text-primary font-bold border-b-2 border-primary' : 'text-secondary hover:text-primary'"
          >
            Pirámide Olfativa
          </button>
          <button
            @click="activeTab = 'description'"
            class="font-label text-xs sm:text-sm uppercase tracking-widest pb-3 transition-colors relative"
            :class="activeTab === 'description' ? 'text-primary font-bold border-b-2 border-primary' : 'text-secondary hover:text-primary'"
          >
            Descripción & Ritual
          </button>
          <button
            @click="activeTab = 'characteristics'"
            class="font-label text-xs sm:text-sm uppercase tracking-widest pb-3 transition-colors relative"
            :class="activeTab === 'characteristics' ? 'text-primary font-bold border-b-2 border-primary' : 'text-secondary hover:text-primary'"
          >
            Ficha Técnica & Longevidad
          </button>
          <button
            @click="activeTab = 'reviews'"
            class="font-label text-xs sm:text-sm uppercase tracking-widest pb-3 transition-colors relative"
            :class="activeTab === 'reviews' ? 'text-primary font-bold border-b-2 border-primary' : 'text-secondary hover:text-primary'"
          >
            Reseñas ({{ product.reviews.length }})
          </button>
        </div>

        <!-- Tab 1: Olfactive Pyramid Component -->
        <div v-if="activeTab === 'pyramid'" class="animate-in fade-in duration-300">
          <OlfactivePyramid :pyramid="product.olfactoryPyramid" />
        </div>

        <!-- Tab 2: Storytelling & Usage Ritual -->
        <div v-if="activeTab === 'description'" class="bg-surface-container border border-outline-variant p-8 space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 class="font-serif text-2xl text-primary font-normal mb-3">La Historia Olfativa</h3>
            <p class="font-sans text-secondary text-base leading-relaxed">
              {{ product.description }}
            </p>
          </div>

          <div class="border-t border-outline-variant pt-6">
            <h4 class="font-serif text-xl text-primary font-medium mb-2">Ritual de Aplicación Recomendado</h4>
            <p class="font-sans text-secondary text-sm leading-relaxed mb-4">
              {{ product.usageTips }}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 font-label text-xs uppercase tracking-wider text-secondary">
              <div class="p-3 bg-surface border border-outline-variant">
                <strong>1. Puntos de Pulso:</strong> Muñecas, clavículas y cuello.
              </div>
              <div class="p-3 bg-surface border border-outline-variant">
                <strong>2. No Frotar:</strong> Deja secar al aire para no romper las notas.
              </div>
              <div class="p-3 bg-surface border border-outline-variant">
                <strong>3. Hidratación:</strong> Aplica sobre piel hidratada para mayor fijación.
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Technical Specifications -->
        <div v-if="activeTab === 'characteristics'" class="bg-surface-container border border-outline-variant p-8 animate-in fade-in duration-300">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="p-4 bg-surface border border-outline-variant">
              <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Duración en Piel</span>
              <p class="font-serif text-lg text-primary font-medium">{{ product.characteristics.longevity }}</p>
            </div>
            <div class="p-4 bg-surface border border-outline-variant">
              <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Estela / Proyección</span>
              <p class="font-serif text-lg text-primary font-medium">{{ product.characteristics.sillage }}</p>
            </div>
            <div class="p-4 bg-surface border border-outline-variant">
              <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Estación Ideal</span>
              <p class="font-serif text-lg text-primary font-medium">{{ product.characteristics.season }}</p>
            </div>
            <div class="p-4 bg-surface border border-outline-variant">
              <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Ocasión Sugerida</span>
              <p class="font-serif text-lg text-primary font-medium">{{ product.characteristics.occasion }}</p>
            </div>
          </div>
        </div>

        <!-- Tab 4: Reviews & Leave Review -->
        <div v-if="activeTab === 'reviews'" class="bg-surface-container border border-outline-variant p-8 space-y-6 animate-in fade-in duration-300">
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <h3 class="font-serif text-2xl text-primary font-normal">Opiniones de Clientes Verificados</h3>
              <p class="font-sans text-xs text-secondary">Basado en {{ product.reviews.length }} compras verificadas</p>
            </div>
            <button 
              @click="isReviewModalOpen = true"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 border border-primary-container hover:bg-surface hover:text-primary-container transition-all"
            >
              Escribir Reseña
            </button>
          </div>

          <!-- Reviews List -->
          <div v-if="product.reviews.length > 0" class="space-y-4">
            <div 
              v-for="rev in product.reviews" 
              :key="rev.id"
              class="bg-surface p-5 border border-outline-variant space-y-2"
            >
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="font-serif text-base text-primary font-medium">{{ rev.author }}</span>
                  <span v-if="rev.verified" class="font-label text-[10px] uppercase text-tertiary bg-surface-container px-2 py-0.5 border border-outline-variant flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">verified</span>
                    Comprador Verificado
                  </span>
                </div>
                <span class="font-sans text-xs text-secondary">{{ rev.date }}</span>
              </div>

              <div class="flex text-primary text-sm">
                <span v-for="s in rev.rating" :key="s" class="material-symbols-outlined text-sm fill-icon">star</span>
              </div>

              <p class="font-sans text-sm text-secondary leading-relaxed">
                "{{ rev.comment }}"
              </p>
            </div>
          </div>

          <div v-else class="text-center py-8 text-secondary">
            <p class="font-serif text-lg text-primary mb-2">Sé el primero en dejar una reseña para esta fragancia.</p>
            <button 
              @click="isReviewModalOpen = true"
              class="underline font-label text-xs uppercase tracking-widest text-primary"
            >
              Compartir mi experiencia
            </button>
          </div>
        </div>
      </div>

      <!-- RELATED FRAGRANCES SECTION -->
      <div class="border-t border-primary pt-16">
        <div class="text-center max-w-xl mx-auto mb-12">
          <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Completá tu Colección</p>
          <h2 class="font-serif text-3xl md:text-headline-lg text-primary font-normal">Fragancias Complementarias</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProductCard 
            v-for="rel in relatedProducts" 
            :key="rel.id" 
            :product="rel" 
          />
        </div>
      </div>

    </div>

    <!-- LEAVE REVIEW MODAL -->
    <Teleport to="body">
      <div 
        v-if="isReviewModalOpen"
        class="fixed inset-0 z-50 bg-primary/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="isReviewModalOpen = false"
      >
        <div class="bg-surface w-full max-w-lg border border-primary p-6 md:p-8 space-y-4 shadow-2xl">
          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <h3 class="font-serif text-2xl text-primary font-normal">Dejar tu Reseña</h3>
            <button @click="isReviewModalOpen = false" class="text-secondary hover:text-primary">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form @submit.prevent="handleAddReview" class="space-y-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                Puntuación:
              </label>
              <div class="flex gap-2">
                <button
                  type="button"
                  v-for="star in 5"
                  :key="star"
                  @click="newReviewRating = star"
                  class="text-primary hover:scale-110 transition-transform"
                >
                  <span 
                    class="material-symbols-outlined text-2xl"
                    :class="star <= newReviewRating ? 'fill-icon' : ''"
                  >
                    star
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                Tu Nombre:
              </label>
              <input 
                v-model="newReviewAuthor"
                type="text" 
                placeholder="Ej. Martina S."
                required
                class="w-full bg-surface border border-outline-variant p-2.5 text-sm font-sans focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                Tu Opinión / Experiencia:
              </label>
              <textarea 
                v-model="newReviewComment"
                rows="4" 
                placeholder="¿Qué te pareció la duración, proyección y notas de esta fragancia?"
                required
                class="w-full bg-surface border border-outline-variant p-2.5 text-sm font-sans focus:border-primary focus:outline-none"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                @click="isReviewModalOpen = false"
                class="font-label text-xs uppercase tracking-widest px-4 py-2.5 border border-outline text-secondary"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 border border-primary-container hover:bg-inverse-surface transition-all"
              >
                Publicar Reseña
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
