<script setup>
import { ref, computed } from 'vue'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])
const tenantStore = useTenantStore()
const storeName = computed(() => tenantStore.storeName)

const activeGuideTab = ref('bottle')
const userBatchInput = ref('')

// Pre-fill or brand suggestion
const currentBrand = computed(() => props.product?.brand || 'Lattafa')
const currentProductName = computed(() => props.product?.name || 'Perfume')

// Known brand mapping for CheckFresh search URLs
const checkFreshBrandMap = {
  'afnan': 'afnan',
  'armaf': 'armaf',
  'lattafa': 'lattafa',
  'al haramain': 'al-haramain',
  'dior': 'christian-dior',
  'christian dior': 'christian-dior',
  'chanel': 'chanel',
  'yves saint laurent': 'yves-saint-laurent',
  'ysl': 'yves-saint-laurent',
  'tom ford': 'tom-ford',
  'versace': 'versace',
  'carolina herrera': 'carolina-herrera',
  'paco rabanne': 'paco-rabanne',
  'giorgio armani': 'giorgio-armani',
  'armani': 'giorgio-armani',
  'jean paul gaultier': 'jean-paul-gaultier',
  'creed': 'creed',
  'parfums de marly': 'parfums-de-marly',
  'byredo': 'byredo',
  'xerjoff': 'xerjoff',
  'montale': 'montale',
  'mancera': 'mancera',
  'swiss arabian': 'swiss-arabian'
}

const checkFreshUrl = computed(() => {
  const brandKey = currentBrand.value.toLowerCase().trim()
  const slug = checkFreshBrandMap[brandKey] || brandKey.replace(/\s+/g, '-')
  return `https://www.checkfresh.com/${slug}.html`
})

const checkCosmeticUrl = 'https://checkcosmetic.net/'

