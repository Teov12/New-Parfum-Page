<script setup>
import { ref, computed } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useToastStore } from '@/stores/toast'
import { THEME_PRESETS } from '@/utils/themePresets'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'completed'])

const tenantStore = useTenantStore()
const toastStore = useToastStore()

const currentStep = ref(1)
const isSaving = ref(false)

const availableIcons = [
  { id: 'spa', label: 'Loto / Spa', icon: 'spa' },
  { id: 'diamond', label: 'Diamante / Joya', icon: 'diamond' },
  { id: 'crown', label: 'Corona / Realeza', icon: 'crown' },
  { id: 'auto_awesome', label: 'Destello / Glow', icon: 'auto_awesome' },
  { id: 'local_florist', label: 'Flor / Esencia', icon: 'local_florist' },
  { id: 'flare', label: 'Luz / Radiante', icon: 'flare' },
  { id: 'star', label: 'Estrella / Niche', icon: 'star' },
  { id: 'verified', label: 'Garantía / Oficial', icon: 'verified' }
]

const form = ref({
  name: tenantStore.name || '',
  branding: {
    tagline: tenantStore.branding?.tagline || 'Alta Perfumería y Fragancias Exclusivas',
    storeIcon: tenantStore.branding?.storeIcon || 'spa',
    paletteId: tenantStore.branding?.paletteId || 'amber',
    primaryColor: tenantStore.branding?.primaryColor || '#2e1911',
    primaryContainer: tenantStore.branding?.primaryContainer || '#784233',
    surface: tenantStore.branding?.surface || '#fffdfa',
    whatsappNumber: tenantStore.branding?.whatsappNumber || '',
    instagram: tenantStore.branding?.instagram || '',
    onboardingCompleted: true
  },
  commercial: {
    alias: tenantStore.commercial?.alias || '',
    cbu: tenantStore.commercial?.cbu || '0000003100010000000000',
    bankName: tenantStore.commercial?.bankName || 'Mercado Pago',
    accountHolder: tenantStore.commercial?.accountHolder || '',
    cardFeeRate: tenantStore.commercial?.cardFeeRate ?? 28,
    freeShippingThreshold: tenantStore.commercial?.freeShippingThreshold ?? 250000,
    mpAccessToken: tenantStore.commercial?.mpAccessToken || '',
    mpPublicKey: tenantStore.commercial?.mpPublicKey || ''
  }
})

const selectPalette = (preset) => {
  form.value.branding.paletteId = preset.id
  form.value.branding.primaryColor = preset.primary
  form.value.branding.primaryContainer = preset.primaryContainer
  form.value.branding.surface = preset.surface
  tenantStore.previewTheme(preset)
}

const nextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const finishOnboarding = async () => {
  isSaving.value = true
  try {
    await tenantStore.updateSettings({
      name: form.value.name,
      branding: {
        ...tenantStore.branding,
        ...form.value.branding,
        onboardingCompleted: true
      },
      commercial: {
        ...tenantStore.commercial,
        ...form.value.commercial
      }
    })
    toastStore.show('¡Bienvenido! Tu tienda ha sido configurada con éxito.', 'success')
    emit('completed')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar la configuración inicial', 'error')
  } finally {
    isSaving.value = false
  }
}

