<script setup>
import { ref, computed } from 'vue'
import { useProductStore } from '@/stores/products'
import { useToastStore } from '@/stores/toast'
import ProductWizardModal from '@/components/admin/ProductWizardModal.vue'
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal.vue'
import CsvImportModal from '@/components/admin/CsvImportModal.vue'
import { normalizeGender, normalizeCategory } from '@/utils/normalize'

const productStore = useProductStore()
const toastStore = useToastStore()

// Filter State
const searchQuery = ref('')
const filterGender = ref('all')
const filterCategory = ref('all')

// Modals State
const isWizardModalOpen = ref(false)
const selectedProductForEdit = ref(null)

const isCsvModalOpen = ref(false)

const isDeleteModalOpen = ref(false)
const productToDelete = ref(null)
const isDeleting = ref(false)

const handleCsvImported = async () => {
  await productStore.fetchProducts()
  await productStore.fetchStats()
}

// Filtered Products
const filteredProducts = computed(() => {
  return productStore.items.filter(p => {
    if (filterGender.value !== 'all' && normalizeGender(p.gender) !== normalizeGender(filterGender.value)) return false
    if (filterCategory.value !== 'all' && normalizeCategory(p.category) !== normalizeCategory(filterCategory.value)) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      return (
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      )
    }
    return true
  })
})

const openCreateModal = () => {
  selectedProductForEdit.value = null
  isWizardModalOpen.value = true
}

const openEditModal = (product) => {
  selectedProductForEdit.value = product
  isWizardModalOpen.value = true
}

const confirmDeleteProduct = (product) => {
  productToDelete.value = product
  isDeleteModalOpen.value = true
}

