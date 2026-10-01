<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const adminAuthStore = useAdminAuthStore()
const toastStore = useToastStore()

const billing = ref(null)
const isLoading = ref(true)
const busyPlan = ref('')
const payerEmail = ref('')

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${adminAuthStore.token}`
})

const fetchBilling = async () => {
  const res = await fetch('/api/billing', { headers: authHeaders() })
  if (res.ok) billing.value = await res.json()
}

onMounted(async () => {
  try {
    // Al volver de Mercado Pago se sincroniza el estado de la suscripción
    if (route.query.suscripcion) {
      await fetch('/api/billing/sync', { method: 'POST', headers: authHeaders() }).catch(() => {})
    }
    await fetchBilling()
  } finally {
    isLoading.value = false
  }
})

const money = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`
const formatDate = (value) => value ? new Date(value).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
const limitLabel = (value) => value === null || value === undefined ? 'Ilimitado' : value

const statusInfo = computed(() => {
  const b = billing.value
  if (!b) return null
  if (b.exempt) return { label: 'Sin cargo', tone: 'emerald', text: 'Esta tienda no paga suscripción.' }
  if (b.storeStatus === 'suspended') return { label: 'Tienda pausada', tone: 'rose', text: 'Activá un plan para volver a vender.' }
  switch (b.status) {
    case 'active': return { label: 'Activo', tone: 'emerald', text: b.currentPeriodEnd ? `Próximo cobro: ${formatDate(b.currentPeriodEnd)}` : 'Suscripción al día.' }
    case 'trialing': return { label: 'Prueba gratis', tone: 'sky', text: b.trialEndsAt ? `Tu prueba termina el ${formatDate(b.trialEndsAt)} (${b.trialDaysLeft} días).` : 'Estás en el período de prueba.' }
    case 'past_due': return { label: 'Pago pendiente', tone: 'amber', text: 'No pudimos cobrar tu suscripción. Revisá tu medio de pago en Mercado Pago.' }
    case 'cancelled': return { label: 'Cancelada', tone: 'amber', text: 'Tu suscripción está cancelada. Elegí un plan para seguir vendiendo.' }
    default: return null
  }
})

const subscribe = async (planId) => {
  busyPlan.value = planId
  try {
    const res = await fetch('/api/billing/subscribe', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ plan: planId, payerEmail: payerEmail.value || undefined })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar la suscripción')
    window.location.href = data.initPoint
  } catch (err) {
    toastStore.show(err.message, 'error')
    busyPlan.value = ''
  }
}

const cancel = async () => {
  if (!confirm('¿Cancelar la suscripción? La tienda seguirá online durante el período de gracia y después se pausará.')) return
  const res = await fetch('/api/billing/cancel', { method: 'POST', headers: authHeaders() })
  const data = await res.json()
  toastStore.show(data.message || data.error, res.ok ? 'success' : 'error')
  await fetchBilling()
}

