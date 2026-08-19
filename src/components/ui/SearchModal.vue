<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { products } from '@/data/products'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const router = useRouter()
const searchQuery = ref('')
const inputRef = ref(null)

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return products.slice(0, 4)
  const q = searchQuery.value.toLowerCase().trim()
  return products.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.fragranceFamily.toLowerCase().includes(q) ||
    p.olfactoryPyramid.topNotes.some(n => n.toLowerCase().includes(q)) ||
    p.olfactoryPyramid.heartNotes.some(n => n.toLowerCase().includes(q)) ||
    p.olfactoryPyramid.baseNotes.some(n => n.toLowerCase().includes(q))
  )
})

const popularSearches = ['YSL Libre', 'Dior Sauvage', 'Baccarat Rouge', 'Floral', 'Amaderada', 'Extrait de Parfum']

const selectProduct = (slug) => {
  emit('close')
  searchQuery.value = ''
  router.push(`/producto/${slug}`)
}

const applySearch = (term) => {
  searchQuery.value = term
}

const close = () => {
  emit('close')
  searchQuery.value = ''
}

const handleKeydown = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-primary/60 backdrop-blur-sm transition-opacity"
      @click.self="close"
    >
      <div class="bg-surface w-full max-w-2xl border border-outline rounded-xs shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <!-- Search Input Header: Píldora -->
        <div class="relative flex items-center bg-surface-container rounded-full px-4 py-3 border border-outline-variant focus-within:border-primary mb-6 transition-colors">
          <span class="material-symbols-outlined text-2xl text-primary mr-3">search</span>
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por fragancia, marca o notas (ej. Vainilla, Lavanda)..."
            class="w-full bg-transparent font-sans text-base text-primary placeholder:text-secondary focus:outline-none"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''"
            class="p-1 hover:text-primary text-secondary transition-colors mr-2"
          >
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
          <button 
            @click="close"
            class="text-xs font-label uppercase tracking-widest text-secondary hover:text-primary transition-colors bg-surface border border-outline-variant px-3 py-1 rounded-full"
          >
            ESC
          </button>
        </div>

        <!-- Quick Tags: Píldoras -->
        <div class="mb-6">
          <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2.5">Búsquedas Frecuentes:</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in popularSearches"
              :key="tag"
              @click="applySearch(tag)"
              class="text-xs font-label px-3.5 py-1 bg-surface-container hover:bg-secondary-container text-primary transition-colors border border-outline-variant rounded-full"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <!-- Results List -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <p class="font-label text-label-sm text-secondary uppercase tracking-widest">
              {{ searchQuery.trim() ? `Resultados (${filteredProducts.length})` : 'Fragancias Sugeridas' }}
            </p>
            <RouterLink 
              v-if="searchQuery.trim()" 
              :to="`/catalogo?q=${encodeURIComponent(searchQuery)}`"
              @click="close"
              class="text-xs font-label uppercase text-primary underline hover:text-primary-container"
            >
              Ver todos en catálogo
            </RouterLink>
          </div>

          <div v-if="filteredProducts.length > 0" class="divide-y divide-outline-variant max-h-80 overflow-y-auto pr-2">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              @click="selectProduct(product.slug)"
              class="flex items-center gap-4 py-3 hover:bg-surface-container px-3 rounded-xs cursor-pointer transition-colors group"
            >
              <img 
                :src="product.images[0]" 
                :alt="product.name"
                class="w-12 h-16 object-cover bg-surface-lowest rounded-xs border border-outline-variant flex-shrink-0"
              />
              <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-label text-label-sm text-secondary uppercase">{{ product.brand }}</span>
                  <span class="text-xs text-outline">•</span>
                  <span class="text-xs text-secondary">{{ product.fragranceFamily }}</span>
                </div>
                <h4 class="font-serif text-base text-primary font-medium truncate group-hover:text-primary-container transition-colors">
                  {{ product.name }}
                </h4>
                <p class="text-xs text-secondary truncate">
                  Notas: {{ product.olfactoryPyramid.topNotes.slice(0, 2).join(', ') }}
                </p>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="font-sans font-semibold text-primary text-sm">
                  ${{ product.price.toLocaleString('es-AR') }}
                </span>
                <p class="text-[10px] text-secondary uppercase tracking-wider">{{ product.concentration }}</p>
              </div>
            </div>
          </div>

          <div v-else class="py-12 text-center text-secondary">
            <span class="material-symbols-outlined text-4xl mb-2 text-outline">search_off</span>
            <p class="font-serif text-lg text-primary mb-1">No encontramos fragancias coincidentes</p>
            <p class="text-sm">Probá buscando con otro término o explorá nuestro catálogo completo.</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