const handleDeleteProduct = async () => {
  if (!productToDelete.value) return
  isDeleting.value = true
  const success = await productStore.deleteProduct(productToDelete.value.id)
  isDeleting.value = false
  isDeleteModalOpen.value = false
  if (success) {
    toastStore.show('Perfume eliminado del catálogo', 'info')
    await productStore.fetchProducts()
  } else {
    toastStore.show('Error al eliminar perfume', 'error')
  }
  productToDelete.value = null
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-300">
    
    <!-- Header Actions for Products -->
    <div class="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-[0_4px_18px_-4px_rgba(46,25,17,0.04)]">
      <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-grow">
        <div class="relative w-full sm:w-auto sm:min-w-[260px] flex-grow">
          <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-base">search</span>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar perfume o marca..."
            class="w-full bg-surface-container/70 border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-xs font-sans text-primary placeholder:text-secondary/70 focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <select 
            v-model="filterGender"
            class="w-full sm:w-auto bg-surface-container/70 border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-sans text-primary focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs cursor-pointer"
          >
            <option value="all">Todos los Géneros</option>
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
            <option value="unisex">Unisex</option>
          </select>

          <select 
            v-model="filterCategory"
            class="w-full sm:w-auto bg-surface-container/70 border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-sans text-primary focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs cursor-pointer"
          >
            <option value="all">Todas las Categorías</option>
            <option value="disenador">Diseñador</option>
            <option value="nicho">Nicho</option>
            <option value="arabe">Árabe</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <button 
          @click="isCsvModalOpen = true"
          class="flex-1 sm:flex-initial bg-surface hover:bg-surface-container text-primary font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs border border-outline-variant hover:border-primary active:scale-95 cursor-pointer"
          title="Importar catálogo masivo desde Excel o archivo CSV"
        >
          <span class="material-symbols-outlined text-base text-primary">upload_file</span>
          <span>Importar CSV</span>
        </button>

        <button 
          @click="openCreateModal"
          class="flex-1 sm:flex-initial bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-95 border border-primary/20 flex-shrink-0 cursor-pointer"
        >
          <span class="material-symbols-outlined text-base">add</span>
          <span>+ Nuevo Perfume</span>
        </button>
      </div>
    </div>

    <!-- Mobile Product Cards View (< md) -->
    <div class="md:hidden space-y-3">
      <div v-if="filteredProducts.length === 0" class="bg-surface border border-outline-variant rounded-2xl p-8 text-center text-secondary text-xs">
        No se encontraron perfumes en el catálogo con los filtros seleccionados.
      </div>

      <div 
        v-for="p in filteredProducts" 
        :key="p.id"
        class="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm space-y-3"
      >
        <!-- Top row: Image, Name, Brand, Size, Stock -->
        <div class="flex items-start gap-3">
          <img 
            :src="p.images?.[0] || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=400&q=80'" 
            :alt="p.name"
            class="w-14 h-16 object-cover rounded-xl border border-outline-variant flex-shrink-0 bg-surface-container shadow-2xs"
          />
          <div class="flex-grow min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[10px] font-label uppercase tracking-wider text-secondary truncate">{{ p.brand }}</span>
              <span class="bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant text-[10px] font-mono font-bold text-primary flex-shrink-0">
                {{ p.stock ?? 10 }} un.
              </span>
            </div>
            <h4 class="font-serif font-bold text-primary text-sm line-clamp-1 mt-0.5">{{ p.name }}</h4>
            <p class="text-[11px] text-secondary capitalize mt-0.5">{{ p.sizes?.[0]?.size || '100 ml' }} • {{ p.category }} • {{ p.concentration }}</p>
          </div>
        </div>

        <!-- Middle row: Prices & Cost Grid -->
        <div class="grid grid-cols-2 gap-2 bg-surface-container/50 p-2.5 rounded-xl border border-outline-variant/60 text-xs">
          <div>
            <span class="text-[9px] uppercase font-label tracking-wider text-emerald-850 font-bold block">Precio Transferencia</span>
            <span class="font-bold text-sm text-emerald-850">
              ${{ (p.transferPrice || Math.round((p.price || 0) * 0.8)).toLocaleString('es-AR') }}
            </span>
          </div>
          <div>
            <span class="text-[9px] uppercase font-label tracking-wider text-secondary font-semibold block">Precio Lista (Tarjetas)</span>
            <span class="text-xs text-secondary font-medium">
              ${{ (p.price || 0).toLocaleString('es-AR') }}
            </span>
          </div>
          <div class="pt-1.5 border-t border-outline-variant/40">
            <span class="text-[9px] uppercase font-label tracking-wider text-secondary block">Costo Reposición</span>
            <span class="text-xs text-secondary font-medium">
              ${{ (p.costPrice || Math.round((p.transferPrice || p.price || 0) * 0.45)).toLocaleString('es-AR') }}
            </span>
          </div>
          <div class="pt-1.5 border-t border-outline-variant/40">
            <span class="text-[9px] uppercase font-label tracking-wider text-emerald-800 font-bold block">Ganancia en Mano</span>
            <span class="font-bold text-xs text-emerald-800 flex items-center gap-1">
              +${{ (p.profit || Math.max(0, (p.transferPrice || Math.round((p.price || 0) * 0.8)) - (p.costPrice || Math.round((p.transferPrice || p.price || 0) * 0.45)))).toLocaleString('es-AR') }}
              <span class="text-[9px] font-normal text-emerald-850 bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                {{ p.profitMargin || Math.round((((p.transferPrice || Math.round((p.price || 0) * 0.8)) - (p.costPrice || 0)) / Math.max(1, (p.transferPrice || Math.round((p.price || 0) * 0.8)))) * 100) }}%
              </span>
            </span>
          </div>
        </div>

        <!-- Bottom row: Actions -->
        <div class="flex items-center gap-2 pt-1">
          <button 
            @click="openEditModal(p)"
            class="flex-1 py-2 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-xl text-primary font-label text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95"
          >
            <span class="material-symbols-outlined text-sm">edit</span>
            <span>Editar</span>
          </button>
          <button 
            @click="confirmDeleteProduct(p)"
            class="py-2 px-3 text-secondary hover:text-rose-700 bg-surface-container/60 hover:bg-rose-50 border border-outline-variant hover:border-rose-200 rounded-xl font-label text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-2xs active:scale-95"
            title="Eliminar perfume"
          >
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Desktop Products Table with Cost and Profit (>= md) -->
    <div class="hidden md:block bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-[0_8px_30px_-10px_rgba(46,25,17,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-sans">
          <thead class="bg-surface-container-high/80 border-b border-outline-variant text-[11px] font-label uppercase tracking-widest text-secondary font-bold">
            <tr>
              <th class="py-4 px-5">Fragancia</th>
              <th class="py-4 px-5">Marca & Tipo</th>
              <th class="py-4 px-5">Precios (Transf. / Lista)</th>
              <th class="py-4 px-5">Precio Costo</th>
              <th class="py-4 px-5">Ganancia Neta en Mano</th>
              <th class="py-4 px-5">Stock</th>
              <th class="py-4 px-5 text-right">Acciones</th>
            </tr>
          </thead>
          
          <tbody v-if="filteredProducts.length === 0">
            <tr>
              <td colspan="7" class="text-center py-14 text-secondary">
                No se encontraron perfumes en el catálogo con los filtros seleccionados.
              </td>
            </tr>
          </tbody>

          <TransitionGroup 
            v-else
            name="admin-row" 
            tag="tbody" 
            class="divide-y divide-outline-variant/60 relative"
          >
            <tr 
              v-for="p in filteredProducts" 
              :key="p.id"
              class="hover:bg-surface-container/40 transition-colors duration-150"
            >
              <td class="py-4 px-5 flex items-center gap-3.5">
                <img 
                  :src="p.images?.[0] || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=400&q=80'" 
                  :alt="p.name"
                  class="w-12 h-14 object-cover rounded-lg border border-outline-variant flex-shrink-0 bg-surface-container shadow-2xs"
                />
                <div>
                  <p class="font-medium text-primary text-sm">{{ p.name }}</p>
                  <p class="text-[11px] text-secondary mt-0.5">{{ p.sizes?.[0]?.size || '100 ml' }}</p>
                </div>
              </td>

              <td class="py-4 px-5">
                <span class="font-medium text-primary block text-sm">{{ p.brand }}</span>
                <span class="text-[11px] text-secondary capitalize mt-0.5 block">{{ p.category }} • {{ p.concentration }}</span>
              </td>

              <td class="py-4 px-5">
                <div class="space-y-0.5">
                  <span class="font-bold text-sm text-emerald-850 flex items-center gap-1.5">
                    <span class="text-[9px] uppercase font-label tracking-wider bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded-xs font-bold">Transf.</span>
                    ${{ (p.transferPrice || Math.round((p.price || 0) * 0.8)).toLocaleString('es-AR') }}
                  </span>
                  <span class="text-xs text-secondary flex items-center gap-1.5">
                    <span class="text-[9px] uppercase font-label tracking-wider bg-surface-container-high text-secondary px-1.5 py-0.5 rounded-xs font-semibold">Lista</span>
                    ${{ (p.price || 0).toLocaleString('es-AR') }}
                  </span>
                </div>
              </td>

              <td class="py-4 px-5 text-secondary font-medium">
                ${{ (p.costPrice || Math.round((p.transferPrice || p.price || 0) * 0.45)).toLocaleString('es-AR') }}
              </td>

              <td class="py-4 px-5">
                <span class="font-bold text-emerald-800 block text-sm">
                  +${{ (p.profit || Math.max(0, (p.transferPrice || Math.round((p.price || 0) * 0.8)) - (p.costPrice || Math.round((p.transferPrice || p.price || 0) * 0.45)))).toLocaleString('es-AR') }}
                </span>
                <span class="text-[10px] text-emerald-850 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-block mt-1 shadow-2xs">
                  {{ p.profitMargin || Math.round((((p.transferPrice || Math.round((p.price || 0) * 0.8)) - (p.costPrice || 0)) / Math.max(1, (p.transferPrice || Math.round((p.price || 0) * 0.8)))) * 100) }}% Margen
                </span>
              </td>

              <td class="py-4 px-5">
                <span class="bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant text-xs font-mono font-bold text-primary shadow-2xs">
                  {{ p.stock ?? 10 }} un.
                </span>
              </td>

              <td class="py-4 px-5 text-right space-x-1.5">
                <button 
                  @click="openEditModal(p)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-primary rounded-lg border border-outline-variant/60 hover:border-primary hover:bg-surface-container transition-all shadow-2xs"
                  title="Editar Perfume"
                >
                  <span class="material-symbols-outlined text-base">edit</span>
                </button>
                <button 
                  @click="confirmDeleteProduct(p)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-rose-700 rounded-lg border border-outline-variant/60 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs"
                  title="Eliminar Perfume"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </div>

    <!-- Wizard Modal for Create / Edit Product -->
    <ProductWizardModal 
      :is-open="isWizardModalOpen"
      :product="selectedProductForEdit"
      @close="isWizardModalOpen = false"
      @saved="productStore.fetchProducts()"
    />

    <!-- Delete Confirm Modal -->
    <DeleteConfirmModal 
      :is-open="isDeleteModalOpen"
      :title="`¿Eliminar ${productToDelete?.name}?`"
      message="Esta acción no se puede deshacer y el perfume se dará de baja del catálogo público de inmediato."
      :is-deleting="isDeleting"
      @close="isDeleteModalOpen = false"
      @confirm="handleDeleteProduct"
    />

    <!-- CSV Bulk Importer Modal -->
    <CsvImportModal 
      :is-open="isCsvModalOpen"
      @close="isCsvModalOpen = false"
      @imported="handleCsvImported"
    />

  </div>
</template>