const toneClasses = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  sky: 'bg-sky-50 border-sky-200 text-sky-900',
  amber: 'bg-amber-50 border-amber-300 text-amber-950',
  rose: 'bg-rose-50 border-rose-200 text-rose-900'
}
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div v-if="isLoading" class="text-sm text-secondary">Cargando tu plan...</div>

    <template v-else-if="billing">
      <!-- Estado actual -->
      <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 grid md:grid-cols-3 gap-6">
        <div class="md:col-span-2 space-y-3">
          <p class="font-label text-[11px] uppercase tracking-widest text-secondary">Tu plan</p>
          <h2 class="font-serif text-3xl text-primary">{{ billing.plan.name }}</h2>
          <div v-if="statusInfo" class="inline-flex items-center gap-2 border rounded-full px-3 py-1 text-xs font-bold" :class="toneClasses[statusInfo.tone]">
            {{ statusInfo.label }}
          </div>
          <p class="text-sm text-secondary">{{ statusInfo?.text }}</p>
        </div>
        <div class="space-y-2 text-sm">
          <p class="font-label text-[11px] uppercase tracking-widest text-secondary">Uso</p>
          <div class="flex justify-between"><span>Perfumes</span><span class="font-bold">{{ billing.usage.products }} / {{ limitLabel(billing.limits.products) }}</span></div>
          <div class="flex justify-between"><span>Usuarios de equipo</span><span class="font-bold">{{ billing.usage.staff }} / {{ limitLabel(billing.limits.staff) }}</span></div>
          <div class="flex justify-between"><span>Dominio propio</span><span class="font-bold">{{ billing.limits.customDomain ? 'Incluido' : 'No incluido' }}</span></div>
          <div class="flex justify-between"><span>Facturación ARCA</span><span class="font-bold">{{ billing.limits.invoicing ? 'Incluida' : 'No incluida' }}</span></div>
        </div>
      </div>

      <!-- Planes -->
      <template v-if="!billing.exempt">
        <div v-if="!billing.billingConfigured" class="text-xs bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-4">
          El cobro automático de suscripciones todavía no está habilitado en la plataforma. Escribinos y activamos tu plan manualmente.
        </div>

        <div class="grid md:grid-cols-3 gap-4">
          <div
            v-for="plan in billing.plans"
            :key="plan.id"
            class="bg-surface border rounded-2xl p-6 flex flex-col"
            :class="plan.id === billing.plan.id ? 'border-primary shadow-md' : 'border-outline-variant'"
          >
            <div class="flex items-center justify-between">
              <h3 class="font-serif text-xl text-primary">{{ plan.name }}</h3>
              <span v-if="plan.id === billing.plan.id" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-on-primary">Actual</span>
            </div>
            <p class="mt-3"><span class="text-2xl font-bold text-primary">{{ money(plan.price) }}</span><span class="text-secondary text-sm"> /mes</span></p>
            <ul class="mt-4 space-y-1.5 text-xs text-secondary flex-1">
              <li v-for="feature in plan.features" :key="feature" class="flex gap-2">
                <span class="material-symbols-outlined text-sm text-primary">check</span>{{ feature }}
              </li>
            </ul>
            <button
              type="button"
              @click="subscribe(plan.id)"
              :disabled="!billing.billingConfigured || busyPlan !== '' || (plan.id === billing.plan.id && billing.status === 'active')"
              class="mt-5 w-full py-2.5 rounded-full font-label text-xs uppercase tracking-widest font-bold transition-all disabled:opacity-40"
              :class="plan.id === billing.plan.id ? 'bg-primary text-on-primary' : 'border border-outline-variant hover:border-primary text-primary'"
            >
              <template v-if="busyPlan === plan.id">Abriendo Mercado Pago...</template>
              <template v-else-if="plan.id === billing.plan.id && billing.status === 'active'">Plan activo</template>
              <template v-else-if="plan.id === billing.plan.id">Activar este plan</template>
              <template v-else>Cambiar a {{ plan.name }}</template>
            </button>
          </div>
        </div>

        <div class="bg-surface border border-outline-variant rounded-2xl p-5 text-xs text-secondary space-y-3">
          <label class="block space-y-1.5 max-w-sm">
            <span class="font-label uppercase tracking-widest text-primary font-bold">Email de tu cuenta de Mercado Pago (opcional)</span>
            <input v-model="payerEmail" type="email" placeholder="Si es distinto al email de acceso" class="w-full bg-surface-container border border-outline-variant rounded-xl p-2.5 text-xs focus:border-primary focus:outline-none" />
          </label>
          <p>La suscripción se cobra todos los meses con Mercado Pago. Podés cambiar de plan o cancelarla cuando quieras.</p>
          <button v-if="billing.status === 'active'" type="button" @click="cancel" class="underline text-rose-700">Cancelar suscripción</button>
        </div>
      </template>
    </template>
  </div>
</template>
