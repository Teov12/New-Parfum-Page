<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
const postalCode = ref('')
const isCalculatingShipping = ref(false)
const shippingEstimate = ref(null)

const initProduct = () => {
  if (product.value && product.value.sizes && product.value.sizes.length > 0) {
    selectedSize.value = product.value.sizes.find(s => s.default) || product.value.sizes[0]
    selectedImageIndex.value = 0
    quantity.value = 1
  } else {
    selectedSize.value = null
  }
  postalCode.value = ''
  shippingEstimate.value = null
}

const updateSeoMetadata = () => {
  if (!product.value) return

  const p = product.value
  const concentrationText = p.concentration ? ` (${p.concentration})` : ''
  const pageTitle = `${p.name} de ${p.brand}${concentrationText} | 100% Original - Gicca Perfumes`
  document.title = pageTitle

  const desc = p.description 
    ? `${p.description.slice(0, 140)}... Comprá ${p.name} original en Gicca Perfumes Argentina con cuotas sin interés y envíos asegurados.`
    : `Comprá ${p.name} de ${p.brand} 100% original en Gicca Perfumes Argentina. Fragancia ${p.gender || 'exclusiva'} con hasta 6 cuotas y envíos a todo el país.`

  const setMetaTag = (attr, key, content) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, key)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  setMetaTag('name', 'description', desc)
  setMetaTag('name', 'keywords', `${p.name}, ${p.brand}, perfume ${p.gender || ''}, ${p.fragranceFamily || ''}, perfume original argentina, decants perfumes`)
  setMetaTag('property', 'og:title', pageTitle)
  setMetaTag('property', 'og:description', desc)
  setMetaTag('property', 'og:type', 'product')
  if (p.images && p.images.length > 0) {
    setMetaTag('property', 'og:image', p.images[0])
    setMetaTag('name', 'twitter:image', p.images[0])
  }
  setMetaTag('property', 'og:url', `https://giccaparfum.com/producto/${p.slug || p.id}`)
  setMetaTag('name', 'twitter:title', pageTitle)
  setMetaTag('name', 'twitter:description', desc)

  // Rich snippet meta tags
  setMetaTag('property', 'product:price:amount', String(currentPrice.value || p.price || 0))
  setMetaTag('property', 'product:price:currency', 'ARS')

  // Canonical link tag
  let canonical = document.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', `https://giccaparfum.com/producto/${p.slug || p.id}`)

  // Inject Schema.org JSON-LD for Google Rich Snippets
  let script = document.getElementById('product-schema-jsonld')
  if (!script) {
    script = document.createElement('script')
    script.id = 'product-schema-jsonld'
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  const schemaData = [
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": `${p.name} - ${p.brand}`,
      "image": p.images && p.images.length > 0 ? p.images : ["https://giccaparfum.com/og-image.jpg"],
      "description": p.description || `Perfume ${p.name} original de ${p.brand}. Fragancia ${p.gender || 'unisex'}.`,
      "brand": {
        "@type": "Brand",
        "name": p.brand
      },
      "sku": String(p.id || p.slug),
      "category": "Fragrances > Perfumes",
      "offers": {
        "@type": "Offer",
        "url": `https://giccaparfum.com/producto/${p.slug || p.id}`,
        "priceCurrency": "ARS",
        "price": currentPrice.value || p.price || 0,
        "priceValidUntil": "2026-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": p.stock > 0 || p.stock === undefined ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Gicca Perfumes"
        }
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Inicio",
          "item": "https://giccaparfum.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Perfumes",
          "item": "https://giccaparfum.com/catalogo"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": p.brand,
          "item": `https://giccaparfum.com/catalogo?brand=${encodeURIComponent(p.brand)}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": p.name,
          "item": `https://giccaparfum.com/producto/${p.slug || p.id}`
        }
      ]
    }
  ]

  script.textContent = JSON.stringify(schemaData)
}

onMounted(() => {
  if (productStore.items.length === 0) {
    productStore.fetchProducts()
  }
  updateSeoMetadata()
})

onUnmounted(() => {
  const script = document.getElementById('product-schema-jsonld')
  if (script) script.remove()
})

watch(() => route.params.slug, () => {
  initProduct()
  updateSeoMetadata()
}, { immediate: true })

watch(() => product.value, () => {
  initProduct()
  updateSeoMetadata()
})

watch(() => selectedSize.value, () => {
  updateSeoMetadata()
})

const currentPrice = computed(() => {
  if (!product.value) return 0
  return selectedSize.value ? selectedSize.value.price : (product.value.price || 0)
})

const currentTransferPrice = computed(() => {
  if (!product.value) return 0
  if (selectedSize.value?.transferPrice) return selectedSize.value.transferPrice
  if (product.value.transferPrice) return product.value.transferPrice
  return currentPrice.value > 0 ? Math.round(currentPrice.value * 0.80) : 0
})

