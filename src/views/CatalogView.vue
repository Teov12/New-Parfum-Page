<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { products, olfactiveFamilies, brandsList } from '@/data/products'
import { useWishlistStore } from '@/stores/wishlist'
import ProductCard from '@/components/product/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const wishlistStore = useWishlistStore()

// State filters
const searchQuery = ref('')
const selectedGenders = ref([])
const selectedBrands = ref([])
const selectedFamilies = ref([])
const selectedConcentrations = ref([])
const onlyOffers = ref(false)
const onlyWishlist = ref(false)
const maxPrice = ref(350000)
const sortBy = ref('popularity')
const isMobileFiltersOpen = ref(false)

const concentrations = ['Parfum', 'Eau de Parfum', 'Eau de Toilette']

// Initialize filters from query params
const initFromQuery = () => {
  if (route.query.gender) {
    selectedGenders.value = [route.query.gender]
  } else {
    selectedGenders.value = []
  }

  if (route.query.family) {
    selectedFamilies.value = [route.query.family]
  } else {
    selectedFamilies.value = []
  }

  if (route.query.brand) {
    selectedBrands.value = [route.query.brand]
  } else {
    selectedBrands.value = []
  }

  if (route.query.offers === 'true') {
    onlyOffers.value = true
  } else {
    onlyOffers.value = false
  }

  if (route.query.wishlist === 'true') {
    onlyWishlist.value = true
  } else {
    onlyWishlist.value = false
  }

  if (route.query.q) {
    searchQuery.value = route.query.q
  }
}

onMounted(() => {
  initFromQuery()
})

watch(() => route.query, () => {
  initFromQuery()
})

// Filter & Sort Pipeline
const filteredProducts = computed(() => {
  return products.filter(p => {
    // Search
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchesSearch = 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.fragranceFamily.toLowerCase().includes(q) ||
        p.olfactoryPyramid.topNotes.some(n => n.toLowerCase().includes(q)) ||
        p.olfactoryPyramid.heartNotes.some(n => n.toLowerCase().includes(q)) ||
        p.olfactoryPyramid.baseNotes.some(n => n.toLowerCase().includes(q))
      if (!matchesSearch) return false
    }

    // Gender
    if (selectedGenders.value.length > 0 && !selectedGenders.value.includes(p.gender)) {
      return false
    }

    // Brands
    if (selectedBrands.value.length > 0 && !selectedBrands.value.includes(p.brand)) {
      return false
    }

    // Families
    if (selectedFamilies.value.length > 0 && !selectedFamilies.value.includes(p.fragranceFamily)) {
      return false
    }

    // Concentrations
    if (selectedConcentrations.value.length > 0 && !selectedConcentrations.value.includes(p.concentration)) {
      return false
    }

    // Offers
    if (onlyOffers.value && (!p.discountPercentage || p.discountPercentage <= 0)) {
      return false
    }

    // Wishlist
    if (onlyWishlist.value && !wishlistStore.isInWishlist(p.id)) {
      return false
    }

    // Price
    if (p.price > maxPrice.value) {
      return false
    }

    return true
  }).sort((a, b) => {
    if (sortBy.value === 'price-asc') return a.price - b.price
    if (sortBy.value === 'price-desc') return b.price - a.price
    if (sortBy.value === 'rating') return b.rating - a.rating
    if (sortBy.value === 'discount') return (b.discountPercentage || 0) - (a.discountPercentage || 0)
    // Default popularity / featured
    return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0)
  })
})

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedGenders.value = []
  selectedBrands.value = []
  selectedFamilies.value = []
  selectedConcentrations.value = []
  onlyOffers.value = false
  onlyWishlist.value = false
  maxPrice.value = 350000
  sortBy.value = 'popularity'
  router.push({ query: {} })
}

const activeFiltersCount = computed(() => {
  let count = 0
  if (searchQuery.value) count++
  if (selectedGenders.value.length) count += selectedGenders.value.length
  if (selectedBrands.value.length) count += selectedBrands.value.length
  if (selectedFamilies.value.length) count += selectedFamilies.value.length
  if (selectedConcentrations.value.length) count += selectedConcentrations.value.length
  if (onlyOffers.value) count++
  if (onlyWishlist.value) count++
  if (maxPrice.value < 350000) count++
  return count
})
</script>

