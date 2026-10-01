<script setup>
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useOrdersStore } from '@/stores/orders'
import { useTenantStore } from '@/stores/tenant'

const tenantStore = useTenantStore()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'shipment-generated'])

const toastStore = useToastStore()
const ordersStore = useOrdersStore()
const isGeneratingShipment = ref(false)
const isResendingEmail = ref(false)
const isInvoicing = ref(false)

// Factura electrónica ARCA del pedido
const handleIssueInvoice = async () => {
  if (!confirm(`¿Emitir la factura electrónica del pedido #${props.order.orderNumber} por $${Number(props.order.total).toLocaleString('es-AR')}?`)) return
  isInvoicing.value = true
  try {
    const res = await fetch(`/api/orders/${props.order.id || props.order.orderNumber}/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gicca_admin_token') || ''}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo emitir la factura')
    toastStore.show(`Factura ${data.invoice.type} ${String(data.invoice.pointOfSale).padStart(5, '0')}-${String(data.invoice.number).padStart(8, '0')} emitida (CAE ${data.invoice.cae})`, 'success')
    await ordersStore.fetchOrders()
    Object.assign(props.order, data.order)
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isInvoicing.value = false
  }
}

const handleResendEmail = async () => {
  if (!props.order) return
  isResendingEmail.value = true
  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`/api/orders/${props.order.id || props.order.orderNumber}/resend-email`, {
      method: 'POST',
      headers
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al reenviar email')
    toastStore.show(data.message || 'Email de confirmación reenviado', 'success')
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isResendingEmail.value = false
  }
}

const handleGenerateShipment = async () => {
  if (!props.order) return
  isGeneratingShipment.value = true
  try {
    const token = localStorage.getItem('gicca_admin_token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch('/api/shipping/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId: props.order.id })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al generar despacho')

    props.order.trackingCode = data.trackingCode
    props.order.fulfillmentStatus = 'shipped'
    props.order.shippingCarrier = 'Andreani'
    toastStore.show(`¡Despacho generado en Andreani! Tracking: ${data.trackingCode}`, 'success')
    await ordersStore.fetchOrders()
    emit('shipment-generated', data.trackingCode)
  } catch (err) {
    toastStore.show(err.message || 'Error al conectar con Andreani', 'error')
  } finally {
    isGeneratingShipment.value = false
  }
}

const openAndreaniTracking = (trackingCode) => {
  if (!trackingCode) return
  const url = `https://www.andreani.com/#!/informacionEnvio/${encodeURIComponent(trackingCode)}`
  window.open(url, '_blank')
}

const sendWhatsAppTracking = (order) => {
  if (!order) return
  const text = `Hola ${order.customer?.firstName}, te escribimos de ${tenantStore.storeName} sobre tu orden #${order.orderNumber}.\n\nTu pedido se encuentra: *${order.fulfillmentStatus === 'shipped' ? 'DESPACHADO EN ANDREANI' : (order.fulfillmentStatus === 'delivered' ? 'ENTREGADO' : 'EN PREPARACIÓN')}*.\n${order.trackingCode ? `Código de Seguimiento Andreani: *${order.trackingCode}*\nPodés seguirlo en: https://www.andreani.com/#!/informacionEnvio/${order.trackingCode}` : ''}\n\nQuedamos a tu entera disposición.`
  const url = `https://wa.me/${order.customer?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-modal">
      <div 
        v-if="isOpen && order" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-lg w-full max-h-[96vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)] p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-0.5">Comprobante de Venta</span>
              <h3 class="font-serif text-xl sm:text-2xl text-primary font-bold">#{{ order.orderNumber }}</h3>
            </div>
            <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-all">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div class="space-y-3.5 text-xs font-sans">
            <div class="bg-surface-container/70 p-4 rounded-xl border border-outline-variant space-y-1.5 shadow-2xs">
              <p class="font-bold text-primary text-sm">{{ order.customer?.firstName }} {{ order.customer?.lastName }}</p>
              <p class="text-secondary">{{ order.customer?.address }} (CP {{ order.customer?.postalCode }}), {{ order.customer?.city }}</p>
              <p class="text-secondary">Tel: {{ order.customer?.phone }}</p>
            </div>

            <div class="border border-outline-variant rounded-xl divide-y divide-outline-variant/70 overflow-hidden shadow-2xs">
              <div 
                v-for="item in order.items" 
                :key="item.id"
                class="p-3.5 flex justify-between items-center bg-surface"
              >
                <div>
                  <p class="font-medium text-primary text-sm">{{ item.quantity }}x {{ item.name }}</p>
                  <p class="text-[11px] text-secondary mt-0.5">{{ item.brand }} • {{ item.size }}</p>
                </div>
                <span class="font-bold text-primary text-sm">${{ (item.price * item.quantity).toLocaleString('es-AR') }}</span>
              </div>
            </div>

            <div class="bg-emerald-50/70 border border-emerald-200/90 p-4 rounded-xl space-y-1.5 shadow-2xs">
              <div class="flex justify-between text-secondary">
                <span>Total Venta:</span>
                <span class="font-bold text-primary text-sm">${{ order.total?.toLocaleString('es-AR') }}</span>
              </div>
              <div class="flex justify-between text-secondary">
                <span>Costo Total:</span>
                <span>${{ order.totalCost?.toLocaleString('es-AR') }}</span>
              </div>
              <div class="flex justify-between font-bold text-emerald-900 border-t border-emerald-200/70 pt-1.5 text-sm">
                <span>Ganancia Neta:</span>
                <span>+${{ order.profit?.toLocaleString('es-AR') }} ({{ order.profitMargin }}%)</span>
              </div>
            </div>

            <!-- Andreani Shipping & Tracking Box -->
            <div class="bg-surface-container/70 p-4 rounded-xl border border-outline-variant space-y-2.5 shadow-2xs">
              <div class="flex justify-between items-center">
                <span class="font-label text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm">local_shipping</span>
                  Envío & Logística Andreani
                </span>
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-label font-bold uppercase border shadow-2xs"
                  :class="order.fulfillmentStatus === 'shipped' ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : (order.fulfillmentStatus === 'delivered' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200')"
                >
                  {{ order.fulfillmentStatus === 'shipped' ? 'Despachado' : (order.fulfillmentStatus === 'delivered' ? 'Entregado' : 'En Preparación') }}
                </span>
              </div>

              <p class="text-secondary font-medium">Servicio: {{ order.shippingMethod || 'Andreani Estándar' }}</p>

              <div v-if="order.pickupBranch" class="p-3 bg-surface rounded-lg border border-outline-variant/60 text-[11px] text-secondary">
                <p class="font-bold text-primary">Punto de Retiro: {{ order.pickupBranch.name }}</p>
                <p>{{ order.pickupBranch.address }} ({{ order.pickupBranch.city }})</p>
              </div>

              <div v-if="order.trackingCode" class="flex items-center justify-between pt-1">
                <div>
                  <span class="text-[10px] text-secondary block">Nº de Seguimiento Andreani:</span>
                  <span class="font-mono font-bold text-primary text-sm">{{ order.trackingCode }}</span>
                </div>
                <button 
                  @click="openAndreaniTracking(order.trackingCode)" 
                  type="button"
                  class="text-xs text-primary underline hover:text-primary-container font-label uppercase tracking-wider"
                >
                  Ver en Andreani →
                </button>
              </div>
              <div v-else class="flex justify-between items-center pt-1 text-[11px] text-secondary">
                <span>Aún no se ha emitido rótulo de despacho para este pedido.</span>
              </div>
            </div>
          </div>

          <!-- Factura electrónica -->
          <div v-if="order.invoice?.cae" class="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <p class="font-label text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">receipt</span> Factura {{ order.invoice.type }} {{ String(order.invoice.pointOfSale).padStart(5, '0') }}-{{ String(order.invoice.number).padStart(8, '0') }}
            </p>
            <p>CAE {{ order.invoice.cae }} · vence {{ order.invoice.caeExpiresAt }} · {{ order.invoice.production ? 'Producción' : 'Homologación' }}</p>
          </div>
          <p v-else-if="order.invoice?.error" class="text-xs bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3">Último intento de factura: {{ order.invoice.error }}</p>

          <div class="flex flex-wrap gap-2 justify-end pt-2">
            <button
              v-if="!order.invoice?.cae && order.paymentStatus === 'paid'"
              @click="handleIssueInvoice"
              :disabled="isInvoicing"
              class="bg-surface hover:bg-surface-container border border-outline-variant hover:border-primary text-primary font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-sm">receipt</span>
              <span>{{ isInvoicing ? 'Emitiendo...' : 'Emitir factura' }}</span>
            </button>

            <!-- Generar Despacho Andreani Button -->
            <button 
              v-if="!order.trackingCode"
              @click="handleGenerateShipment"
              :disabled="isGeneratingShipment"
              class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md border border-primary/20 disabled:opacity-50 transition-all"
            >
              <span class="material-symbols-outlined text-sm">local_shipping</span>
              <span>{{ isGeneratingShipment ? 'Conectando con Andreani...' : 'Generar Envío Andreani' }}</span>
            </button>

            <button 
              @click="handleResendEmail"
              :disabled="isResendingEmail"
              class="bg-surface hover:bg-surface-container border border-outline-variant hover:border-primary text-primary font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
              title="Reenviar correo de confirmación de compra al cliente"
            >
              <span v-if="isResendingEmail" class="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              <span v-else class="material-symbols-outlined text-sm">mail</span>
              <span>Reenviar Email</span>
            </button>

            <button 
              @click="sendWhatsAppTracking(order)"
              class="bg-[#25D366] hover:bg-[#20ba5a] text-white font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all"
            >
              <span class="material-symbols-outlined text-sm">chat</span>
              <span>WhatsApp</span>
            </button>
            <button 
              @click="emit('close')" 
              class="bg-surface border border-outline-variant hover:border-primary text-secondary hover:text-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