const skipOnboarding = async () => {
  try {
    await tenantStore.updateSettings({
      branding: {
        ...tenantStore.branding,
        onboardingCompleted: true
      }
    })
  } catch (e) {
    // Ignorar error al omitir
  }
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
    <div class="relative w-full max-w-2xl bg-surface border border-outline-variant rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
      
      <!-- Encabezado con Progreso -->
      <div class="px-6 py-5 border-b border-outline-variant bg-surface-container/60 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Paso {{ currentStep }} de 4
            </span>
            <span class="text-xs text-secondary">Asistente de Bienvenida</span>
          </div>
          <h2 class="font-serif text-xl sm:text-2xl text-primary font-normal">
            <span v-if="currentStep === 1">1. Identidad de tu Perfumería</span>
            <span v-else-if="currentStep === 2">2. Paleta de Colores de Lujo</span>
            <span v-else-if="currentStep === 3">3. Medios de Cobro & Pagos</span>
            <span v-else-if="currentStep === 4">4. WhatsApp & Despachos</span>
          </h2>
        </div>
        <button 
          @click="skipOnboarding"
          type="button"
          class="text-xs text-secondary hover:text-primary transition-colors underline font-label uppercase tracking-wider"
        >
          Omitir
        </button>
      </div>

      <!-- Barra de Progreso Superior -->
      <div class="w-full bg-outline-variant/40 h-1">
        <div 
          class="bg-amber-700 h-1 transition-all duration-300 ease-out"
          :style="{ width: `${(currentStep / 4) * 100}%` }"
        ></div>
      </div>

      <!-- Cuerpo del Wizard -->
      <div class="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
        
        <!-- PASO 1: IDENTIDAD -->
        <div v-if="currentStep === 1" class="space-y-5 animate-fade-in">
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
              Nombre Comercial de la Perfumería
            </label>
            <input 
              v-model="form.name"
              type="text" 
              placeholder="Ej. Aromas de París, L'Aura Parfums, etc."
              class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
            />
            <p class="text-[11px] text-secondary mt-1">Este nombre se mostrará en el encabezado, footer, recibos de compra y meta-tags.</p>
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
              Eslogan o Frase Distintiva
            </label>
            <input 
              v-model="form.branding.tagline"
              type="text" 
              placeholder="Ej. Alta Perfumería y Fragancias Exclusivas"
              class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
            />
            <p class="text-[11px] text-secondary mt-1">Acompaña al logo en la vitrina de inicio.</p>
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-2">
              Ícono / Símbolo Representativo
            </label>
            <div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
              <button
                v-for="iconItem in availableIcons"
                :key="iconItem.id"
                type="button"
                @click="form.branding.storeIcon = iconItem.id"
                :class="form.branding.storeIcon === iconItem.id ? 'border-primary bg-amber-100/70 text-primary shadow-xs' : 'border-outline-variant bg-surface text-secondary hover:text-primary'"
                class="flex flex-col items-center justify-center p-3 rounded-xl border transition-all"
                :title="iconItem.label"
              >
                <span class="material-symbols-outlined text-2xl mb-1">{{ iconItem.icon }}</span>
                <span class="text-[9px] font-mono leading-none truncate max-w-full">{{ iconItem.icon }}</span>
              </button>
            </div>
            <p class="text-[11px] text-secondary mt-1.5">Puedes subir tu propio logo SVG o PNG luego desde la pestaña de Configuración.</p>
          </div>
        </div>

        <!-- PASO 2: PALETA DE COLORES -->
        <div v-if="currentStep === 2" class="space-y-4 animate-fade-in">
          <p class="text-xs text-secondary leading-relaxed">
            Selecciona la armonía cromática que mejor represente la personalidad de tu boutique. Podrás previsualizar los cambios en tiempo real.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              v-for="preset in THEME_PRESETS"
              :key="preset.id"
              @click="selectPalette(preset)"
              :class="form.branding.paletteId === preset.id ? 'border-primary ring-2 ring-amber-700/20 bg-surface-container' : 'border-outline-variant bg-surface hover:border-primary/60'"
              class="border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between shadow-2xs group"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-sans text-sm font-bold text-primary group-hover:text-amber-900 transition-colors">
                    {{ preset.name }}
                  </h3>
                  <span v-if="form.branding.paletteId === preset.id" class="w-2 h-2 rounded-full bg-emerald-600"></span>
                </div>
                <p class="text-[11px] text-secondary mb-3">{{ preset.subtitle }}</p>
              </div>

              <!-- Muestras de color -->
              <div class="flex items-center gap-1.5 pt-2 border-t border-outline-variant/60">
                <span 
                  v-for="(col, cIdx) in preset.previewColors" 
                  :key="cIdx" 
                  :style="{ backgroundColor: col }" 
                  class="w-6 h-6 rounded-full border border-black/10 shadow-2xs flex-shrink-0"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <!-- PASO 3: MEDIOS DE PAGO -->
        <div v-if="currentStep === 3" class="space-y-5 animate-fade-in">
          <p class="text-xs text-secondary leading-relaxed">
            Configura tus datos para recibir pagos por transferencia directa con descuento, y tus credenciales de Mercado Pago para cuotas sin interés.
          </p>

          <div class="bg-surface-container/50 border border-outline-variant rounded-xl p-4 space-y-4">
            <h4 class="font-sans text-xs uppercase font-bold tracking-wider text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-emerald-700">account_balance</span>
              <span>Datos Bancarios (Transferencia)</span>
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-label text-[11px] uppercase tracking-wider text-primary font-bold mb-1">Alias</label>
                <input 
                  v-model="form.commercial.alias"
                  type="text" 
                  placeholder="ej. MI.PERFUMERIA.MP"
                  class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-[11px] uppercase tracking-wider text-primary font-bold mb-1">CBU / CVU</label>
                <input 
                  v-model="form.commercial.cbu"
                  type="text" 
                  placeholder="ej. 0000003100010000000000"
                  class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-[11px] uppercase tracking-wider text-primary font-bold mb-1">Banco / Billetera</label>
                <input 
                  v-model="form.commercial.bankName"
                  type="text" 
                  placeholder="ej. Mercado Pago, Santander, Galicia"
                  class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-[11px] uppercase tracking-wider text-primary font-bold mb-1">Titular de la Cuenta</label>
                <input 
                  v-model="form.commercial.accountHolder"
                  type="text" 
                  placeholder="ej. Nombre o Razón Social"
                  class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div class="bg-surface-container/50 border border-outline-variant rounded-xl p-4 space-y-3">
            <h4 class="font-sans text-xs uppercase font-bold tracking-wider text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-sky-700">credit_card</span>
              <span>Mercado Pago (3 y 6 Cuotas Sin Interés)</span>
            </h4>

            <div>
              <label class="block font-label text-[11px] uppercase tracking-wider text-primary font-bold mb-1">Access Token de Producción</label>
              <input 
                v-model="form.commercial.mpAccessToken"
                type="password" 
                placeholder="APP_USR-..."
                class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono focus:border-primary focus:outline-none"
              />
              <p class="text-[10px] text-secondary mt-1">Opcional. Puedes completarlo más tarde en Configuración > Medios de Pago.</p>
            </div>
          </div>
        </div>

        <!-- PASO 4: CONTACTO & ENVÍOS -->
        <div v-if="currentStep === 4" class="space-y-5 animate-fade-in">
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
              Número de WhatsApp para Pedidos
            </label>
            <input 
              v-model="form.branding.whatsappNumber"
              type="text" 
              placeholder="5491122334455"
              class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
            />
            <p class="text-[11px] text-secondary mt-1">Formato internacional con código de país sin signo + ni espacios (ej. 549...).</p>
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
              Usuario de Instagram
            </label>
            <input 
              v-model="form.branding.instagram"
              type="text" 
              placeholder="@miperfumeria"
              class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
              Envío Gratis a partir de ($)
            </label>
            <input 
              v-model.number="form.commercial.freeShippingThreshold"
              type="number" 
              min="0"
              step="5000"
              placeholder="250000"
              class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
            />
            <p class="text-[11px] text-secondary mt-1">Superando este monto en el carrito, el envío con Andreani será 100% bonificado.</p>
          </div>
        </div>

      </div>

      <!-- Pie del Modal con Navegación -->
      <div class="px-6 py-4 border-t border-outline-variant bg-surface-container/60 flex items-center justify-between">
        <button
          v-if="currentStep > 1"
          type="button"
          @click="prevStep"
          class="px-4 py-2.5 bg-surface border border-outline-variant hover:border-primary text-secondary hover:text-primary font-label text-xs uppercase tracking-wider rounded-xl transition-all shadow-2xs"
        >
          Atrás
        </button>
        <div v-else></div>

        <div class="flex items-center gap-3">
          <button
            v-if="currentStep < 4"
            type="button"
            @click="nextStep"
            class="px-5 py-2.5 bg-primary text-on-primary font-label text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Siguiente</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </button>

          <button
            v-else
            type="button"
            @click="finishOnboarding"
            :disabled="isSaving"
            class="px-6 py-2.5 bg-emerald-700 text-white font-label text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-800 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <span v-if="isSaving" class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span class="material-symbols-outlined text-sm">check_circle</span>
            <span>{{ isSaving ? 'Guardando...' : 'Comenzar a Vender' }}</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