const seasonList = computed(() => {
  const s = product.value?.characteristics?.season
  if (!s) return ['Todo el año']
  if (Array.isArray(s)) {
    const valid = s.map(item => String(item).trim()).filter(Boolean)
    return valid.length > 0 ? valid : ['Todo el año']
  }
  if (typeof s === 'string') {
    const trimmed = s.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          const valid = parsed.map(item => String(item).trim()).filter(Boolean)
          return valid.length > 0 ? valid : ['Todo el año']
        }
      } catch {
        const cleaned = trimmed.replace(/[\[\]"']/g, '').split(',').map(item => item.trim()).filter(Boolean)
        return cleaned.length > 0 ? cleaned : ['Todo el año']
      }
    }
    if (trimmed.includes('/')) {
      return trimmed.split('/').map(item => item.trim()).filter(Boolean)
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(item => item.trim()).filter(Boolean)
    }
    return [trimmed || 'Todo el año']
  }
  return [String(s)]
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
                :alt="`Perfume ${product.name} de ${product.brand} (${product.concentration || 'Eau de Parfum'}) 100% Original`"
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
              <img :src="img" :alt="`Perfume ${product.name} de ${product.brand} - foto ${idx + 1}`" class="w-full h-full object-cover" />
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
          <div class="bg-surface-container-low border border-outline-variant rounded-md p-5 space-y-3.5 shadow-2xs">
            <div>
              <span class="text-[10px] font-label uppercase font-bold tracking-widest text-emerald-800 block mb-1">
                Precio exclusivo con Transferencia
              </span>
              <div class="flex items-baseline gap-2.5 flex-wrap">
                <span class="font-sans font-bold text-3xl sm:text-4xl text-primary">
                  ${{ currentTransferPrice.toLocaleString('es-AR') }}
                </span>
                <span class="text-xs font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-xs border border-emerald-200">
                  20% OFF
                </span>
              </div>
            </div>

            <div class="border-t border-outline-variant/70 pt-3 space-y-1">
              <div class="flex items-baseline justify-between flex-wrap gap-2 text-xs">
                <span class="text-secondary font-medium">Precio de lista (Tarjetas bancarias):</span>
                <strong class="text-primary font-bold text-sm">${{ currentPrice.toLocaleString('es-AR') }}</strong>
              </div>
              <p class="text-xs text-amber-800 font-sans flex items-center gap-1.5 font-medium">
                <span class="material-symbols-outlined text-base">credit_card</span>
                <span>Hasta <strong>3 cuotas fijas sin interés</strong> de ${{ Math.round(currentPrice / 3).toLocaleString('es-AR') }}</span>
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

            <div class="flex gap-2 bg-surface p-1 rounded-xs border border-outline-variant focus-within:border-primary shadow-2xs">
              <input 
                v-model="postalCode"
                type="text" 
                placeholder="Ingresá tu Código Postal (ej. 1414, 2400)"
                maxlength="8"
                class="bg-transparent text-xs font-sans px-3 py-2 text-primary w-full focus:outline-none"
                @keyup.enter="calculateShipping"
              />
              <button 
                @click="calculateShipping"
                :disabled="isCalculatingShipping"
                class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-4 py-2 rounded-xs hover:bg-inverse-surface transition-colors flex-shrink-0 shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
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
                    <span v-if="opt.badge" class="text-[9px] font-label font-bold uppercase px-2 py-0.5 rounded-xs" :class="opt.isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-secondary'">
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
        <div class="min-h-[360px]">
          <Transition name="tab-fade" mode="out-in">
            <!-- Tab 1: Olfactive Pyramid Component -->
            <div v-if="activeTab === 'pyramid'" key="pyramid">
              <OlfactivePyramid :pyramid="product.olfactoryPyramid" />
            </div>

            <!-- Tab 2: Storytelling & Usage Ritual -->
            <div v-else-if="activeTab === 'description'" key="description" class="bg-surface-container border border-outline-variant rounded-xs p-6 sm:p-8 space-y-6 shadow-xs">
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
                  <div class="p-4 bg-surface rounded-xs border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                    <strong>1. Puntos de Pulso:</strong> Muñecas, clavículas y cuello.
                  </div>
                  <div class="p-4 bg-surface rounded-xs border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                    <strong>2. No Frotar:</strong> Deja secar al aire para no romper las notas.
                  </div>
                  <div class="p-4 bg-surface rounded-xs border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                    <strong>3. Hidratación:</strong> Aplica sobre piel hidratada para mayor fijación.
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab 3: Technical Specifications -->
            <div v-else-if="activeTab === 'characteristics'" key="characteristics" class="bg-surface-container border border-outline-variant rounded-xs p-6 sm:p-8 shadow-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="p-5 bg-surface rounded-xs border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                  <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Duración en Piel</span>
                  <p class="font-sans text-base text-primary font-medium">{{ product.characteristics?.longevity || '8 a 12 horas' }}</p>
                </div>
                <div class="p-5 bg-surface rounded-xs border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                  <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Estela / Proyección</span>
                  <p class="font-sans text-base text-primary font-medium">{{ product.characteristics?.sillage || 'Moderada' }}</p>
                </div>
                <div class="p-5 bg-surface rounded-xs border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                  <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1.5">Estación Ideal</span>
                  <div class="flex flex-wrap gap-1.5 items-center">
                    <span 
                      v-for="season in seasonList" 
                      :key="season"
                      class="font-sans text-xs font-semibold text-primary bg-surface-container px-2.5 py-1 rounded-xs border border-outline-variant"
                    >
                      {{ season }}
                    </span>
                  </div>
                </div>
                <div class="p-5 bg-surface rounded-xs border border-outline-variant shadow-2xs hover:border-primary transition-colors">
                  <span class="font-label text-xs uppercase tracking-widest text-secondary block mb-1">Ocasión Sugerida</span>
                  <p class="font-sans text-base text-primary font-medium">{{ product.characteristics?.occasion || 'Uso diario y ocasiones especiales' }}</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>
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
