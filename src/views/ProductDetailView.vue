<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useToastStore } from '@/stores/toast'
import OlfactivePyramid from '@/components/product/OlfactivePyramid.vue'
import ProductCard from '@/components/product/ProductCard.vue'

import { useShippingStore } from '@/stores/shipping'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const cartStore = useCartStore()
const shippingStore = useShippingStore()
const wishlistStore = useWishlistStore()
const toastStore = useToastStore()

// Find product by slug
const product = computed(() => {
  return productStore.items.find(p => p.slug === route.params.slug || p.id === route.params.slug) || null
})

// Selected size state
const selectedSize = ref(null)
const selectedImageIndex = ref(0)
const quantity = ref(1)
const activeTab = ref('pyramid')

// Postal code calculator state (Andreani)
const postalCode = ref(shippingStore.postalCode || '')
const isCalculatingShipping = ref(false)
const shippingEstimate = ref(shippingStore.hasQuote ? { destination: shippingStore.destination, options: shippingStore.options } : null)

const initProduct = () => {
  if (product.value && product.value.sizes && product.value.sizes.length > 0) {
    selectedSize.value = product.value.sizes.find(s => s.default) || product.value.sizes[0]
    selectedImageIndex.value = 0
    quantity.value = 1
  } else {
    selectedSize.value = null
  }
}

onMounted(() => {
  if (productStore.items.length === 0) {
    productStore.fetchProducts()
  }
})

watch(() => route.params.slug, () => {
  initProduct()
}, { immediate: true })

watch(() => product.value, () => {
  initProduct()
})

const currentPrice = computed(() => {
  if (!product.value) return 0
  return selectedSize.value ? selectedSize.value.price : (product.value.price || 0)
})

const relatedProducts = computed(() => {
  if (!product.value) return productStore.items.slice(0, 4)
  return productStore.items.filter(p => p.id !== product.value.id).slice(0, 4)
})

const handleAddToCart = () => {
  if (!product.value) return
  cartStore.addItem(product.value, selectedSize.value, quantity.value)
  toastStore.show(`¡Agregaste ${quantity.value}x ${product.value.name} (${selectedSize.value?.size || ''}) a tu bolsa!`, 'success')
}

const handleBuyNow = () => {
  if (!product.value) return
  cartStore.addItem(product.value, selectedSize.value, quantity.value)
  cartStore.closeDrawer()
  router.push('/checkout')
}

const isBursting = ref(false)

const handleToggleWishlist = () => {
  if (!product.value) return
  isBursting.value = true
  setTimeout(() => {
    isBursting.value = false
  }, 450)
  wishlistStore.toggleWishlist(product.value.id)
  const isNowIn = wishlistStore.isInWishlist(product.value.id)
  toastStore.show(
    isNowIn ? `Guardaste ${product.value.name} en tus favoritos` : `Eliminaste ${product.value.name} de favoritos`,
    'info'
  )
}

const calculateShipping = async () => {
  if (!postalCode.value || postalCode.value.length < 4) {
    toastStore.show('Ingresá un código postal válido de 4 dígitos (ej. 1414, 2400, 5000).', 'error')
    return
  }
  isCalculatingShipping.value = true
  const res = await shippingStore.calculateShipping(postalCode.value, currentPrice.value)
  isCalculatingShipping.value = false
  if (res && res.success) {
    shippingEstimate.value = res
  } else {
    toastStore.show(shippingStore.error || 'Error al cotizar envío con Andreani', 'error')
  }
}
</script>

