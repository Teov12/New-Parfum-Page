<script setup>
import { ref, computed } from 'vue'
import { useProductStore } from '@/stores/products'
import { useToastStore } from '@/stores/toast'
import ProductWizardModal from '@/components/admin/ProductWizardModal.vue'
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal.vue'

const productStore = useProductStore()
const toastStore = useToastStore()

// Filter State
const searchQuery = ref('')
const filterGender = ref('all')
const filterCategory = ref('all')

// Modals State
const isWizardModalOpen = ref(false)
const selectedProductForEdit = ref(null)

const isDeleteModalOpen = ref(false)
const productToDelete = ref(null)
const isDeleting = ref(false)

// Filtered Products
const filteredProducts = computed(() => {
  return productStore.items.filter(p => {
    if (filterGender.value !== 'all' && p.gender !== filterGender.value) return false
    if (filterCategory.value !== 'all' && p.category !== filterCategory.value) return false
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
      <div class="flex flex-wrap items-center gap-3 flex-grow">
        <div class="relative min-w-[260px] flex-grow sm:flex-grow-0">
          <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-base">search</span>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar perfume o marca..."
            class="w-full bg-surface-container/70 border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-xs font-sans text-primary placeholder:text-secondary/70 focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <select 
          v-model="filterGender"
          class="bg-surface-container/70 border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-sans text-primary focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs cursor-pointer"
        >
          <option value="all">Todos los Géneros</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
          <option value="unisex">Unisex</option>
        </select>

        <select 
          v-model="filterCategory"
          class="bg-surface-container/70 border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-sans text-primary focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs cursor-pointer"
        >
          <option value="all">Todas las Categorías</option>
          <option value="disenador">Diseñador</option>
          <option value="nicho">Nicho</option>
          <option value="arabe">Árabe</option>
        </select>
      </div>

      <button 
        @click="openCreateModal"
        class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-95 border border-primary/20 flex-shrink-0"
      >
        <span class="material-symbols-outlined text-base">add</span>
        <span>+ Nuevo Perfume</span>
      </button>
    </div>

    <!-- Products Table with Cost and Profit (Fluid Row FLIP Animation) -->
    <div class="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-[0_8px_30px_-10px_rgba(46,25,17,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-sans">
          <thead class="bg-surface-container-high/80 border-b border-outline-variant text-[11px] font-label uppercase tracking-widest text-secondary font-bold">
            <tr>
              <th class="py-4 px-5">Fragancia</th>
              <th class="py-4 px-5">Marca & Tipo</th>
              <th class="py-4 px-5">Precio Venta</th>
              <th class="py-4 px-5">Precio Costo</th>
              <th class="py-4 px-5">Ganancia Unitaria</th>
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

              <td class="py-4 px-5 font-bold text-sm text-primary">
                ${{ (p.price || 0).toLocaleString('es-AR') }}
              </td>

              <td class="py-4 px-5 text-secondary font-medium">
                ${{ (p.costPrice || Math.round((p.price || 0) * 0.45)).toLocaleString('es-AR') }}
              </td>

              <td class="py-4 px-5">
                <span class="font-bold text-emerald-800 block text-sm">
                  +${{ (p.profit || Math.max(0, (p.price || 0) - (p.costPrice || Math.round((p.price || 0) * 0.45)))).toLocaleString('es-AR') }}
                </span>
                <span class="text-[10px] text-emerald-850 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-block mt-1 shadow-2xs">
                  {{ p.profitMargin || 55 }}% Margen
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

  </div>
</template>
