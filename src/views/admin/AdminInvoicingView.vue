<script setup>
import { ref, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useStoreSettings, cardClass, inputClass, labelClass, primaryButtonClass } from '@/composables/useStoreSettings'

const { settings, isLoading, isSaving, save } = useStoreSettings()

const invoicing = ref({
  enabled: false,
  cuit: '',
  pointOfSale: 1,
  taxCondition: 'monotributo',
  production: false,
  autoIssueOnPaid: false,
  certificate: '',
  privateKey: '',
  afipSdkToken: ''
})
const flags = ref({ certificateSet: false, privateKeySet: false, afipSdkTokenSet: false })

watch(settings, (value) => {
  if (!value) return
  const inv = value.invoicing || {}
  invoicing.value = { ...invoicing.value, ...inv, certificate: '', privateKey: '', afipSdkToken: '' }
  flags.value = { certificateSet: inv.certificateSet, privateKeySet: inv.privateKeySet, afipSdkTokenSet: inv.afipSdkTokenSet }
})

const planAllows = computed(() => settings.value?.limits?.invoicing !== false)
const voucherLabel = computed(() => invoicing.value.taxCondition === 'responsable_inscripto' ? 'Factura B (IVA 21% incluido)' : 'Factura C')

const handleSave = () => {
  // Los campos secretos vacíos no se envían: el servidor conserva los guardados
  const payload = { ...invoicing.value }
  ;['certificate', 'privateKey', 'afipSdkToken'].forEach(field => { if (!payload[field]) delete payload[field] })
  return save({ invoicing: payload }, 'Facturación guardada')
}
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-6">
      <div>
        <h1 class="font-sans text-2xl sm:text-3xl text-primary">Facturación electrónica</h1>
        <p class="text-xs text-secondary mt-1">Emití facturas de ARCA desde el detalle de cada venta o automáticamente al cobrarla.</p>
      </div>
      <button type="button" @click="handleSave" :disabled="isSaving || isLoading || !planAllows" :class="primaryButtonClass">{{ isSaving ? 'Guardando...' : 'Guardar' }}</button>
    </div>

    <div v-if="!planAllows" class="text-xs bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-4">
      La facturación electrónica está incluida desde el plan Profesional. <RouterLink to="/admin/plan" class="underline font-bold">Ver planes</RouterLink>
    </div>

    <div :class="cardClass">
      <label class="flex items-center gap-3 text-sm font-bold text-primary cursor-pointer">
        <input v-model="invoicing.enabled" type="checkbox" class="rounded border-outline-variant" /> Facturar con ARCA
      </label>
      <div class="grid sm:grid-cols-3 gap-4">
        <label class="block"><span :class="labelClass">CUIT emisor</span><input v-model="invoicing.cuit" placeholder="20123456789" :class="inputClass" /></label>
        <label class="block"><span :class="labelClass">Punto de venta</span><input v-model.number="invoicing.pointOfSale" type="number" min="1" :class="inputClass" /></label>
        <label class="block">
          <span :class="labelClass">Condición frente al IVA</span>
          <select v-model="invoicing.taxCondition" :class="inputClass">
            <option value="monotributo">Monotributo</option>
            <option value="responsable_inscripto">Responsable Inscripto</option>
          </select>
        </label>
      </div>
      <p class="text-xs text-secondary">Se emite <strong>{{ voucherLabel }}</strong> a consumidor final, con el DNI del comprador si lo cargó en el checkout.</p>
      <label class="flex items-center gap-3 text-sm cursor-pointer">
        <input v-model="invoicing.autoIssueOnPaid" type="checkbox" class="rounded border-outline-variant" /> Emitir la factura automáticamente cuando el pedido se cobra
      </label>
      <label class="flex items-center gap-3 text-sm cursor-pointer">
        <input v-model="invoicing.production" type="checkbox" class="rounded border-outline-variant" /> Modo producción (desmarcado = homologación / pruebas)
      </label>
    </div>

    <div :class="cardClass">
      <h2 class="font-bold text-primary">Credenciales</h2>
      <p class="text-xs text-secondary leading-relaxed">
        La conexión con ARCA se hace con <a href="https://afipsdk.com" target="_blank" rel="noopener" class="underline">Afip SDK</a>: creá una cuenta, copiá tu access token y generá el certificado digital de tu CUIT
        (en ARCA: "Administración de certificados digitales" y luego asociá el servicio "Facturación electrónica"). Todo se guarda cifrado.
      </p>
      <label class="block">
        <span :class="labelClass">Access token de Afip SDK</span>
        <input v-model="invoicing.afipSdkToken" type="password" autocomplete="off" :placeholder="flags.afipSdkTokenSet ? 'Guardado (vacío = mantener)' : ''" :class="inputClass" />
      </label>
      <label class="block">
        <span :class="labelClass">Certificado (.crt)</span>
        <textarea v-model="invoicing.certificate" rows="4" :placeholder="flags.certificateSet ? 'Certificado guardado (vacío = mantener)' : '-----BEGIN CERTIFICATE-----'" :class="inputClass" class="font-mono text-[11px]"></textarea>
      </label>
      <label class="block">
        <span :class="labelClass">Clave privada (.key)</span>
        <textarea v-model="invoicing.privateKey" rows="4" :placeholder="flags.privateKeySet ? 'Clave guardada (vacío = mantener)' : '-----BEGIN PRIVATE KEY-----'" :class="inputClass" class="font-mono text-[11px]"></textarea>
      </label>
      <p class="text-[11px] text-secondary">En modo homologación podés probar sin certificado propio usando el entorno de pruebas de Afip SDK.</p>
    </div>
  </div>
</template>
