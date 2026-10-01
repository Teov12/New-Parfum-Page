<script setup>
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useStoreSettings, cardClass, inputClass, primaryButtonClass } from '@/composables/useStoreSettings'

const { settings, isLoading, isSaving, save } = useStoreSettings()
const methods = ref([])
const andreaniDisabled = ref(false)

watch(settings, (value) => {
  if (!value) return
  methods.value = (value.shippingMethods || []).map(m => ({ ...m, postalCodes: (m.postalCodes || []).join(', ') }))
  andreaniDisabled.value = Boolean(value.commercial?.andreani?.disabled)
})

const TYPES = {
  pickup: { label: 'Retiro en el local', icon: 'storefront' },
  local: { label: 'Envío local (moto / cadete)', icon: 'two_wheeler' },
  flat: { label: 'Tarifa fija (ej. Correo Argentino)', icon: 'local_post_office' }
}

const addMethod = (type) => {
  methods.value.push({
    id: `custom_${Date.now()}`,
    type,
    name: TYPES[type].label,
    description: '',
    price: type === 'pickup' ? 0 : 3000,
    freeOver: 0,
    postalCodes: '',
    estimatedDays: type === 'pickup' ? 'Coordinás el retiro por WhatsApp' : '24 a 72 hs',
    active: true
  })
}

const handleSave = () => save({
  shippingMethods: methods.value.map(m => ({
    ...m,
    postalCodes: String(m.postalCodes || '').split(',').map(cp => cp.trim()).filter(Boolean)
  })),
  commercial: { andreani: { disabled: andreaniDisabled.value } }
}, 'Métodos de envío guardados')
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-6">
      <div>
        <h1 class="font-sans text-2xl sm:text-3xl text-primary">Métodos de envío</h1>
        <p class="text-xs text-secondary mt-1">Andreani se cotiza automáticamente. Sumá retiro en tu local, envíos en moto o tarifas fijas por zona.</p>
      </div>
      <button type="button" @click="handleSave" :disabled="isSaving || isLoading" :class="primaryButtonClass">{{ isSaving ? 'Guardando...' : 'Guardar' }}</button>
    </div>

    <div :class="cardClass" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-rose-700">local_shipping</span>
        <div>
          <p class="font-bold text-sm text-primary">Andreani</p>
          <p class="text-xs text-secondary">Credenciales y contratos en <RouterLink to="/admin/tienda" class="underline">Ajustes & Pagos</RouterLink>.</p>
        </div>
      </div>
      <label class="flex items-center gap-2 text-xs text-secondary cursor-pointer">
        <input v-model="andreaniDisabled" type="checkbox" class="rounded border-outline-variant" /> No ofrecer Andreani
      </label>
    </div>

    <div v-for="(method, index) in methods" :key="method.id" :class="cardClass">
      <div class="flex items-center justify-between">
        <span class="inline-flex items-center gap-2 text-xs font-label uppercase tracking-wider text-secondary">
          <span class="material-symbols-outlined text-base">{{ TYPES[method.type]?.icon }}</span>{{ TYPES[method.type]?.label }}
        </span>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-xs text-secondary cursor-pointer">
            <input v-model="method.active" type="checkbox" class="rounded border-outline-variant" /> Activo
          </label>
          <button type="button" @click="methods.splice(index, 1)" class="text-rose-700"><span class="material-symbols-outlined">delete</span></button>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input v-model="method.name" placeholder="Nombre que ve el cliente" :class="inputClass" class="md:col-span-2" />
        <input v-model.number="method.price" type="number" min="0" placeholder="Precio" :class="inputClass" />
        <input v-model.number="method.freeOver" type="number" min="0" placeholder="Gratis desde $ (0 = nunca)" :class="inputClass" />
        <input v-model="method.description" placeholder="Detalle (dirección del local, horarios...)" :class="inputClass" class="md:col-span-2" />
        <input v-model="method.estimatedDays" placeholder="Plazo (ej. 24 a 48 hs)" :class="inputClass" />
        <input v-model="method.postalCodes" placeholder="CPs: 5000-5020, 5101 (vacío = todos)" :class="inputClass" />
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button v-for="(info, type) in TYPES" :key="type" type="button" @click="addMethod(type)" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-outline-variant hover:border-primary text-primary text-xs font-label uppercase tracking-wider">
        <span class="material-symbols-outlined text-base">{{ info.icon }}</span> + {{ info.label }}
      </button>
    </div>
  </div>
</template>
