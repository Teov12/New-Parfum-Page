<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { brandsList } from '@/data/products'
import { useWishlistStore } from '@/stores/wishlist'
import { useProductStore } from '@/stores/products'
import { useSiteContentStore } from '@/stores/siteContent'
import ProductCard from '@/components/product/ProductCard.vue'
import { 
  normalizeGender, 
  normalizeCategory, 
  formatGenderLabel, 
  formatCategoryLabel 
} from '@/utils/normalize'

const route = useRoute()
const router = useRouter()
const wishlistStore = useWishlistStore()
const productStore = useProductStore()
const siteContentStore = useSiteContentStore()

const olfactiveFamilies = computed(() => siteContentStore.olfactiveFamilies)

// State filters
const searchQuery = ref('')
const selectedGenders = ref([])
const selectedCategories = ref([])
const selectedBrands = ref([])
const selectedFamilies = ref([])
const selectedConcentrations = ref([])
const onlyWishlist = ref(false)
const onlyDecants = ref(false)
const maxPrice = ref(350000)
const sortBy = ref('popularity')
const isMobileFiltersOpen = ref(false)

const concentrations = ['Parfum', 'Eau de Parfum', 'Eau de Toilette']

const isProductWithDecants = (p) => {
  if (!p) return false
  const cat = String(p.category || '').toLowerCase()
  if (cat.includes('decant') || cat.includes('muestra') || cat.includes('fraccionado')) return true
  if (Array.isArray(p.sizes)) {
    return p.sizes.some(s => {
      const sizeStr = typeof s === 'object' ? String(s.size || '') : String(s)
      const lower = sizeStr.toLowerCase()
      if (lower.includes('decant') || lower.includes('muestra') || lower.includes('fraccionado')) return true
      const num = parseInt(lower.replace(/\D/g, ''), 10)
      return !isNaN(num) && num > 0 && num <= 15
    })
  }
  return false
}

const totalDecantsCount = computed(() => {
  return productStore.items.filter(isProductWithDecants).length
})

const availableBrands = computed(() => {
  const dynamic = productStore.brandsList
  return dynamic.length > 0 ? dynamic : brandsList
})

