<script setup>
import { ref, computed, watch } from 'vue'
import { useProductStore } from '@/stores/products'
import { useToastStore } from '@/stores/toast'
import { normalizeCategory } from '@/utils/normalize'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  brands: {
    type: Array,
    default: () => []
  },
  products: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'updated'])

const productStore = useProductStore()
const toastStore = useToastStore()

const selectedBrand = ref('all')
const selectedCategory = ref('all')
const adjustmentMode = ref('percentage_increase') // 'percentage_increase', 'percentage_decrease', 'fixed_increase', 'fixed_decrease'
const adjustmentValue = ref(15)
const roundOption = ref('hundred') // 'none', 'hundred', 'thousand'
const updateSizes = ref(true)
const isSubmitting = ref(false)

watch(() => props.isOpen, (open) => {
  if (open) {
    selectedBrand.value = 'all'
    selectedCategory.value = 'all'
    adjustmentMode.value = 'percentage_increase'
    adjustmentValue.value = 15
    roundOption.value = 'hundred'
    updateSizes.value = true
  }
})

const setShortcut = (val, mode = 'percentage_increase') => {
  adjustmentMode.value = mode
  adjustmentValue.value = val
}

const computedEffectiveValue = computed(() => {
  const val = Math.abs(Number(adjustmentValue.value) || 0)
  if (adjustmentMode.value.includes('decrease')) {
    return -val
  }
  return val
})

const computedAdjustmentType = computed(() => {
  return adjustmentMode.value.startsWith('percentage') ? 'percentage' : 'fixed'
})

const calculateNewPrice = (oldVal) => {
  if (!oldVal || isNaN(oldVal) || oldVal <= 0) return oldVal
  let res = Number(oldVal)
  const val = computedEffectiveValue.value

  if (computedAdjustmentType.value === 'percentage') {
    res = res * (1 + (val / 100))
  } else {
    res = res + val
  }
  res = Math.max(0, res)

  if (roundOption.value === 'hundred') {
    res = Math.round(res / 100) * 100
  } else if (roundOption.value === 'thousand') {
    res = Math.round(res / 1000) * 1000
  } else {
    res = Math.round(res)
  }
  return res
}

// Matching products for live preview
const targetProducts = computed(() => {
  let list = props.products || []

  if (selectedBrand.value !== 'all') {
    const bLower = selectedBrand.value.toLowerCase().trim()
    list = list.filter(p => p.brand && p.brand.toLowerCase().trim() === bLower)
  }

  if (selectedCategory.value !== 'all') {
    const cNorm = normalizeCategory(selectedCategory.value)
    list = list.filter(p => normalizeCategory(p.category) === cNorm)
  }

  return list
})

const previewSamples = computed(() => {
  return targetProducts.value.slice(0, 5).map(p => {
    const currentPrice = Number(p.price) || 0
    const newPrice = calculateNewPrice(currentPrice)
    const currentTransfer = p.transferPrice !== undefined && p.transferPrice !== null
      ? Number(p.transferPrice)
      : Math.round(currentPrice * 0.8)
    const newTransfer = calculateNewPrice(currentTransfer)

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      currentPrice,
      newPrice,
      diff: newPrice - currentPrice,
      currentTransfer,
      newTransfer
    }
  })
})