<template>
  <div class="bg-surface py-8">
    <div v-if="product" class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
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
        
        <!-- IMAGE GALLERY (7 cols - Encuadre Editorial Recto) -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Main Selected Image with Smooth Crossfade Transition -->
          <div class="relative aspect-[4/5] bg-surface-container overflow-hidden rounded-xl border border-outline-variant shadow-sm group">
            <Transition name="image-crossfade" mode="out-in">
              <img 
                :key="selectedImageIndex"
                :src="product.images[selectedImageIndex] || product.images[0]" 
                :alt="product.name"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </Transition>
            
            <div class="absolute top-4 left-4 z-10 flex gap-2">
              <span v-if="product.badge" class="bg-primary-container text-on-primary font-label text-[10px] px-3.5 py-1 uppercase tracking-widest rounded-full shadow-xs">
                {{ product.badge }}
              </span>
              <span class="bg-surface/90 backdrop-blur-xs text-primary font-label text-[10px] px-3.5 py-1 uppercase tracking-widest rounded-full border border-outline-variant shadow-xs">
                100% Original
              </span>
            </div>

            <!-- Wishlist Floating Button with Burst Animation -->
            <button 
              @click="handleToggleWishlist"
              class="absolute top-4 right-4 z-10 w-11 h-11 bg-surface/90 backdrop-blur-xs border border-outline-variant hover:border-primary rounded-full flex items-center justify-center text-primary shadow-xs transition-all duration-200 hover:scale-110 active:scale-95"
              :aria-label="wishlistStore.isInWishlist(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
            >
              <span 
                class="material-symbols-outlined text-xl transition-colors"
                :class="[
                  wishlistStore.isInWishlist(product.id) ? 'fill-icon text-rose-700' : 'text-secondary hover:text-primary',
                  { 'animate-heart-burst': isBursting }
                ]"
              >
                favorite
              </span>
            </button>
          </div>

          <!-- Thumbnails Row with Hover & Active Scale -->
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button
              v-for="(img, idx) in product.images"
              :key="idx"
              @click="selectedImageIndex = idx"
              class="w-20 h-24 flex-shrink-0 bg-surface-container rounded-lg border overflow-hidden transition-all duration-300 shadow-2xs hover:scale-105 active:scale-95"
              :class="selectedImageIndex === idx ? 'border-primary ring-2 ring-primary scale-102' : 'border-outline-variant opacity-70 hover:opacity-100'"
            >
              <img :src="img" :alt="`${product.name} vista ${idx + 1}`" class="w-full h-full object-cover" />
            </button>
          </div>
        </div>

        <!-- DETAILS & BUY BOX (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- Brand Header -->
          <div class="border-b border-outline-variant pb-5">
            <div class="mb-2">
              <RouterLink 
                :to="`/catalogo?brand=${encodeURIComponent(product.brand)}`" 
                class="font-label text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors font-bold"
              >
                {{ product.brand }}
              </RouterLink>
            </div>

            <!-- Product Title -->
            <h1 class="font-sans text-3xl sm:text-4xl text-primary font-normal leading-tight mb-2">
              {{ product.name }}
            </h1>

            <p class="font-sans text-sm text-secondary">
              {{ product.concentration }} • Familia {{ product.fragranceFamily }} • Importado Oficial
            </p>
          </div>

          <!-- Price & Installments -->
          <div class="bg-surface-container-low border border-outline-variant rounded-md p-5 space-y-2 shadow-2xs">
            <div class="flex items-baseline gap-3">
              <span class="font-sans font-bold text-3xl text-primary">
                ${{ currentPrice.toLocaleString('es-AR') }}
              </span>
            </div>

            <div class="space-y-1 text-xs font-label text-secondary uppercase tracking-wider">
              <p class="text-primary font-medium flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm text-tertiary">credit_card</span>
                <strong>3 y 6 cuotas fijas</strong> de ${{ Math.round(currentPrice / 3).toLocaleString('es-AR') }}
              </p>
            </div>
          </div>

          <!-- Short Description -->
          <p class="font-sans text-sm text-secondary leading-relaxed">
            {{ product.shortDescription }}
          </p>

          <!-- Size Selector (Píldoras) -->
          <div class="space-y-2.5">
            <div class="flex justify-between items-baseline">
              <label class="font-label text-xs uppercase tracking-widest text-primary font-bold">
                Presentación / Tamaño:
              </label>
              <span class="font-label text-xs text-secondary">{{ selectedSize?.size }}</span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="s in product.sizes"
                :key="s.size"
                @click="selectedSize = s"
                class="font-label text-xs tracking-wider py-1.5 px-2 rounded-full border text-center transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xs"
                :class="selectedSize?.size === s.size 
                  ? 'bg-primary-container text-on-primary border-primary-container shadow-xs' 
                  : 'bg-surface text-primary border-outline-variant hover:border-primary'"
              >
                <span class="font-bold text-xs">{{ s.size }}</span>
                <span class="text-[10px] opacity-85">${{ s.price.toLocaleString('es-AR') }}</span>
              </button>
            </div>
          </div>

          <!-- Quantity & Action Buttons (Píldoras) -->
          <div class="space-y-3 pt-2">
            <div class="flex gap-3">
              <!-- Quantity Counter -->
              <div class="inline-flex items-center border border-outline-variant rounded-full bg-surface flex-shrink-0 overflow-hidden shadow-2xs">
                <button 
                  @click="quantity = Math.max(1, quantity - 1)"
                  class="px-4 py-3 text-primary hover:bg-surface-container transition-colors text-base font-bold"
                >
                  -
                </button>
                <span class="px-3 py-3 font-label text-xs font-bold text-primary min-w-[2.5rem] text-center">
                  {{ quantity }}
                </span>
                <button 
                  @click="quantity++"
                  class="px-4 py-3 text-primary hover:bg-surface-container transition-colors text-base font-bold"
                >
                  +
                </button>
              </div>

              <!-- Add to Cart CTA (Píldora) -->
              <button 
                @click="handleAddToCart"
                class="flex-grow bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 px-6 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span class="material-symbols-outlined text-base">shopping_bag</span>
                <span>Agregar a la Bolsa</span>
              </button>
            </div>

            <!-- Direct Buy Now CTA (Píldora) -->
            <button 
              @click="handleBuyNow"
              class="w-full bg-transparent text-primary font-label text-xs uppercase tracking-widest py-3 rounded-full border border-primary hover:bg-surface-container transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <span>Comprar Ahora</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <!-- Shipping Calculator Mini Module (Andreani) -->
          <div class="border-t border-outline-variant pt-5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-label text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm text-secondary">local_shipping</span>
                <span>Calcular Envío con Andreani:</span>
              </span>
              <span class="text-[10px] font-label uppercase text-secondary font-semibold">Despacho Oficial</span>
            </div>

            <div class="flex gap-2 bg-surface p-1 rounded-full border border-outline-variant focus-within:border-primary shadow-2xs">
              <input 
                v-model="postalCode"
                type="text" 
                placeholder="Ingresá tu Código Postal (ej. 1414, 2400)"
                maxlength="8"
                class="bg-transparent text-xs font-sans px-4 py-2 text-primary w-full focus:outline-none"
                @keyup.enter="calculateShipping"
              />
              <button 
                @click="calculateShipping"
                :disabled="isCalculatingShipping"
                class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-5 py-2 rounded-full hover:bg-inverse-surface transition-colors flex-shrink-0 shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <span v-if="isCalculatingShipping" class="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                <span>{{ isCalculatingShipping ? 'Cotizando...' : 'Calcular' }}</span>
              </button>
            </div>

            <!-- Andreani Shipping Results -->
            <div v-if="shippingEstimate && shippingEstimate.options" class="bg-surface-container-low rounded-md p-4 space-y-2.5 text-xs font-sans border border-outline-variant animate-in fade-in shadow-2xs">
              <div class="flex justify-between items-center border-b border-outline-variant/60 pb-2">
                <div class="flex items-center gap-1.5 text-primary font-bold">
                  <span class="material-symbols-outlined text-sm text-emerald-700">pin_drop</span>
                  <span>{{ shippingEstimate.destination.zone }} (CP {{ shippingEstimate.destination.postalCode }})</span>
                </div>
                <span class="text-[10px] text-secondary">Logística Andreani</span>
              </div>

              <div 
                v-for="opt in shippingEstimate.options" 
                :key="opt.id"
                class="flex justify-between items-center p-2.5 rounded-xs bg-surface border border-outline-variant/60 hover:border-primary transition-colors"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-primary">{{ opt.name }}</span>
                    <span v-if="opt.badge" class="text-[9px] font-label font-bold uppercase px-2 py-0.5 rounded-full" :class="opt.isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-secondary'">
                      {{ opt.badge }}
                    </span>
                  </div>
                  <p class="text-[11px] text-secondary mt-0.5">Plazo de entrega: <strong>{{ opt.estimatedDays }}</strong></p>
                </div>
                <div class="text-right">
                  <span class="font-bold text-sm" :class="opt.isFree ? 'text-emerald-700' : 'text-primary'">
                    {{ opt.price === 0 ? '¡GRATIS!' : `$${opt.price.toLocaleString('es-AR')}` }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Trust Badges Mini Grid -->
          <div class="grid grid-cols-2 gap-3 pt-2">
            <div class="flex items-center gap-2 p-3 bg-surface-container rounded-xs border border-outline-variant shadow-2xs">
              <span class="material-symbols-outlined text-base text-primary">verified</span>
              <span class="font-label text-[10px] uppercase text-primary">Batch Code Verificable</span>
            </div>
            <div class="flex items-center gap-2 p-3 bg-surface-container rounded-xs border border-outline-variant shadow-2xs">
              <span class="material-symbols-outlined text-base text-primary">local_shipping</span>
              <span class="font-label text-[10px] uppercase text-primary">Envío Asegurado</span>
            </div>
          </div>

        </div>

      </div>

      <!-- DETAILED TABS SECTION: PYRAMID, DESCRIPTION, LONGEVITY, REVIEWS -->
      <div class="mb-20 border-t border-outline-variant pt-12">
        <!-- Tabs Header: Píldoras -->
        <div class="flex flex-wrap gap-2 bg-surface-container p-1.5 rounded-full border border-outline-variant mb-8 max-w-2xl mx-auto justify-center shadow-2xs">
          <button
            @click="activeTab = 'pyramid'"
            class="font-label text-xs sm:text-sm uppercase tracking-wider py-2 px-5 rounded-full transition-all"
            :class="activeTab === 'pyramid' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-secondary hover:text-primary'"
          >
            Pirámide Olfativa
          </button>
          <button
            @click="activeTab = 'description'"
            class="font-label text-xs sm:text-sm uppercase tracking-wider py-2 px-5 rounded-full transition-all"
            :class="activeTab === 'description' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-secondary hover:text-primary'"
          >
            Descripción & Cómo Usarlo
          </button>
          <button
            @click="activeTab = 'characteristics'"
            class="font-label text-xs sm:text-sm uppercase tracking-wider py-2 px-5 rounded-full transition-all"
            :class="activeTab === 'characteristics' ? 'bg-primary-container text-on-primary shadow-xs' : 'text-secondary hover:text-primary'"
          >
            Ficha Técnica
          </button>
        </div>

        <!-- Dynamic Tab Content with Smooth Transition -->
        <Transition name="page-fade" mode="out-in">
          <!-- Tab 1: Olfactive Pyramid Component -->
          <div v-if="activeTab === 'pyramid'" key="pyramid" class="transition-all duration-300">
            <OlfactivePyramid :pyramid="product.olfactoryPyramid" />
          </div>

          <!-- Tab 2: Storytelling & Usage Ritual -->
          <div v-else-if="activeTab === 'description'" key="description" class="bg-surface-container border border-outline-variant rounded-2xl p-8 space-y-6 shadow-xs transition-all duration-300">
            <div>
              <h3 class="font-sans text-2xl text-primary font-normal mb-3">La Historia Olfativa</h3>
              <p class="font-sans text-secondary text-base leading-relaxed">
                {{ product.description }}
              </p>
            </div>

            <div class="border-t border-outline-variant pt-6">
              <h4 class="font-sans text-xl text-primary font-medium mb-2">Consejos de Aplicación</h4>
              <p class="font-sans text-secondary text-sm leading-relaxed mb-4">
                {{ product.usageTips }}
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 font-label text-xs uppercase tracking-wider text-secondary">
                <div class="p-4 bg-surface rounded-xl border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                  <strong>1. Puntos de Pulso:</strong> Muñecas, clavículas y cuello.
                </div>
                <div class="p-4 bg-surface rounded-xl border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                  <strong>2. No Frotar:</strong> Deja secar al aire para no romper las notas.
                </div>
                <div class="p-4 bg-surface rounded-xl border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                  <strong>3. Hidratación:</strong> Aplica sobre piel hidratada para mayor fijación.
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 3: Technical Specifications -->
          <div v-else-if="activeTab === 'characteristics'" key="characteristics" class="bg-surface-container border border-outline-variant rounded-2xl p-8 shadow-xs transition-all duration-300">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="p-5 bg-surface rounded-xl border border-outline-variant shadow-2xs hover:border-primary transition-all hover:-translate-y-0.5">
                <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Duración en Piel</span>
                <p class="font-sans text-lg text-primary font-medium">{{ product.characteristics.longevity }}</p>
              </div>
              <div class="p-5 bg-surface rounded-xl border border-outline-variant shadow-2xs hover:border-primary transition-all hover:-translate-y-0.5">
                <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Estela / Proyección</span>
                <p class="font-sans text-lg text-primary font-medium">{{ product.characteristics.sillage }}</p>
              </div>
              <div class="p-5 bg-surface rounded-xl border border-outline-variant shadow-2xs hover:border-primary transition-all hover:-translate-y-0.5">
                <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Estación Ideal</span>
                <p class="font-sans text-lg text-primary font-medium">{{ product.characteristics.season }}</p>
              </div>
              <div class="p-5 bg-surface rounded-xl border border-outline-variant shadow-2xs hover:border-primary transition-all hover:-translate-y-0.5">
                <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Ocasión Sugerida</span>
                <p class="font-sans text-lg text-primary font-medium">{{ product.characteristics.occasion }}</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- RELATED FRAGRANCES SECTION -->
      <div v-if="relatedProducts.length > 0" class="border-t border-outline-variant pt-16">
        <div class="text-center max-w-xl mx-auto mb-12">
          <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">También te pueden gustar</p>
          <h2 class="font-sans text-3xl md:text-headline-lg text-primary font-normal">Perfumes Relacionados</h2>
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

    <!-- Product Not Found Fallback -->
    <div v-else class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-24 text-center">
      <span class="material-symbols-outlined text-6xl text-neutral-300 mb-4">search_off</span>
      <h2 class="font-sans text-3xl text-primary font-normal mb-3">Fragancia no encontrada</h2>
      <p class="font-sans text-secondary text-sm max-w-md mx-auto mb-8">
        No pudimos encontrar la fragancia solicitada o el catálogo se encuentra en actualización.
      </p>
      <RouterLink 
        to="/catalogo"
        class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full inline-block hover:bg-inverse-surface transition-all shadow-xs"
      >
        Explorar Catálogo
      </RouterLink>
    </div>
  </div>
</template>