// Initialize filters from query params
const initFromQuery = () => {
  if (route.query.gender) {
    selectedGenders.value = [normalizeGender(route.query.gender)]
  } else {
    selectedGenders.value = []
  }

  if (route.query.category) {
    selectedCategories.value = [normalizeCategory(route.query.category)]
  } else {
    selectedCategories.value = []
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

  if (route.query.wishlist === 'true') {
    onlyWishlist.value = true
  } else {
    onlyWishlist.value = false
  }

  if (route.query.decants === 'true' || route.query.decant === 'true') {
    onlyDecants.value = true
  } else {
    onlyDecants.value = false
  }

  if (route.query.q) {
    searchQuery.value = route.query.q
  }

  updateCatalogSeo()
}

const updateCatalogSeo = () => {
  let title = 'Catálogo de Perfumes Importados y Árabes | Gicca Perfumes Argentina'
  let desc = 'Explorá nuestro catálogo de perfumes importados y árabes 100% originales en Argentina. Lattafa, Afnan, Armaf, Dior, Chanel y más. Envíos a todo el país y cuotas.'

  const normCat = normalizeCategory(route.query.category)
  const normGen = normalizeGender(route.query.gender)

  if (route.query.brand) {
    title = `Perfumes ${route.query.brand} Originales en Argentina | Catálogo Gicca`
    desc = `Comprá perfumes ${route.query.brand} 100% originales en cuotas sin interés. Catálogo oficial con envíos a todo el país y garantía de autenticidad.`
  } else if (normCat === 'arabe') {
    title = 'Perfumes Árabes Originales en Argentina - Lattafa, Afnan, Armaf | Gicca'
    desc = 'Los mejores perfumes árabes originales en Argentina. Descubrí fragancias virales de larga duración como Khamrah, Asad, Yara y Club de Nuit.'
  } else if (normCat === 'disenador') {
    title = 'Perfumes de Diseñador Originales en Argentina | Gicca Perfumes'
    desc = 'Colección de perfumes importados de grandes marcas de diseñador 100% originales en Argentina con cuotas sin interés.'
  } else if (normCat === 'nicho') {
    title = 'Perfumes de Nicho Originales en Argentina | Gicca Perfumes'
    desc = 'Perfumes de autor y alta perfumería de nicho 100% originales en Argentina con cuotas y envíos.'
  } else if (normGen === 'man') {
    title = 'Perfumes Importados para Hombre | Fragancias Masculinas - Gicca'
    desc = 'Perfumes importados masculinos 100% originales en Argentina. Amaderados, especiados y frescos con cuotas sin interés y envíos rápidos.'
  } else if (normGen === 'woman') {
    title = 'Perfumes Importados para Mujer | Fragancias Femeninas - Gicca'
    desc = 'Perfumes importados femeninos originales en Argentina. Florales, orientales y dulces de las mejores casas perfumistas del mundo.'
  } else if (normGen === 'unisex') {
    title = 'Perfumes Unisex Importados y Árabes | Gicca Perfumes'
    desc = 'Colección de perfumes unisex de nicho y árabes originales. Aromas sofisticados para compartir con cuotas sin interés.'
  } else if (route.query.family) {
    title = `Perfumes Familia Olfativa ${route.query.family} | Gicca Perfumes`
    desc = `Descubrí perfumes con notas de la familia olfativa ${route.query.family}. Fragancias seleccionadas 100% originales en Argentina.`
  } else if (route.query.q) {
    title = `Buscar "${route.query.q}" en Perfumes | Gicca Perfumes`
    desc = `Resultados de búsqueda para ${route.query.q} en Gicca Perfumes. Encontrá tus fragancias favoritas originales con envíos a todo el país.`
  }

  document.title = title

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
  setMetaTag('property', 'og:title', title)
  setMetaTag('property', 'og:description', desc)
  setMetaTag('name', 'twitter:title', title)
  setMetaTag('name', 'twitter:description', desc)

  let canonical = document.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  const cleanUrl = window.location.origin + window.location.pathname + (window.location.search ? window.location.search : '')
  canonical.setAttribute('href', cleanUrl)
}

onMounted(() => {
  initFromQuery()
  if (productStore.items.length === 0) {
    productStore.fetchProducts()
  }
})

watch(() => route.query, () => {
  initFromQuery()
})

// Filter & Sort Pipeline
const filteredProducts = computed(() => {
  return productStore.items.filter(p => {
    // Search
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchesSearch = 
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.fragranceFamily?.toLowerCase().includes(q) ||
        p.olfactoryPyramid?.topNotes?.some(n => n.toLowerCase().includes(q)) ||
        p.olfactoryPyramid?.heartNotes?.some(n => n.toLowerCase().includes(q)) ||
        p.olfactoryPyramid?.baseNotes?.some(n => n.toLowerCase().includes(q))
      if (!matchesSearch) return false
    }

    // Gender (normalizado: soporta 'woman'/'mujer', 'man'/'hombre', 'unisex')
    if (selectedGenders.value.length > 0) {
      const pGender = normalizeGender(p.gender)
      const matchesGender = selectedGenders.value.some(g => normalizeGender(g) === pGender)
      if (!matchesGender) return false
    }

    // Category (normalizado: soporta 'arabe'/'arabes', 'disenador', 'nicho')
    if (selectedCategories.value.length > 0) {
      const pCat = normalizeCategory(p.category)
      const matchesCategory = selectedCategories.value.some(c => normalizeCategory(c) === pCat)
      if (!matchesCategory) return false
    }

    // Brands
    if (selectedBrands.value.length > 0 && !selectedBrands.value.includes(p.brand)) {
      return false
    }

    // Families
    if (selectedFamilies.value.length > 0) {
      const match = selectedFamilies.value.some(f => {
        if (!p.fragranceFamily) return false
        const pFam = p.fragranceFamily.toLowerCase().trim()
        const target = f.toLowerCase().trim()
        return pFam === target || pFam.includes(target) || target.includes(pFam)
      })
      if (!match) return false
    }

    // Concentrations
    if (selectedConcentrations.value.length > 0 && !selectedConcentrations.value.includes(p.concentration)) {
      return false
    }

    // Wishlist
    if (onlyWishlist.value && !wishlistStore.isInWishlist(p.id)) {
      return false
    }

    // Decants / Fraccionados
    if (onlyDecants.value && !isProductWithDecants(p)) {
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
    // Default popularity / featured
    return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0)
  })
})

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedGenders.value = []
  selectedCategories.value = []
  selectedBrands.value = []
  selectedFamilies.value = []
  selectedConcentrations.value = []
  onlyWishlist.value = false
  onlyDecants.value = false
  maxPrice.value = 350000
  sortBy.value = 'popularity'
  router.push({ query: {} })
}