// Analysis of entered batch code
const batchAnalysis = computed(() => {
  const code = userBatchInput.value.trim()
  if (!code) return null
  const clean = code.replace(/[^a-zA-Z0-9]/g, '')
  if (clean.length < 3) {
    return {
      status: 'short',
      text: 'El código parece demasiado corto (suele tener entre 3 y 8 caracteres).'
    }
  }
  return {
    status: 'valid_format',
    text: `Formato alfanumérico estándar reconocido (${clean.toUpperCase()}). Listo para validar en base de datos oficial.`
  }
})

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-primary/60 backdrop-blur-sm overflow-y-auto"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <div 
          class="bg-surface border border-outline-variant rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header Banner -->
          <div class="relative bg-gradient-to-r from-primary to-primary-container text-on-primary p-5 sm:p-6 flex-shrink-0">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-surface/15 border border-surface/20 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-2xl text-amber-300">verified_user</span>
                </div>
                <div>
                  <div class="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2.5 py-0.5 rounded-full text-[10px] font-label uppercase tracking-widest font-bold mb-1">
                    <span>Sello de Originalidad Garantizada</span>
                  </div>
                  <h3 class="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                    Validador de Batch Code & Autenticidad
                  </h3>
                </div>
              </div>
              
              <button 
                @click="closeModal"
                class="w-9 h-9 rounded-full bg-surface/10 hover:bg-surface/20 flex items-center justify-center transition-colors text-on-primary flex-shrink-0"
                aria-label="Cerrar ventana"
              >
                <span class="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <p class="text-xs text-on-primary/80 mt-2 font-sans">
              Protección anti-falsificación para <strong>{{ currentProductName }}</strong> de <strong>{{ currentBrand }}</strong>. Transparencia total antes y después de tu compra.
            </p>
          </div>

          <!-- Body Content -->
          <div class="p-5 sm:p-6 overflow-y-auto space-y-6 text-primary">
            
            <!-- Fear #1 in Argentina: Counterfeits explanation banner -->
            <div class="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3 text-xs leading-relaxed text-amber-950">
              <span class="material-symbols-outlined text-amber-800 text-xl flex-shrink-0 mt-0.5">shield</span>
              <div>
                <strong class="font-bold block text-sm mb-1 text-amber-950">¿Por qué es importante el Batch Code?</strong>
                El <strong>Batch Code</strong> (código de lote) es la huella digital irrepetible grabada por el fabricante oficial al momento de formular la fragancia. Indica la fecha exacta de elaboración, partida de materias primas y legalidad del producto. En Argentina abundan las réplicas "AAA" o imitaciones: con este código podés certificar que tu frasco es <strong>100% original</strong>.
              </div>
            </div>

            <!-- Interactive Batch Code Checker -->
            <div class="bg-surface-container/60 border border-outline-variant rounded-xl p-4 sm:p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="font-label text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-base text-primary">search_check</span>
                  <span>Verificar Lote en Bases Mundiales</span>
                </span>
                <span class="text-[10px] font-label uppercase px-2 py-0.5 rounded-full bg-surface border border-outline-variant text-secondary">
                  Marca: {{ currentBrand }}
                </span>
              </div>

              <div>
                <label class="block text-xs font-sans text-secondary mb-1.5">
                  Ingresá el código alfanumérico que figura en tu frasco o caja (ej. 22W1001, 38W900, A23):
                </label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <div class="relative flex-grow">
                    <input 
                      v-model="userBatchInput"
                      type="text" 
                      placeholder="Ej: 22W1001 o A245"
                      class="w-full bg-surface border border-outline-variant uppercase font-mono font-bold text-sm tracking-widest rounded-xl px-4 py-2.5 text-primary placeholder:text-secondary/50 focus:border-primary focus:outline-none shadow-2xs"
                    />
                  </div>
                  <a 
                    :href="checkFreshUrl" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs flex-shrink-0"
                  >
                    <span>CheckFresh.com</span>
                    <span class="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                  <a 
                    :href="checkCosmeticUrl" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="bg-surface hover:bg-surface-container text-primary border border-outline-variant font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs flex-shrink-0"
                  >
                    <span>CheckCosmetic</span>
                    <span class="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </div>

                <!-- Analysis feedback -->
                <div v-if="batchAnalysis" class="mt-2 text-xs font-sans flex items-center gap-1.5" :class="batchAnalysis.status === 'valid_format' ? 'text-emerald-800' : 'text-amber-800'">
                  <span class="material-symbols-outlined text-sm">
                    {{ batchAnalysis.status === 'valid_format' ? 'check_circle' : 'info' }}
                  </span>
                  <span>{{ batchAnalysis.text }}</span>
                </div>
              </div>

              <p class="text-[11px] text-secondary italic">
                * CheckFresh y CheckCosmetic son los directorios mundiales independientes más grandes de autenticidad cosmética con soporte para casas como Dior, Chanel, Armaf, Afnan, Lattafa y más de 300 marcas.
              </p>
            </div>

            <!-- Visual Guide: Where to find the Batch Code -->
            <div class="space-y-3">
              <h4 class="font-serif text-base text-primary font-bold">
                ¿Dónde encontrar el código en tu perfume?
              </h4>

              <!-- Tabs Header -->
              <div class="flex gap-2 border-b border-outline-variant pb-2">
                <button 
                  @click="activeGuideTab = 'bottle'"
                  class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all"
                  :class="activeGuideTab === 'bottle' ? 'bg-primary text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
                >
                  1. En la Base del Frasco
                </button>
                <button 
                  @click="activeGuideTab = 'box'"
                  class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all"
                  :class="activeGuideTab === 'box' ? 'bg-primary text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
                >
                  2. En la Caja Exterior
                </button>
                <button 
                  @click="activeGuideTab = 'rule'"
                  class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all"
                  :class="activeGuideTab === 'rule' ? 'bg-primary text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
                >
                  3. La Regla de Oro
                </button>
              </div>

              <!-- Tab Content -->
              <div class="p-4 bg-surface-container-low rounded-xl border border-outline-variant text-xs space-y-2">
                <div v-if="activeGuideTab === 'bottle'" class="space-y-2">
                  <div class="flex items-center gap-2 text-primary font-bold">
                    <span class="material-symbols-outlined text-base text-amber-800">liquor</span>
                    <span>Grabado a Láser o Bajo Relieve en el Cristal</span>
                  </div>
                  <p class="text-secondary leading-relaxed">
                    Girando el frasco boca abajo, en el fondo de vidrio encontrarás una serie de números y letras grabadas directamente con láser o serigrafiadas en una placa metálica.
                  </p>
                  <p class="text-emerald-900 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs flex items-start gap-2">
                    <span class="material-symbols-outlined text-sm text-emerald-700 flex-shrink-0 mt-0.5">info</span>
                    <span><strong>Seña de originalidad:</strong> Los perfumes originales nunca tienen el código pegado en una cinta adhesiva común o impreso con tinta borrosa que se desprende con la uña.</span>
                  </p>
                </div>

                <div v-else-if="activeGuideTab === 'box'" class="space-y-2">
                  <div class="flex items-center gap-2 text-primary font-bold">
                    <span class="material-symbols-outlined text-base text-amber-800">inventory_2</span>
                    <span>En la Parte Inferior de la Caja de Cartón</span>
                  </div>
                  <p class="text-secondary leading-relaxed">
                    En la base exterior de la caja, usualmente cerca o debajo del código de barras (EAN), está troquelado en bajo relieve o impreso con tinta especial el mismo código de lote.
                  </p>
                  <p class="text-secondary leading-relaxed">
                    Las cajas originales cuentan con cartón rígido de alto gramaje, tipografía nítida y celofán termosellado sin arrugas ni pegamento derramado.
                  </p>
                </div>

                <div v-else-if="activeGuideTab === 'rule'" class="space-y-2">
                  <div class="flex items-center gap-2 text-primary font-bold">
                    <span class="material-symbols-outlined text-base text-amber-800">handshake</span>
                    <span>Coincidencia 100% Obligatoria (Frasco vs. Caja)</span>
                  </div>
                  <p class="text-secondary leading-relaxed">
                    El código alfanumérico del frasco <strong>debe ser exactamente igual</strong> al código estampado en la caja exterior. Si son distintos, el frasco no corresponde a su empaque original.
                  </p>
                  <p class="text-emerald-900 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs flex items-start gap-2">
                    <span class="material-symbols-outlined text-sm text-emerald-700 flex-shrink-0 mt-0.5">verified</span>
                    <span><strong>En {{ storeName }}:</strong> Cada unidad es inspeccionada visual y electrónicamente antes del despacho con Andreani para asegurar que los batch codes coincidan a la perfección.</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Guarantee Policy Badge Box -->
            <div class="border-t border-outline-variant pt-5">
              <h4 class="font-serif text-base text-primary font-bold mb-3">
                Compromiso de Autenticidad {{ storeName }}
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="p-3 bg-surface border border-outline-variant rounded-xl flex items-start gap-2.5">
                  <span class="material-symbols-outlined text-emerald-800 text-lg flex-shrink-0">verified</span>
                  <div>
                    <strong class="font-bold block text-primary">Importación Oficial Directa</strong>
                    <span class="text-secondary text-[11px]">Partidas legales ingresadas bajo normas de aduana con factura formal.</span>
                  </div>
                </div>

                <div class="p-3 bg-surface border border-outline-variant rounded-xl flex items-start gap-2.5">
                  <span class="material-symbols-outlined text-emerald-800 text-lg flex-shrink-0">currency_exchange</span>
                  <div>
                    <strong class="font-bold block text-primary">Garantía de Devolución 100%</strong>
                    <span class="text-secondary text-[11px]">Si comprobás que tu frasco no es original, te reembolsamos el 100% al instante.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="p-4 sm:p-5 bg-surface-container/70 border-t border-outline-variant flex justify-end flex-shrink-0">
            <button 
              @click="closeModal"
              class="w-full sm:w-auto bg-primary text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-full hover:bg-primary-container transition-all shadow-xs"
            >
              Entendido, Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
