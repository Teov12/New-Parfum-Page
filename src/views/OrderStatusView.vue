<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'

const route = useRoute()
const tenantStore = useTenantStore()

const order = ref(null)
const isLoading = ref(true)
const notFound = ref(false)

onMounted(async () => {
  try {
    const token = route.query.token || ''
    const res = await fetch(`/api/orders/${encodeURIComponent(route.params.orderNumber)}?token=${encodeURIComponent(token)}`)
    if (!res.ok) throw new Error('not found')
    order.value = await res.json()
  } catch {
    notFound.value = true
  } finally {
    isLoading.value = false
  }
})

const money = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`

// Pasos del pedido para la línea de tiempo
const steps = computed(() => {
  const o = order.value
  if (!o) return []
  const paid = o.paymentStatus === 'paid'
  const fulfillment = o.fulfillmentStatus
  return [
    { key: 'created', label: 'Pedido recibido', done: true },
    { key: 'paid', label: paid ? 'Pago acreditado' : 'Esperando el pago', done: paid },
    { key: 'packing', label: 'Preparando tu pedido', done: ['packing', 'shipped', 'delivered'].includes(fulfillment) },
    { key: 'shipped', label: 'En camino', done: ['shipped', 'delivered'].includes(fulfillment) },
    { key: 'delivered', label: 'Entregado', done: fulfillment === 'delivered' }
  ]
})

const isCancelled = computed(() => ['cancelled', 'refunded'].includes(order.value?.paymentStatus))
const trackingUrl = computed(() => order.value?.trackingCode
  ? `https://www.andreani.com/#!/informacionEnvio/${encodeURIComponent(order.value.trackingCode)}`
  : '')
</script>

<template>
  <div class="bg-surface-container py-12 min-h-[70vh]">
    <div class="max-w-2xl mx-auto px-4 space-y-6">
      <div v-if="isLoading" class="text-center text-secondary py-20">Cargando tu pedido...</div>

      <div v-else-if="notFound" class="bg-surface border border-outline-variant rounded-2xl p-10 text-center space-y-3">
        <span class="material-symbols-outlined text-3xl text-secondary">search_off</span>
        <h1 class="font-serif text-2xl text-primary">No encontramos el pedido</h1>
        <p class="text-sm text-secondary">Abrí el link que te enviamos por email al hacer la compra.</p>
        <RouterLink to="/" class="inline-block text-xs underline text-primary">Volver a la tienda</RouterLink>
      </div>

      <template v-else>
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <p class="font-label text-[11px] uppercase tracking-[0.2em] text-secondary">Pedido #{{ order.orderNumber }}</p>
            <h1 class="font-serif text-2xl sm:text-3xl text-primary mt-1">
              {{ isCancelled ? 'Pedido cancelado' : `¡Hola ${order.customer?.firstName || ''}!` }}
            </h1>
          </div>

          <ol v-if="!isCancelled" class="space-y-3">
            <li v-for="step in steps" :key="step.key" class="flex items-center gap-3 text-sm">
              <span
                class="w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0"
                :class="step.done ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-secondary'"
              >
                <span class="material-symbols-outlined text-sm">{{ step.done ? 'check' : 'more_horiz' }}</span>
              </span>
              <span :class="step.done ? 'text-primary font-semibold' : 'text-secondary'">{{ step.label }}</span>
            </li>
          </ol>

          <div v-if="order.trackingCode" class="bg-surface-container rounded-xl p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Código de seguimiento: <strong class="font-mono">{{ order.trackingCode }}</strong></span>
            <a :href="trackingUrl" target="_blank" rel="noopener" class="text-xs underline text-primary">Seguir el envío</a>
          </div>
        </div>

        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-3">
          <h2 class="font-label text-xs uppercase tracking-widest text-primary font-bold">Resumen</h2>
          <div v-for="item in order.items" :key="`${item.id}-${item.size}`" class="flex justify-between text-sm border-b border-outline-variant/60 pb-2">
            <span>{{ item.quantity }}x {{ item.name }} <span class="text-secondary">({{ item.size }})</span></span>
            <span>{{ money(item.price * item.quantity) }}</span>
          </div>
          <div v-if="order.discountAmount > 0" class="flex justify-between text-sm text-emerald-800">
            <span>Descuentos</span><span>-{{ money(order.discountAmount) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>Envío ({{ order.shippingMethod }})</span>
            <span>{{ order.shippingCost > 0 ? money(order.shippingCost) : 'Gratis' }}</span>
          </div>
          <div class="flex justify-between text-base font-bold text-primary pt-2">
            <span>Total</span><span>{{ money(order.total) }}</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-between text-xs">
          <a
            v-if="tenantStore.whatsappUrl"
            :href="`${tenantStore.whatsappUrl}?text=${encodeURIComponent(`Hola! Consulto por mi pedido #${order.orderNumber}`)}`"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-label uppercase tracking-widest"
          >
            <span class="material-symbols-outlined text-base">chat</span> Consultar por WhatsApp
          </a>
          <RouterLink
            :to="{ path: '/arrepentimiento', query: { pedido: order.orderNumber } }"
            class="inline-flex items-center justify-center text-secondary underline hover:text-primary"
          >
            Botón de arrepentimiento
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>