const activeFiltersCount = computed(() => {
  let count = 0
  if (searchQuery.value) count++
  if (selectedGenders.value.length) count += selectedGenders.value.length
  if (selectedCategories.value.length) count += selectedCategories.value.length
  if (selectedBrands.value.length) count += selectedBrands.value.length
  if (selectedFamilies.value.length) count += selectedFamilies.value.length
  if (selectedConcentrations.value.length) count += selectedConcentrations.value.length
  if (onlyWishlist.value) count++
  if (onlyDecants.value) count++
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
            <h1 class="font-sans text-4xl md:text-5xl text-primary font-normal tracking-tight">
              {{ onlyWishlist ? 'Tus Fragancias Favoritas' : 'Catálogo de Perfumes' }}
            </h1>
            <p class="font-sans text-sm text-secondary mt-1">
              Mostrando {{ filteredProducts.length }} fragancias disponibles
            </p>
          </div>

          <!-- Sort Dropdown & Mobile Filter Toggle -->
          <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <!-- Mobile Filter Button (Píldora) -->
            <button 
              @click="isMobileFiltersOpen = true"
              class="md:hidden flex items-center gap-2 font-label text-xs uppercase tracking-widest bg-surface border border-outline px-4 py-2.5 rounded-full text-primary shadow-2xs"
            >
              <span class="material-symbols-outlined text-base">tune</span>
              <span>Filtros ({{ activeFiltersCount }})</span>
            </button>

            <!-- Sort By (Píldora) -->
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
                </select>
                <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-base text-primary">
                  expand_more
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Horizontal Quick Filter Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        <button
          type="button"
          @click="onlyDecants = !onlyDecants"
          class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer"
          :class="onlyDecants 
            ? 'bg-amber-800 text-white border-amber-800 font-bold scale-102 shadow-xs' 
            : 'bg-amber-50 hover:bg-amber-100/80 text-amber-950 border-amber-300'"
        >
          <span class="material-symbols-outlined text-sm">science</span>
          <span>Decants & Muestras</span>
          <span class="text-[10px] opacity-80">({{ totalDecantsCount }})</span>
        </button>

        <button
          type="button"
          @click="selectedCategories.includes('arabe') ? selectedCategories = selectedCategories.filter(c => c !== 'arabe') : selectedCategories.push('arabe')"
          class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer"
          :class="selectedCategories.includes('arabe') 
            ? 'bg-primary text-on-primary border-primary font-bold shadow-xs' 
            : 'bg-surface hover:bg-surface-container text-primary border-outline-variant'"
        >
          <span>Perfumes Árabes</span>
        </button>

        <button
          type="button"
          @click="selectedCategories.includes('disenador') ? selectedCategories = selectedCategories.filter(c => c !== 'disenador') : selectedCategories.push('disenador')"
          class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer"
          :class="selectedCategories.includes('disenador') 
            ? 'bg-primary text-on-primary border-primary font-bold shadow-xs' 
            : 'bg-surface hover:bg-surface-container text-primary border-outline-variant'"
        >
          <span>Diseñador</span>
        </button>

        <button
          type="button"
          @click="selectedCategories.includes('nicho') ? selectedCategories = selectedCategories.filter(c => c !== 'nicho') : selectedCategories.push('nicho')"
          class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer"
          :class="selectedCategories.includes('nicho') 
            ? 'bg-primary text-on-primary border-primary font-bold shadow-xs' 
            : 'bg-surface hover:bg-surface-container text-primary border-outline-variant'"
        >
          <span>Nicho Exclusivo</span>
        </button>

        <button
          type="button"
          @click="onlyWishlist = !onlyWishlist"
          class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer"
          :class="onlyWishlist 
            ? 'bg-rose-700 text-white border-rose-700 font-bold shadow-xs' 
            : 'bg-surface hover:bg-surface-container text-primary border-outline-variant'"
        >
          <span class="material-symbols-outlined text-sm">favorite</span>
          <span>Favoritos</span>
        </button>
      </div>

      <!-- Main Layout: Sidebar Filters + Products Grid -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        <!-- SIDEBAR FILTERS (Modern Warm Luxury Card) -->
        <aside class="hidden md:block md:col-span-3 bg-surface border border-outline-variant rounded-md p-6 space-y-6 shadow-xs">
          
          <!-- Clear Filters Button -->
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <span class="font-serif text-lg text-primary font-normal">Filtros</span>
            <button 
              v-if="activeFiltersCount > 0"
              @click="clearAllFilters"
              class="font-label text-[11px] uppercase tracking-widest text-error hover:underline cursor-pointer"
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
                <input type="checkbox" value="woman" v-model="selectedGenders" class="accent-primary w-4 h-4 rounded-xs cursor-pointer" />
                <span>Mujer</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="man" v-model="selectedGenders" class="accent-primary w-4 h-4 rounded-xs cursor-pointer" />
                <span>Hombre</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="unisex" v-model="selectedGenders" class="accent-primary w-4 h-4 rounded-xs cursor-pointer" />
                <span>Unisex</span>
              </label>
            </div>
          </div>

          <!-- Category Filter -->
          <div class="border-b border-outline-variant pb-5">
            <h3 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Categoría</h3>
            <div class="space-y-2 font-sans text-sm text-secondary">
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="disenador" v-model="selectedCategories" class="accent-primary w-4 h-4 rounded-xs cursor-pointer" />
                <span>Diseñador</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="arabe" v-model="selectedCategories" class="accent-primary w-4 h-4 rounded-xs cursor-pointer" />
                <span>Perfumería Árabe</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer hover:text-primary">
                <input type="checkbox" value="nicho" v-model="selectedCategories" class="accent-primary w-4 h-4 rounded-xs cursor-pointer" />
                <span>Perfumería de Nicho</span>
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
                  class="accent-primary w-4 h-4 rounded-xs cursor-pointer" 
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
                v-for="brand in availableBrands" 
                :key="brand"
                class="flex items-center gap-2.5 cursor-pointer hover:text-primary font-sans text-sm text-secondary"
              >
                <input 
                  type="checkbox" 
                  :value="brand" 
                  v-model="selectedBrands" 
                  class="accent-primary w-4 h-4 rounded-xs cursor-pointer" 
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
                  class="accent-primary w-4 h-4 rounded-xs cursor-pointer" 
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
              <input type="checkbox" v-model="onlyWishlist" class="accent-primary w-4 h-4 rounded-xs cursor-pointer" />
              <span>Solo Mis Favoritos ({{ wishlistStore.totalItems }})</span>
            </label>
          </div>

        </aside>

        <!-- PRODUCTS GRID (Desktop 9 cols) -->
        <main class="md:col-span-9">
          
          <!-- Active Tags Bar -->
          <div v-if="activeFiltersCount > 0" class="flex flex-wrap items-center gap-2 mb-6 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
            <span class="font-sans text-xs font-semibold text-neutral-400 uppercase tracking-wider">Filtros Activos:</span>
            
            <span 
              v-if="onlyDecants" 
              class="inline-flex items-center gap-1.5 bg-amber-100 text-amber-950 text-xs font-sans font-medium px-3 py-1 rounded-full border border-amber-300 shadow-2xs"
            >
              <span>Sólo Decants & Fraccionados</span>
              <button @click="onlyDecants = false" class="hover:text-rose-600 flex items-center cursor-pointer" aria-label="Quitar filtro">
                <span class="material-symbols-outlined text-xs">close</span>
              </button>
            </span>

            <span 
              v-if="searchQuery" 
              class="inline-flex items-center gap-1.5 bg-neutral-100 text-xs font-sans font-medium px-3 py-1 rounded-full border border-neutral-200"
            >
              "{{ searchQuery }}"
              <button @click="searchQuery = ''" class="hover:text-rose-600 flex items-center cursor-pointer" aria-label="Quitar filtro">
                <span class="material-symbols-outlined text-xs">close</span>
              </button>
            </span>

            <span 
              v-for="g in selectedGenders" 
              :key="g" 
              class="inline-flex items-center gap-1.5 bg-neutral-100 text-xs font-sans font-medium px-3 py-1 rounded-full border border-neutral-200"
            >
              {{ formatGenderLabel(g) }}
              <button @click="selectedGenders = selectedGenders.filter(x => x !== g)" class="hover:text-rose-600 flex items-center cursor-pointer" aria-label="Quitar filtro">
                <span class="material-symbols-outlined text-xs">close</span>
              </button>
            </span>

            <span 
              v-for="c in selectedCategories" 
              :key="c" 
              class="inline-flex items-center gap-1.5 bg-neutral-100 text-xs font-sans font-medium px-3 py-1 rounded-full border border-neutral-200"
            >
              {{ formatCategoryLabel(c) }}
              <button @click="selectedCategories = selectedCategories.filter(x => x !== c)" class="hover:text-rose-600 flex items-center cursor-pointer" aria-label="Quitar filtro">
                <span class="material-symbols-outlined text-xs">close</span>
              </button>
            </span>

            <span 
              v-for="f in selectedFamilies" 
              :key="f" 
              class="inline-flex items-center gap-1.5 bg-neutral-100 text-xs font-sans font-medium px-3 py-1 rounded-full border border-neutral-200"
            >
              {{ f }}
              <button @click="selectedFamilies = selectedFamilies.filter(x => x !== f)" class="hover:text-rose-600 flex items-center cursor-pointer" aria-label="Quitar filtro">
                <span class="material-symbols-outlined text-xs">close</span>
              </button>
            </span>

            <span 
              v-for="b in selectedBrands" 
              :key="b" 
              class="inline-flex items-center gap-1.5 bg-neutral-100 text-xs font-sans font-medium px-3 py-1 rounded-full border border-neutral-200"
            >
              {{ b }}
              <button @click="selectedBrands = selectedBrands.filter(x => x !== b)" class="hover:text-rose-600 flex items-center cursor-pointer" aria-label="Quitar filtro">
                <span class="material-symbols-outlined text-xs">close</span>
              </button>
            </span>

            <button 
              @click="clearAllFilters"
              class="text-xs font-sans font-semibold text-rose-600 hover:underline ml-auto"
            >
              Borrar todo
            </button>
          </div>

          <!-- Product Grid with Fluid FLIP Reorganization Animation -->
          <TransitionGroup 
            v-if="filteredProducts.length > 0" 
            name="product-grid" 
            tag="div" 
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <ProductCard 
              v-for="product in filteredProducts" 
              :key="product.id" 
              :product="product" 
            />
          </TransitionGroup>

          <!-- Empty State -->
          <div v-else class="bg-surface border border-outline-variant rounded-2xl p-16 text-center shadow-xs">
            <span class="material-symbols-outlined text-6xl text-outline mb-4">search_off</span>
            <h3 class="font-serif text-2xl text-primary mb-2">No encontramos fragancias con esos filtros</h3>
            <p class="font-sans text-sm text-secondary max-w-md mx-auto mb-8 leading-relaxed">
              Intentá seleccionando otra familia olfativa, ampliando el rango de precio o eliminando los filtros activos.
            </p>
            <button 
              @click="clearAllFilters"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-inverse-surface transition-all shadow-xs hover:shadow-md"
            >
              Restablecer Filtros
            </button>
          </div>

        </main>

      </div>
    </div>

    <!-- MOBILE FILTERS MODAL WITH SMOOTH TRANSITIONS -->
    <Teleport to="body">
      <Transition name="fade-backdrop">
        <div 
          v-if="isMobileFiltersOpen"
          class="fixed inset-0 z-50 bg-primary/50 backdrop-blur-xs flex justify-end"
          @click.self="isMobileFiltersOpen = false"
        >
          <Transition name="slide-drawer">
            <div 
              v-if="isMobileFiltersOpen"
              class="w-full max-w-xs bg-surface h-full p-6 overflow-y-auto flex flex-col justify-between border-l border-outline-variant shadow-2xl"
            >
              <div>
                <div class="flex justify-between items-center border-b border-outline-variant pb-4 mb-6">
                  <h3 class="font-sans text-xl text-primary font-medium">Filtrar Colección</h3>
                  <button @click="isMobileFiltersOpen = false" class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>

                <!-- Quick Filters in Mobile -->
                <div class="space-y-6">

                  <div>
                    <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Género</h4>
                    <div class="space-y-2 font-sans text-sm text-secondary">
                      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="woman" v-model="selectedGenders" class="accent-primary rounded-xs" /> Mujer</label>
                      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="man" v-model="selectedGenders" class="accent-primary rounded-xs" /> Hombre</label>
                      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="unisex" v-model="selectedGenders" class="accent-primary rounded-xs" /> Unisex</label>
                    </div>
                  </div>

                  <div>
                    <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Categoría</h4>
                    <div class="space-y-2 font-sans text-sm text-secondary">
                      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="disenador" v-model="selectedCategories" class="accent-primary rounded-xs" /> Diseñador</label>
                      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="arabe" v-model="selectedCategories" class="accent-primary rounded-xs" /> Perfumes Árabes</label>
                      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" value="nicho" v-model="selectedCategories" class="accent-primary rounded-xs" /> Perfumería de Nicho</label>
                    </div>
                  </div>

                  <div>
                    <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold mb-3">Familia Olfativa</h4>
                    <div class="space-y-2 font-sans text-sm text-secondary">
                      <label v-for="f in olfactiveFamilies" :key="f.name" class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" :value="f.name" v-model="selectedFamilies" class="accent-primary rounded-xs" /> {{ f.name }}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-6 border-t border-outline-variant space-y-3">
                <button 
                  @click="isMobileFiltersOpen = false"
                  class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 rounded-full text-center shadow-xs hover:shadow-md transition-all active:scale-95"
                >
                  Aplicar Filtros ({{ filteredProducts.length }})
                </button>
                <button 
                  @click="clearAllFilters(); isMobileFiltersOpen = false"
                  class="w-full bg-transparent text-secondary font-label text-xs uppercase tracking-widest py-2 text-center underline hover:text-primary transition-colors"
                >
                  Limpiar todo
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
