<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useToastStore } from '@/stores/toast'
import { useStoreSettings, adminHeaders, cardClass, inputClass, labelClass, primaryButtonClass } from '@/composables/useStoreSettings'
import { legalTemplates } from '@/utils/legalTemplates'

const tenantStore = useTenantStore()
const toastStore = useToastStore()
const { settings, isLoading, isSaving, save } = useStoreSettings()

const legal = ref({ legalName: '', address: '', termsText: '', privacyText: '', returnsText: '', fiscalDataUrl: '', fiscalDataImageUrl: '' })
const cuit = ref('')

watch(settings, (value) => {
  if (!value) return
  legal.value = { ...legal.value, ...(value.legal || {}) }
  cuit.value = value.commercial?.cuit || ''
})

const useTemplate = (field, doc) => {
  legal.value[field] = legalTemplates[doc]({ storeName: tenantStore.storeName, legal: { ...legal.value, cuit: cuit.value } })
}

const handleSave = () => save({ legal: legal.value, commercial: { cuit: cuit.value } }, 'Información legal guardada')

// Solicitudes del Botón de arrepentimiento
const requests = ref([])
const loadRequests = async () => {
  const res = await fetch('/api/legal/withdrawals', { headers: adminHeaders() })
  if (res.ok) requests.value = (await res.json()).requests || []
}
onMounted(loadRequests)

const updateRequest = async (request, status) => {
  const res = await fetch(`/api/legal/withdrawals/${request._id}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify({ status })
  })
  if (res.ok) {
    request.status = status
    toastStore.show('Solicitud actualizada', 'success')
  }
}

const STATUS_LABELS = { pending: 'Pendiente', in_progress: 'En curso', resolved: 'Resuelta' }
const docs = [
  { field: 'termsText', doc: 'terminos', title: 'Términos y condiciones' },
  { field: 'privacyText', doc: 'privacidad', title: 'Política de privacidad' },
  { field: 'returnsText', doc: 'devoluciones', title: 'Cambios y devoluciones' }
]
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-6">
      <div>
        <h1 class="font-sans text-2xl sm:text-3xl text-primary">Legales y arrepentimiento</h1>
        <p class="text-xs text-secondary mt-1">Datos del vendedor, textos legales, Data Fiscal y solicitudes del Botón de arrepentimiento.</p>
      </div>
      <button type="button" @click="handleSave" :disabled="isSaving || isLoading" :class="primaryButtonClass">{{ isSaving ? 'Guardando...' : 'Guardar' }}</button>
    </div>

    <!-- Solicitudes de arrepentimiento -->
    <div :class="cardClass">
      <h2 class="font-bold text-primary flex items-center gap-2"><span class="material-symbols-outlined">assignment_return</span>Solicitudes de arrepentimiento</h2>
      <p class="text-xs text-secondary">Por ley tenés que responder dentro de las 24 hs. También te llegan por email.</p>
      <p v-if="requests.length === 0" class="text-sm text-secondary">No hay solicitudes.</p>
      <div v-for="r in requests" :key="r._id" class="border border-outline-variant rounded-xl p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p class="font-bold text-primary">{{ r.code }} · {{ r.name }} <span v-if="r.orderNumber" class="font-normal text-secondary">· Pedido #{{ r.orderNumber }}</span></p>
          <p class="text-xs text-secondary">{{ r.email }} {{ r.phone ? `· ${r.phone}` : '' }} · {{ new Date(r.createdAt).toLocaleString('es-AR') }}</p>
          <p v-if="r.reason" class="text-xs mt-1">{{ r.reason }}</p>
        </div>
        <select :value="r.status" @change="updateRequest(r, $event.target.value)" class="bg-surface-container border border-outline-variant rounded-xl p-2 text-xs">
          <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
    </div>

    <!-- Datos del vendedor -->
    <div :class="cardClass">
      <h2 class="font-bold text-primary flex items-center gap-2"><span class="material-symbols-outlined">badge</span>Datos del vendedor</h2>
      <p class="text-xs text-secondary">Se muestran al pie de la tienda (Ley 24.240).</p>
      <div class="grid sm:grid-cols-3 gap-4">
        <label class="block"><span :class="labelClass">Razón social</span><input v-model="legal.legalName" :class="inputClass" /></label>
        <label class="block"><span :class="labelClass">CUIT</span><input v-model="cuit" placeholder="20-12345678-9" :class="inputClass" /></label>
        <label class="block"><span :class="labelClass">Domicilio</span><input v-model="legal.address" :class="inputClass" /></label>
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="block"><span :class="labelClass">Link de Data Fiscal (ARCA)</span><input v-model="legal.fiscalDataUrl" placeholder="http://qr.afip.gob.ar/?qr=..." :class="inputClass" /></label>
        <label class="block"><span :class="labelClass">Imagen del QR de Data Fiscal (URL)</span><input v-model="legal.fiscalDataImageUrl" placeholder="https://www.afip.gob.ar/images/f960/DATAWEB.jpg" :class="inputClass" /></label>
      </div>
    </div>

    <!-- Textos -->
    <div v-for="d in docs" :key="d.field" :class="cardClass">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-bold text-primary">{{ d.title }}</h2>
        <button type="button" @click="useTemplate(d.field, d.doc)" class="text-xs underline text-secondary hover:text-primary">Usar texto base</button>
      </div>
      <textarea v-model="legal[d.field]" rows="8" placeholder="Si lo dejás vacío se muestra el texto base con los datos de tu tienda." :class="inputClass" class="font-sans leading-relaxed"></textarea>
    </div>
    <p class="text-[11px] text-secondary">Los textos base son orientativos. Te recomendamos revisarlos con tu contador o abogado.</p>
  </div>
</template>
