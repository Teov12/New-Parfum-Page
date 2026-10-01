<script setup>
import { ref, watch, computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useStoreSettings, cardClass, inputClass, labelClass, primaryButtonClass } from '@/composables/useStoreSettings'

const toastStore = useToastStore()
const { settings, isLoading, isSaving, save } = useStoreSettings()

const marketing = ref({ metaPixelId: '', ga4Id: '', gtmId: '', googleSiteVerification: '' })
const automations = ref({ abandonedCartEmails: true, lowStockAlerts: true, lowStockThreshold: 2 })

watch(settings, (value) => {
  if (!value) return
  marketing.value = { ...marketing.value, ...(value.marketing || {}) }
  automations.value = { ...automations.value, ...(value.automations || {}) }
})

const feedUrl = computed(() => `${settings.value?.storeUrl || window.location.origin}/feeds/productos.xml`)

const copyFeed = async () => {
  try {
    await navigator.clipboard.writeText(feedUrl.value)
    toastStore.show('Link del feed copiado', 'info')
  } catch {
    toastStore.show('Copialo manualmente', 'error')
  }
}

const handleSave = () => save({ marketing: marketing.value, automations: automations.value }, 'Marketing y automatizaciones guardados')
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-6">
      <div>
        <h1 class="font-sans text-2xl sm:text-3xl text-primary">Marketing</h1>
        <p class="text-xs text-secondary mt-1">Medí tus campañas, publicá tu catálogo en Google e Instagram y recuperá ventas.</p>
      </div>
      <button type="button" @click="handleSave" :disabled="isSaving || isLoading" :class="primaryButtonClass">{{ isSaving ? 'Guardando...' : 'Guardar' }}</button>
    </div>

    <div :class="cardClass">
      <h2 class="font-bold text-primary flex items-center gap-2"><span class="material-symbols-outlined">ads_click</span>Píxeles y analítica</h2>
      <p class="text-xs text-secondary">Registramos visitas, productos vistos, agregados al carrito, inicio de compra y compras.</p>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="block"><span :class="labelClass">Meta Pixel ID</span><input v-model.trim="marketing.metaPixelId" placeholder="123456789012345" :class="inputClass" /></label>
        <label class="block"><span :class="labelClass">Google Analytics 4</span><input v-model.trim="marketing.ga4Id" placeholder="G-XXXXXXXXXX" :class="inputClass" /></label>
        <label class="block"><span :class="labelClass">Google Tag Manager</span><input v-model.trim="marketing.gtmId" placeholder="GTM-XXXXXXX" :class="inputClass" /></label>
        <label class="block"><span :class="labelClass">Verificación de Google Search Console</span><input v-model.trim="marketing.googleSiteVerification" placeholder="Código de la etiqueta meta" :class="inputClass" /></label>
      </div>
    </div>

    <div :class="cardClass">
      <h2 class="font-bold text-primary flex items-center gap-2"><span class="material-symbols-outlined">storefront</span>Catálogo para Google Shopping e Instagram</h2>
      <p class="text-xs text-secondary">Cargá este link en Google Merchant Center (feed programado) y en el Administrador de catálogos de Meta. Se actualiza solo con tus precios y stock.</p>
      <div class="flex gap-2">
        <input :value="feedUrl" readonly :class="inputClass" class="font-mono text-xs" />
        <button type="button" @click="copyFeed" class="px-4 rounded-xl border border-outline-variant hover:border-primary text-primary"><span class="material-symbols-outlined text-base">content_copy</span></button>
      </div>
    </div>

    <div :class="cardClass">
      <h2 class="font-bold text-primary flex items-center gap-2"><span class="material-symbols-outlined">bolt</span>Automatizaciones</h2>
      <label class="flex items-start gap-3 text-sm cursor-pointer">
        <input v-model="automations.abandonedCartEmails" type="checkbox" class="mt-1 rounded border-outline-variant" />
        <span><strong>Recordatorio de carrito abandonado.</strong> <span class="text-secondary text-xs">Si alguien deja su email en el checkout y no compra, le enviamos un único email a las 2 horas con link para terminar la compra.</span></span>
      </label>
      <label class="flex items-start gap-3 text-sm cursor-pointer">
        <input v-model="automations.lowStockAlerts" type="checkbox" class="mt-1 rounded border-outline-variant" />
        <span><strong>Aviso de stock bajo.</strong> <span class="text-secondary text-xs">Te avisamos por email cuando una venta deja un perfume con pocas unidades.</span></span>
      </label>
      <label class="block max-w-xs">
        <span :class="labelClass">Avisar cuando queden</span>
        <input v-model.number="automations.lowStockThreshold" type="number" min="0" :class="inputClass" />
      </label>
    </div>
  </div>
</template>