const handleConfirmBulkUpdate = async () => {
  if (targetProducts.value.length === 0) {
    toastStore.show('No hay perfumes que coincidan con los filtros seleccionados', 'warning')
    return
  }

  if (!adjustmentValue.value || Number(adjustmentValue.value) === 0) {
    toastStore.show('Por favor ingresá un valor de ajuste mayor a 0', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      brand: selectedBrand.value,
      category: selectedCategory.value,
      adjustmentType: computedAdjustmentType.value,
      value: computedEffectiveValue.value,
      roundTo: roundOption.value,
      updateSizes: updateSizes.value
    }

    const res = await productStore.bulkUpdatePrices(payload)
    if (res.success) {
      toastStore.show(res.message || `Precios actualizados para ${res.count} perfumes`, 'success')
      emit('updated')
      emit('close')
    } else {
      toastStore.show(res.error || 'Error al procesar el ajuste masivo', 'error')
    }
  } catch (err) {
    toastStore.show(err.message || 'Error al actualizar precios', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)] p-5 sm:p-7 space-y-6">
          
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-outline-variant pb-4">
            <div>
              <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-1">
                Gestión de Listas y Rentabilidad
              </span>
              <h3 class="font-serif text-2xl text-primary font-bold">
                Ajuste Masivo de Precios en Lote
              </h3>
              <p class="font-sans text-xs text-secondary mt-1">
                Aplicá aumentos o descuentos por marca o categoría en 1 clic.
              </p>
            </div>
            <button 
              @click="emit('close')" 
              class="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-all cursor-pointer"
            >
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- Configuration Fields -->
          <div class="space-y-4">
            
            <!-- Filter Targets: Brand & Category -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-wider text-primary font-bold mb-1.5">
                  Marca de Perfumes
                </label>
                <select 
                  v-model="selectedBrand" 
                  class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface"
                >
                  <option value="all">Todas las marcas (Catálogo completo)</option>
                  <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-wider text-primary font-bold mb-1.5">
                  Categoría
                </label>
                <select 
                  v-model="selectedCategory" 
                  class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="arabe">Perfumería Árabe</option>
                  <option value="disenador">Perfumes de Diseñador</option>
                  <option value="nicho">Perfumería Nicho</option>
                </select>
              </div>
            </div>

            <!-- Adjustment Type and Value -->
            <div class="bg-surface-container/50 border border-outline-variant rounded-xl p-4 space-y-3">
              <label class="block font-label text-xs uppercase tracking-wider text-primary font-bold">
                Tipo de Modificación
              </label>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button 
                  type="button"
                  @click="adjustmentMode = 'percentage_increase'"
                  class="p-2.5 rounded-xl border text-xs font-label uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  :class="adjustmentMode === 'percentage_increase' 
                    ? 'bg-primary text-on-primary font-bold shadow-xs border-primary' 
                    : 'bg-surface border-outline-variant/80 text-secondary hover:text-primary'"
                >
                  <span class="material-symbols-outlined text-sm">trending_up</span>
                  <span>Aumento %</span>
                </button>

                <button 
                  type="button"
                  @click="adjustmentMode = 'percentage_decrease'"
                  class="p-2.5 rounded-xl border text-xs font-label uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  :class="adjustmentMode === 'percentage_decrease' 
                    ? 'bg-primary text-on-primary font-bold shadow-xs border-primary' 
                    : 'bg-surface border-outline-variant/80 text-secondary hover:text-primary'"
                >
                  <span class="material-symbols-outlined text-sm">trending_down</span>
                  <span>Descuento %</span>
                </button>

                <button 
                  type="button"
                  @click="adjustmentMode = 'fixed_increase'"
                  class="p-2.5 rounded-xl border text-xs font-label uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  :class="adjustmentMode === 'fixed_increase' 
                    ? 'bg-primary text-on-primary font-bold shadow-xs border-primary' 
                    : 'bg-surface border-outline-variant/80 text-secondary hover:text-primary'"
                >
                  <span class="material-symbols-outlined text-sm">add_circle</span>
                  <span>Monto Fijo +$</span>
                </button>

                <button 
                  type="button"
                  @click="adjustmentMode = 'fixed_decrease'"
                  class="p-2.5 rounded-xl border text-xs font-label uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  :class="adjustmentMode === 'fixed_decrease' 
                    ? 'bg-primary text-on-primary font-bold shadow-xs border-primary' 
                    : 'bg-surface border-outline-variant/80 text-secondary hover:text-primary'"
                >
                  <span class="material-symbols-outlined text-sm">remove_circle</span>
                  <span>Monto Fijo -$</span>
                </button>
              </div>

              <!-- Input and Quick Shortcuts -->
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <div class="relative w-full sm:w-44">
                  <span class="absolute left-3.5 top-3 text-xs text-secondary font-bold">
                    {{ computedAdjustmentType === 'percentage' ? '%' : '$' }}
                  </span>
                  <input 
                    v-model.number="adjustmentValue" 
                    type="number" 
                    min="1" 
                    step="1"
                    placeholder="15" 
                    class="w-full bg-surface border-2 border-primary/40 focus:border-primary rounded-xl pl-8 pr-3 py-2.5 text-sm font-sans font-bold text-primary focus:outline-none"
                  />
                </div>

                <!-- Shortcuts if percentage -->
                <div v-if="computedAdjustmentType === 'percentage'" class="flex items-center gap-1.5 flex-wrap">
                  <button 
                    v-for="pct in [5, 10, 15, 20, 25]" 
                    :key="pct"
                    type="button"
                    @click="setShortcut(pct, adjustmentMode)"
                    class="px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface text-secondary hover:text-primary hover:border-primary text-xs font-mono font-medium transition-all cursor-pointer"
                  >
                    {{ adjustmentMode.includes('increase') ? '+' : '-' }}{{ pct }}%
                  </button>
                </div>
              </div>
            </div>

            <!-- Options: Rounding and Decants -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-wider text-primary font-bold mb-1.5">
                  Criterio de Redondeo
                </label>
                <select 
                  v-model="roundOption" 
                  class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface"
                >
                  <option value="hundred">Redondear a la centena ($100) — Recomendado</option>
                  <option value="thousand">Redondear al mil ($1.000)</option>
                  <option value="none">Sin redondeo (cifras exactas)</option>
                </select>
              </div>

              <div class="flex items-center pt-2 sm:pt-6">
                <label class="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="updateSizes" 
                    class="w-4 h-4 rounded text-primary border-outline-variant focus:ring-primary cursor-pointer"
                  />
                  <span class="text-xs text-primary font-medium">
                    Ajustar también medidas de decants proporcionalmente
                  </span>
                </label>
              </div>
            </div>

          </div>

          <!-- Live Preview Box -->
          <div class="border border-outline-variant rounded-xl overflow-hidden bg-surface">
            <div class="bg-surface-container/70 px-4 py-3 border-b border-outline-variant flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-primary">visibility</span>
                <span class="font-serif text-sm font-bold text-primary">Vista Previa de Impacto</span>
              </div>
              <span class="font-label text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                {{ targetProducts.length }} perfumes alcanzados
              </span>
            </div>

            <div v-if="targetProducts.length === 0" class="p-6 text-center text-xs text-secondary">
              No hay perfumes que coincidan con la marca o categoría seleccionada.
            </div>

            <div v-else class="divide-y divide-outline-variant/60 max-h-48 overflow-y-auto">
              <div 
                v-for="item in previewSamples" 
                :key="item.id" 
                class="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-surface-container/30 transition-colors"
              >
                <div>
                  <span class="font-medium text-primary block truncate max-w-xs">{{ item.brand }} — {{ item.name }}</span>
                  <span class="text-[10px] text-secondary">Transf: ${{ item.currentTransfer.toLocaleString('es-AR') }} → ${{ item.newTransfer.toLocaleString('es-AR') }}</span>
                </div>

                <div class="text-right">
                  <div class="flex items-center gap-2">
                    <span class="line-through text-secondary text-[11px]">${{ item.currentPrice.toLocaleString('es-AR') }}</span>
                    <span class="material-symbols-outlined text-xs text-secondary">arrow_forward</span>
                    <span class="font-bold text-primary">${{ item.newPrice.toLocaleString('es-AR') }}</span>
                  </div>
                  <span 
                    class="text-[10px] font-mono font-bold block"
                    :class="item.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'"
                  >
                    {{ item.diff >= 0 ? '+' : '' }}${{ item.diff.toLocaleString('es-AR') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="flex items-center justify-between pt-2 border-t border-outline-variant">
            <button 
              type="button" 
              @click="emit('close')"
              class="px-5 py-2.5 text-xs font-label uppercase tracking-wider border border-outline-variant rounded-xl text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button 
              type="button" 
              @click="handleConfirmBulkUpdate"
              :disabled="isSubmitting || targetProducts.length === 0"
              class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <span class="material-symbols-outlined text-sm">{{ isSubmitting ? 'hourglass_top' : 'price_change' }}</span>
              <span>{{ isSubmitting ? 'Actualizando catálogo...' : `Aplicar a ${targetProducts.length} Perfumes` }}</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.admin-modal-enter-active,
.admin-modal-leave-active {
  transition: opacity 0.25s ease;
}

.admin-modal-enter-from,
.admin-modal-leave-to {
  opacity: 0;
}
</style>
