<script setup>
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import { adminHeaders, cardClass, inputClass, primaryButtonClass } from '@/composables/useStoreSettings'

const toastStore = useToastStore()
const coupons = ref([])
const isLoading = ref(true)
const isSaving = ref(false)

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

const load = async () => {
  try {
    const res = await fetch('/api/coupons', { headers: adminHeaders() })
    const data = await res.json()
    coupons.value = (data.coupons || []).map(c => ({ ...c, expiresAt: toDateInput(c.expiresAt) }))
  } finally {
    isLoading.value = false
  }
}
onMounted(load)

const addCoupon = () => {
  coupons.value.unshift({ code: '', type: 'percentage', value: 10, label: '', minPurchase: 0, expiresAt: '', usageLimit: 0, usedCount: 0, active: true })
}

const removeCoupon = (index) => {
  coupons.value.splice(index, 1)
}

const save = async () => {
  isSaving.value = true
  try {
    const res = await fetch('/api/coupons', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ coupons: coupons.value.map(c => ({ ...c, expiresAt: c.expiresAt || null })) })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudieron guardar los cupones')
    coupons.value = data.coupons.map(c => ({ ...c, expiresAt: toDateInput(c.expiresAt) }))
    toastStore.show('Cupones guardados', 'success')
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-6">
      <div>
        <h1 class="font-sans text-2xl sm:text-3xl text-primary">Cupones de descuento</h1>
        <p class="text-xs text-secondary mt-1">Se validan al pagar: monto mínimo, vencimiento y cantidad máxima de usos.</p>
      </div>
      <div class="flex gap-2">
        <button type="button" @click="addCoupon" class="px-5 py-3 rounded-full border border-outline-variant hover:border-primary text-primary font-label text-xs uppercase tracking-widest font-bold">+ Nuevo cupón</button>
        <button type="button" @click="save" :disabled="isSaving" :class="primaryButtonClass">{{ isSaving ? 'Guardando...' : 'Guardar' }}</button>
      </div>
    </div>

    <p v-if="isLoading" class="text-sm text-secondary">Cargando...</p>
    <p v-else-if="coupons.length === 0" :class="cardClass" class="text-sm text-secondary">Todavía no creaste cupones.</p>

    <div v-for="(coupon, index) in coupons" :key="index" :class="cardClass">
      <div class="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <label class="col-span-2 md:col-span-2 block">
          <span class="text-[10px] font-label uppercase tracking-wider text-secondary">Código</span>
          <input v-model="coupon.code" placeholder="BIENVENIDA10" :class="inputClass" class="uppercase font-mono" />
        </label>
        <label class="block">
          <span class="text-[10px] font-label uppercase tracking-wider text-secondary">Tipo</span>
          <select v-model="coupon.type" :class="inputClass">
            <option value="percentage">% OFF</option>
            <option value="fixed">$ fijo</option>
          </select>
        </label>
        <label class="block">
          <span class="text-[10px] font-label uppercase tracking-wider text-secondary">Valor</span>
          <input v-model.number="coupon.value" type="number" min="0" :class="inputClass" />
        </label>
        <label class="block">
          <span class="text-[10px] font-label uppercase tracking-wider text-secondary">Compra mínima ($)</span>
          <input v-model.number="coupon.minPurchase" type="number" min="0" :class="inputClass" />
        </label>
        <label class="block">
          <span class="text-[10px] font-label uppercase tracking-wider text-secondary">Vence</span>
          <input v-model="coupon.expiresAt" type="date" :class="inputClass" />
        </label>
        <label class="col-span-2 md:col-span-3 block">
          <span class="text-[10px] font-label uppercase tracking-wider text-secondary">Descripción (la ve el cliente)</span>
          <input v-model="coupon.label" placeholder="10% OFF de bienvenida" :class="inputClass" />
        </label>
        <label class="block">
          <span class="text-[10px] font-label uppercase tracking-wider text-secondary">Usos máximos (0 = sin límite)</span>
          <input v-model.number="coupon.usageLimit" type="number" min="0" :class="inputClass" />
        </label>
        <div class="text-xs text-secondary pb-3">Usado {{ coupon.usedCount || 0 }} {{ coupon.usedCount === 1 ? 'vez' : 'veces' }}</div>
        <div class="flex items-center justify-end gap-3 pb-2">
          <label class="flex items-center gap-2 text-xs text-secondary cursor-pointer">
            <input v-model="coupon.active" type="checkbox" class="rounded border-outline-variant" /> Activo
          </label>
          <button type="button" @click="removeCoupon(index)" class="text-rose-700" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
