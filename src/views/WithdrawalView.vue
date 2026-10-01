<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const tenantStore = useTenantStore()

const form = ref({
  name: '',
  email: '',
  phone: '',
  orderNumber: String(route.query.pedido || ''),
  reason: ''
})
const isSending = ref(false)
const error = ref('')
const code = ref('')

const handleSubmit = async () => {
  error.value = ''
  isSending.value = true
  try {
    const res = await fetch('/api/legal/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'No pudimos registrar tu solicitud')
    code.value = data.code
  } catch (err) {
    error.value = err.message
  } finally {
    isSending.value = false
  }
}

const inputClass = 'w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm focus:border-primary focus:outline-none'
</script>

<template>
  <div class="bg-surface-container py-12 min-h-[70vh]">
    <div class="max-w-xl mx-auto px-4">
      <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-10 space-y-5">
        <div class="space-y-2">
          <h1 class="font-serif text-3xl text-primary">Botón de arrepentimiento</h1>
          <p class="text-sm text-secondary leading-relaxed">
            Podés revocar tu compra dentro de los 10 días corridos desde que recibiste el producto, sin costo y sin dar explicaciones
            (Ley 24.240 y Resolución 424/2020). Te enviaremos un código de seguimiento por email.
          </p>
        </div>

        <div v-if="code" class="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-emerald-950 space-y-2">
          <p class="font-bold">Recibimos tu solicitud</p>
          <p class="text-sm">Tu código de seguimiento es <strong class="font-mono">{{ code }}</strong>. {{ tenantStore.storeName }} se va a comunicar con vos dentro de las 24 hs para coordinar la devolución.</p>
          <RouterLink to="/" class="text-xs underline">Volver a la tienda</RouterLink>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-3">
          <input v-model="form.name" required maxlength="120" placeholder="Nombre y apellido *" :class="inputClass" />
          <div class="grid sm:grid-cols-2 gap-3">
            <input v-model="form.email" type="email" required placeholder="Email *" :class="inputClass" />
            <input v-model="form.phone" placeholder="Teléfono" :class="inputClass" />
          </div>
          <input v-model="form.orderNumber" placeholder="Número de pedido (ej. ABC-123456)" :class="inputClass" />
          <textarea v-model="form.reason" rows="3" maxlength="1000" placeholder="Comentarios (opcional)" :class="inputClass"></textarea>
          <p v-if="error" class="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{{ error }}</p>
          <button type="submit" :disabled="isSending" class="w-full py-3 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest disabled:opacity-50">
            {{ isSending ? 'Enviando...' : 'Enviar solicitud de arrepentimiento' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