<template>
  <div class="bg-surface-container py-10">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Breadcrumbs & Header -->
      <div class="mb-10">
        <nav class="font-label text-xs uppercase tracking-widest text-secondary flex items-center gap-2 mb-4">
          <RouterLink to="/" class="hover:text-primary transition-colors">Inicio</RouterLink>
          <span>/</span>
          <span class="text-primary font-bold">Catálogo de Perfumes</span>
          <span v-if="onlyWishlist" class="text-primary font-bold">/ Favoritos</span>
        </nav>

        <div class="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-outline-variant pb-6 gap-4">
          <div>
            <h1 class="font-serif text-4xl md:text-5xl text-primary font-normal tracking-tight">
              {{ onlyWishlist ? 'Tus Fragancias Favoritas' : 'Colección de Perfumes' }}
            </h1>
            <p class="font-sans text-sm text-secondary mt-1">
              Mostrando {{ filteredProducts.length }} fragancias disponibles
            </p>
          </div>

          <!-- Sort Dropdown & Mobile Filter Toggle -->
          <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <!-- Mobile Filter Button -->
            <button 
              @click="isMobileFiltersOpen = true"
              class="md:hidden flex items-center gap-2 font-label text-xs uppercase tracking-widest bg-surface border border-outline px-4 py-2.5 rounded-full text-primary shadow-2xs"
            >
              <span class="material-symbols-outlined text-base">tune</span>
              <span>Filtros ({{ activeFiltersCount }})</span>
            </button>

            <!-- Sort By -->
            <div class="flex items-center gap-2">
              <label for="sort" class="font-label text-xs uppercase tracking-widest text-secondary hidden sm:inline">
                Ordenar por:
              </label>
              <div class="relative">
                <select 
                  id="sort"
                  v-model="sortBy"
                  class="appearance-none bg-surface font-label text-xs uppercase tracking-wider text-primary border border-outline px-4 py-2.5 pr-8 rounded-full focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
                >
                  <option value="popularity">Más Populares</option>
                  <option value="rating">Mejor Valorados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="discount">Mayor Descuento</option>
                </select>
                <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-base text-primary">
                  expand_more
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Layout: Sidebar Filters + Products Grid -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        <!-- SIDEBAR FILTERS (Desktop - Rounded 3xl) -->
        <aside class="hidden md:block md:col-span-3 bg-surface border border-outline-variant rounded-3xl p-6 space-y-6 shadow-xs">
          
          <!-- Clear Filters Button -->
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <span class="font-serif text-lg text-primary font-medium">Filtros</span>
            <button 
              v-if="activeFiltersCount > 0"
              @click="clearAllFilters"
              class="font-label text-[11px] uppercase tracking-widest text-error hover:underline"
            >
              Limpiar ({{ activeFiltersCount }})
            </button>
          </div>

          <!-- Quick Search in Pill -->
          <div>
            <div class="relative">
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Buscar perfume o marca..."
                class="w-full bg-surface-container border border-outline-variant rounded-full text-xs font-sans px-4 py-2.5 pr-8 focus:border-primary focus:outline-none"
              />
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-sm text-secondary">
                search
              </span>
            </div>
          </div>

          <!-- Gender Filter -->
          <div class="border-b border-outline-variant pb-5">
            <h3 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Género</h3>
            <div class="space-y-2 font-sans text-sm text-secondary">
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="woman" v-model="selectedGenders" class="accent-primary w-4 h-4 rounded-md cursor-pointer" />
                <span>Mujer</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="man" v-model="selectedGenders" class="accent-primary w-4 h-4 rounded-md cursor-pointer" />
                <span>Hombre</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="unisex" v-model="selectedGenders" class="accent-primary w-4 h-4 rounded-md cursor-pointer" />
                <span>Unisex & Nicho</span>
              </label>
            </div>
          </div>

          <!-- Olfactive Families Filter -->
          <div class="border-b border-outline-variant pb-5">
            <h3 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Familia Olfativa</h3>
            <div class="space-y-2 font-sans text-sm text-secondary">
              <label 
                v-for="family in olfactiveFamilies" 
                :key="family.name"
                class="flex items-center gap-2.5 cursor-pointer hover:text-primary"
              >
                <input 
                  type="checkbox" 
                  :value="family.name" 
                  v-model="selectedFamilies" 
                  class="accent-primary w-4 h-4 rounded-md cursor-pointer" 
                />
                <span>{{ family.name }}</span>
              </label>
            </div>
          </div>

          <!-- Brands Filter -->
          <div class="border-b border-outline-variant pb-5">
            <h3 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Marcas Oficiales</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
              <label 
                v-for="brand in brandsList" 
                :key="brand"
                class="flex items-center gap-2.5 cursor-pointer hover:text-primary font-sans text-sm text-secondary"
              >
                <input 
                  type="checkbox" 
                  :value="brand" 
                  v-model="selectedBrands" 
                  class="accent-primary w-4 h-4 rounded-md cursor-pointer" 
                />
                <span class="truncate">{{ brand }}</span>
              </label>
            </div>
          </div>

          <!-- Concentration Filter -->
          <div class="border-b border-outline-variant pb-5">
            <h3 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Concentración</h3>
            <div class="space-y-2 font-sans text-sm text-secondary">
              <label 
                v-for="conc in concentrations" 
                :key="conc"
                class="flex items-center gap-2.5 cursor-pointer hover:text-primary"
              >
                <input 
                  type="checkbox" 
                  :value="conc" 
                  v-model="selectedConcentrations" 
                  class="accent-primary w-4 h-4 rounded-md cursor-pointer" 
                />
                <span>{{ conc }}</span>
              </label>
            </div>
          </div>

          <!-- Price Slider Filter -->
          <div class="border-b border-outline-variant pb-5">
            <div class="flex justify-between items-baseline mb-2">
              <h3 class="font-label text-xs uppercase tracking-widest text-primary font-bold">Precio Máximo</h3>
              <span class="font-sans text-xs font-bold text-primary">${{ maxPrice.toLocaleString('es-AR') }}</span>
            </div>
            <input 
              type="range" 
              min="90000" 
              max="350000" 
              step="10000"
              v-model.number="maxPrice"
              class="w-full accent-primary cursor-pointer"
            />
          </div>

          <!-- Special Toggles -->
          <div class="space-y-3 pt-1">
            <label class="flex items-center gap-2.5 cursor-pointer font-label text-xs uppercase tracking-wider text-primary">
              <input type="checkbox" v-model="onlyOffers" class="accent-primary w-4 h-4 rounded-md cursor-pointer" />
              <span>Solo Ofertas Especiales</span>
            </label>
            <label class="flex items-center gap-2.5 cursor-pointer font-label text-xs uppercase tracking-wider text-primary">
              <input type="checkbox" v-model="onlyWishlist" class="accent-primary w-4 h-4 rounded-md cursor-pointer" />
              <span>Solo Mis Favoritos ({{ wishlistStore.totalItems }})</span>
            </label>
          </div>

        </aside>

        <!-- PRODUCTS GRID (Desktop 9 cols) -->
        <main class="md:col-span-9">
          
          <!-- Active Tags Bar (Rounded Pills) -->
          <div v-if="activeFiltersCount > 0" class="flex flex-wrap items-center gap-2 mb-6 bg-surface p-3.5 rounded-2xl border border-outline-variant shadow-2xs">
            <span class="font-label text-[11px] uppercase tracking-widest text-secondary">Filtros Activos:</span>
            
            <span 
              v-if="searchQuery" 
              class="inline-flex items-center gap-1 bg-surface-container text-xs font-sans px-3 py-1 rounded-full border border-outline-variant"
            >
              "{{ searchQuery }}"
              <button @click="searchQuery = ''" class="hover:text-error text-xs">✕</button>
            </span>

            <span 
              v-for="g in selectedGenders" 
              :key="g" 
              class="inline-flex items-center gap-1 bg-surface-container text-xs font-sans px-3 py-1 rounded-full border border-outline-variant"
            >
              {{ g === 'woman' ? 'Mujer' : g === 'man' ? 'Hombre' : 'Unisex' }}
              <button @click="selectedGenders = selectedGenders.filter(x => x !== g)" class="hover:text-error text-xs">✕</button>
            </span>

            <span 
              v-for="f in selectedFamilies" 
              :key="f" 
              class="inline-flex items-center gap-1 bg-surface-container text-xs font-sans px-3 py-1 rounded-full border border-outline-variant"
            >
              {{ f }}
              <button @click="selectedFamilies = selectedFamilies.filter(x => x !== f)" class="hover:text-error text-xs">✕</button>
            </span>

            <span 
              v-for="b in selectedBrands" 
              :key="b" 
              class="inline-flex items-center gap-1 bg-surface-container text-xs font-sans px-3 py-1 rounded-full border border-outline-variant"
            >
              {{ b }}
              <button @click="selectedBrands = selectedBrands.filter(x => x !== b)" class="hover:text-error text-xs">✕</button>
            </span>

            <button 
              @click="clearAllFilters"
              class="text-xs font-label uppercase tracking-wider text-error underline ml-auto"
            >
              Borrar todo
            </button>
          </div>

          <!-- Product Grid -->
          <div v-if="filteredProducts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ProductCard 
              v-for="product in filteredProducts" 
              :key="product.id" 
              :product="product" 
            />
          </div>

          <!-- Empty State -->
          <div v-else class="bg-surface border border-outline-variant rounded-3xl p-16 text-center shadow-xs">
            <span class="material-symbols-outlined text-6xl text-outline mb-4">search_off</span>
            <h3 class="font-serif text-2xl text-primary mb-2 font-normal">No encontramos fragancias con esos filtros</h3>
            <p class="font-sans text-sm text-secondary max-w-md mx-auto mb-8 leading-relaxed">
              Intentá seleccionando otra familia olfativa, ampliando el rango de precio o eliminando los filtros activos.
            </p>
            <button 
              @click="clearAllFilters"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-surface hover:text-primary-container border border-primary-container transition-all shadow-xs"
            >
              Restablecer Filtros
            </button>
          </div>

        </main>

      </div>

    </div>

    <!-- MOBILE FILTERS MODAL -->
    <div 
      v-if="isMobileFiltersOpen"
      class="fixed inset-0 z-50 bg-primary/60 backdrop-blur-xs flex justify-end"
    >
      <div class="w-full max-w-xs bg-surface h-full p-6 overflow-y-auto flex flex-col justify-between border-l border-outline-variant shadow-2xl rounded-l-3xl">
        <div>
          <div class="flex justify-between items-center border-b border-outline-variant pb-4 mb-6">
            <h3 class="font-serif text-xl text-primary font-medium">Filtrar Colección</h3>
            <button @click="isMobileFiltersOpen = false" class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <!-- Quick Filters in Mobile -->
          <div class="space-y-6">
            <div>
              <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Género</h4>
              <div class="space-y-2 font-sans text-sm text-secondary">
                <label class="flex items-center gap-2"><input type="checkbox" value="woman" v-model="selectedGenders" class="accent-primary rounded-md" /> Mujer</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="man" v-model="selectedGenders" class="accent-primary rounded-md" /> Hombre</label>
                <label class="flex items-center gap-2"><input type="checkbox" value="unisex" v-model="selectedGenders" class="accent-primary rounded-md" /> Unisex</label>
              </div>
            </div>

            <div>
              <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Familia Olfativa</h4>
              <div class="space-y-2 font-sans text-sm text-secondary">
                <label v-for="f in olfactiveFamilies" :key="f.name" class="flex items-center gap-2">
                  <input type="checkbox" :value="f.name" v-model="selectedFamilies" class="accent-primary rounded-md" /> {{ f.name }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-outline-variant space-y-3">
          <button 
            @click="isMobileFiltersOpen = false"
            class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 rounded-full text-center shadow-xs"
          >
            Aplicar Filtros ({{ filteredProducts.length }})
          </button>
          <button 
            @click="clearAllFilters(); isMobileFiltersOpen = false"
            class="w-full bg-transparent text-secondary font-label text-xs uppercase tracking-widest py-2 text-center underline"
          >
            Limpiar todo
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
