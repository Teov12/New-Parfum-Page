<script setup>
import { ref, computed } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toast'
import ManualOrderModal from '@/components/admin/ManualOrderModal.vue'
import OrderDetailModal from '@/components/admin/OrderDetailModal.vue'
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal.vue'
import { useTenantStore } from '@/stores/tenant'

const tenantStore = useTenantStore()

const ordersStore = useOrdersStore()
const toastStore = useToastStore()

// Filter State
const orderSearchQuery = ref('')
const orderPaymentFilter = ref('all')
const orderFulfillmentFilter = ref('all')

// Modals State
const isManualOrderModalOpen = ref(false)
const isOrderDetailModalOpen = ref(false)
const selectedOrderForDetail = ref(null)

const isDeleteModalOpen = ref(false)
const orderToDelete = ref(null)
const isDeleting = ref(false)

// Exporta las ventas filtradas para Excel / Google Sheets (separador ; y BOM para acentos)
const exportOrdersCsv = () => {
  const columns = [
    ['Pedido', o => o.orderNumber],
    ['Fecha', o => new Date(o.createdAt || o.date).toLocaleString('es-AR')],
    ['Cliente', o => `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim()],
    ['Email', o => o.customer?.email],
    ['Teléfono', o => o.customer?.phone],
    ['DNI', o => o.customer?.dni],
    ['Dirección', o => [o.customer?.address, o.customer?.apartment, o.customer?.city, o.customer?.province, o.customer?.postalCode].filter(Boolean).join(', ')],
    ['Productos', o => (o.items || []).map(i => `${i.quantity}x ${i.name} ${i.size}`).join(' | ')],
    ['Subtotal', o => o.subtotal],
    ['Descuentos', o => o.discountAmount],
    ['Cupón', o => o.couponCode],
    ['Envío', o => o.shippingCost],
    ['Total', o => o.total],
    ['Costo', o => o.totalCost],
    ['Ganancia', o => o.profit],
    ['Medio de pago', o => o.paymentMethod],
    ['Estado de pago', o => o.paymentStatus],
    ['Estado de envío', o => o.fulfillmentStatus],
    ['Envío elegido', o => o.shippingMethod],
    ['Seguimiento', o => o.trackingCode],
    ['Factura', o => (o.invoice?.cae ? `${o.invoice.type} ${o.invoice.pointOfSale}-${o.invoice.number}` : '')]
  ]
  const escapeCell = (value) => {
    const text = String(value ?? '')
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const rows = [columns.map(c => c[0]), ...filteredOrders.value.map(o => columns.map(c => c[1](o)))]
  const csv = String.fromCharCode(0xFEFF) + rows.map(r => r.map(escapeCell).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Filtered Orders
const filteredOrders = computed(() => {
  return ordersStore.items.filter(o => {
    if (orderPaymentFilter.value !== 'all' && o.paymentStatus !== orderPaymentFilter.value) return false
    if (orderFulfillmentFilter.value !== 'all' && o.fulfillmentStatus !== orderFulfillmentFilter.value) return false
    if (orderSearchQuery.value.trim()) {
      const q = orderSearchQuery.value.toLowerCase().trim()
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customer?.firstName?.toLowerCase().includes(q) ||
        o.customer?.lastName?.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q) ||
        o.customer?.city?.toLowerCase().includes(q) ||
        o.items?.some(i => i.name?.toLowerCase().includes(q))
      )
    }
    return true
  })
})

const updateOrderStatus = async (order, field, value) => {
  const res = await ordersStore.updateOrder(order.id, { [field]: value })
  if (res.success) {
    toastStore.show('Estado actualizado correctamente', 'success')
  }
}

const viewOrderDetail = (order) => {
  selectedOrderForDetail.value = order
  isOrderDetailModalOpen.value = true
}

const sendWhatsAppTracking = (order) => {
  const text = `Hola ${order.customer?.firstName}, te escribimos de ${tenantStore.storeName} sobre tu orden #${order.orderNumber}.\n\nTu pedido se encuentra: *${order.fulfillmentStatus === 'shipped' ? 'DESPACHADO EN ANDREANI' : (order.fulfillmentStatus === 'delivered' ? 'ENTREGADO' : 'EN PREPARACIÓN')}*.\n${order.trackingCode ? `Código de Seguimiento Andreani: *${order.trackingCode}*\nPodés seguirlo en: https://www.andreani.com/#!/informacionEnvio/${order.trackingCode}` : ''}\n\nQuedamos a tu entera disposición.`
  const url = `https://wa.me/${order.customer?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
}

const confirmDeleteOrder = (order) => {
  orderToDelete.value = order
  isDeleteModalOpen.value = true
}

const handleDeleteOrder = async () => {
  if (!orderToDelete.value) return
  isDeleting.value = true
  const success = await ordersStore.deleteOrder(orderToDelete.value.id)
  isDeleting.value = false
  isDeleteModalOpen.value = false
  if (success) {
    toastStore.show('Pedido eliminado correctamente', 'info')
  } else {
    toastStore.show('Error al eliminar el pedido', 'error')
  }
  orderToDelete.value = null
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-300">
    
    <!-- Sales Financial Summary Cards with Fluid Hover Animation -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      <!-- Facturación -->
      <div class="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-[0_10px_25px_-8px_rgba(46,25,17,0.05)] hover:shadow-[0_18px_35px_-10px_rgba(46,25,17,0.1)] hover:-translate-y-1 transition-all duration-300 group">
        <div class="flex justify-between items-start mb-2 sm:mb-3">
          <span class="font-label text-xs uppercase tracking-widest text-secondary font-semibold">Facturación Bruta</span>
          <div class="w-10 h-10 sm:w-11 sm:h-11 bg-surface-container rounded-xl border border-outline-variant/70 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shadow-2xs">
            <span class="material-symbols-outlined text-xl">payments</span>
          </div>
        </div>
        <p class="font-sans text-2xl sm:text-3xl font-bold text-primary tracking-tight">
          ${{ ordersStore.stats.totalRevenue.toLocaleString('es-AR') }}
        </p>
        <p class="text-xs text-secondary mt-1.5 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>{{ ordersStore.stats.paidOrdersCount }} ventas cobradas</span>
        </p>
      </div>

      <!-- Costo de Mercadería -->
      <div class="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-[0_10px_25px_-8px_rgba(46,25,17,0.05)] hover:shadow-[0_18px_35px_-10px_rgba(46,25,17,0.1)] hover:-translate-y-1 transition-all duration-300 group">
        <div class="flex justify-between items-start mb-2 sm:mb-3">
          <span class="font-label text-xs uppercase tracking-widest text-secondary font-semibold">Costo de Mercadería</span>
          <div class="w-10 h-10 sm:w-11 sm:h-11 bg-surface-container rounded-xl border border-outline-variant/70 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform duration-300 shadow-2xs">
            <span class="material-symbols-outlined text-xl">inventory</span>
          </div>
        </div>
        <p class="font-sans text-2xl sm:text-3xl font-bold text-secondary tracking-tight">
          ${{ ordersStore.stats.totalCost.toLocaleString('es-AR') }}
        </p>
        <p class="text-xs text-secondary mt-1.5">Costo reposición de frascos</p>
      </div>

      <!-- Ganancia Neta Real -->
      <div class="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_10px_25px_-8px_rgba(16,185,129,0.08)] hover:shadow-[0_18px_35px_-10px_rgba(16,185,129,0.14)] hover:-translate-y-1 transition-all duration-300 group">
        <div class="flex justify-between items-start mb-2 sm:mb-3">
          <span class="font-label text-xs uppercase tracking-widest text-emerald-900 font-bold">Ganancia Neta Real</span>
          <div class="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-100/90 rounded-xl border border-emerald-200 flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform duration-300 shadow-2xs">
            <span class="material-symbols-outlined text-xl">savings</span>
          </div>
        </div>
        <p class="font-sans text-2xl sm:text-3xl font-bold text-emerald-900 tracking-tight">
          ${{ ordersStore.stats.totalProfit.toLocaleString('es-AR') }}
        </p>
        <p class="text-xs text-emerald-800 font-semibold mt-1.5 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>Margen global: +{{ ordersStore.stats.overallProfitMargin }}%</span>
        </p>
      </div>

      <!-- Ticket Promedio & Despachos -->
      <div class="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-6 shadow-[0_10px_25px_-8px_rgba(46,25,17,0.05)] hover:shadow-[0_18px_35px_-10px_rgba(46,25,17,0.1)] hover:-translate-y-1 transition-all duration-300 group">
        <div class="flex justify-between items-start mb-2 sm:mb-3">
          <span class="font-label text-xs uppercase tracking-widest text-secondary font-semibold">Ticket Promedio</span>
          <div class="w-10 h-10 sm:w-11 sm:h-11 bg-surface-container rounded-xl border border-outline-variant/70 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shadow-2xs">
            <span class="material-symbols-outlined text-xl">local_shipping</span>
          </div>
        </div>
        <p class="font-sans text-2xl sm:text-3xl font-bold text-primary tracking-tight">
          ${{ ordersStore.stats.averageTicket.toLocaleString('es-AR') }}
        </p>
        <p class="text-xs text-secondary mt-1.5">{{ ordersStore.stats.pendingShippingCount }} pedidos por despachar</p>
      </div>
    </div>

    <!-- Sales Filter & Action Bar -->
    <div class="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-[0_4px_18px_-4px_rgba(46,25,17,0.04)]">
      <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-grow">
        <!-- Search -->
        <div class="relative w-full sm:w-auto sm:min-w-[260px] flex-grow">
          <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-base">search</span>
          <input 
            v-model="orderSearchQuery"
            type="text" 
            placeholder="Buscar por Nº, cliente o ciudad..."
            class="w-full bg-surface-container/70 border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-xs font-sans text-primary placeholder:text-secondary/70 focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <!-- Filters in 2-col on mobile, flex on desktop -->
        <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <!-- Payment Filter -->
          <select 
            v-model="orderPaymentFilter"
            class="w-full sm:w-auto bg-surface-container/70 border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-sans text-primary focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs cursor-pointer"
          >
            <option value="all">Todos los Pagos</option>
            <option value="paid">Pagados</option>
            <option value="pending">Pendientes de Pago</option>
            <option value="cancelled">Cancelados</option>
          </select>

          <!-- Fulfillment Filter -->
          <select 
            v-model="orderFulfillmentFilter"
            class="w-full sm:w-auto bg-surface-container/70 border border-outline-variant rounded-xl px-3 py-2.5 text-xs font-sans text-primary focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs cursor-pointer"
          >
            <option value="all">Todos los Despachos</option>
            <option value="unfulfilled">Sin empaquetar</option>
            <option value="packing">En preparación</option>
            <option value="shipped">Despachado Andreani</option>
            <option value="delivered">Entregado</option>
          </select>
        </div>
      </div>

      <!-- Exportar ventas filtradas -->
      <button
        @click="exportOrdersCsv"
        :disabled="filteredOrders.length === 0"
        class="w-full sm:w-auto bg-surface hover:bg-surface-container text-primary border border-outline-variant hover:border-primary font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs flex-shrink-0 disabled:opacity-50"
      >
        <span class="material-symbols-outlined text-base">download</span>
        <span>Exportar CSV</span>
      </button>

      <!-- Main Button: Nueva Venta Manual -->
      <button
        @click="isManualOrderModalOpen = true"
        class="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-95 border border-primary/20 flex-shrink-0"
      >
        <span class="material-symbols-outlined text-base">add_circle</span>
        <span>+ Cargar Venta Manual</span>
      </button>
    </div>

    <!-- Mobile Orders Card List (< md) -->
    <div class="md:hidden space-y-3">
      <div v-if="filteredOrders.length === 0" class="bg-surface border border-outline-variant rounded-2xl p-8 text-center text-secondary text-xs">
        No se encontraron ventas con los filtros seleccionados.
      </div>

      <div 
        v-for="order in filteredOrders" 
        :key="order.id"
        class="bg-surface border border-outline-variant rounded-2xl p-4 shadow-sm space-y-3"
      >
        <!-- Top row: Order Number, Date, Source, and Delete button -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-primary text-sm">#{{ order.orderNumber }}</span>
            <span class="text-[11px] text-secondary">{{ new Date(order.date).toLocaleDateString('es-AR') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-label uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/70 font-bold text-primary">
              {{ order.source === 'web' ? 'Web' : (order.source === 'whatsapp' ? 'WhatsApp' : 'Manual') }}
            </span>
            <button 
              @click="confirmDeleteOrder(order)"
              class="w-7 h-7 inline-flex items-center justify-center text-secondary hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
              title="Eliminar Pedido"
            >
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>

        <!-- Customer & Contact -->
        <div class="bg-surface-container/40 p-2.5 rounded-xl border border-outline-variant/60 space-y-1">
          <div class="flex items-baseline justify-between">
            <p class="font-medium text-primary text-xs">{{ order.customer?.firstName }} {{ order.customer?.lastName }}</p>
            <p class="text-[11px] text-secondary truncate">{{ order.customer?.city }}, {{ order.customer?.province }}</p>
          </div>
          <div class="pt-1">
            <button 
              @click="sendWhatsAppTracking(order)"
              class="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-full transition-colors shadow-2xs"
              title="Abrir chat de WhatsApp"
            >
              <span class="material-symbols-outlined text-xs">chat</span>
              <span>WhatsApp: {{ order.customer?.phone }}</span>
            </button>
          </div>
        </div>

        <!-- Items preview -->
        <div class="text-xs space-y-0.5 text-secondary pl-1">
          <div 
            v-for="item in order.items" 
            :key="item.id"
            class="flex items-center gap-1.5"
          >
            <span class="font-bold text-primary">{{ item.quantity }}x</span>
            <span class="truncate">{{ item.name }} ({{ item.size }})</span>
          </div>
        </div>

        <!-- Financial Summary Row -->
        <div class="grid grid-cols-2 gap-2 bg-surface-container/50 p-2.5 rounded-xl border border-outline-variant/60 text-xs">
          <div>
            <span class="text-[9px] uppercase font-label tracking-wider text-secondary block">Total Venta</span>
            <span class="font-bold text-sm text-primary">
              ${{ order.total.toLocaleString('es-AR') }}
            </span>
            <span class="text-[10px] text-secondary block">Costo: ${{ order.totalCost.toLocaleString('es-AR') }}</span>
          </div>
          <div>
            <span class="text-[9px] uppercase font-label tracking-wider text-emerald-800 font-bold block">Ganancia Neta</span>
            <span class="font-bold text-xs text-emerald-800 flex items-center gap-1">
              +${{ order.profit.toLocaleString('es-AR') }}
              <span class="text-[9px] font-normal text-emerald-850 bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                {{ order.profitMargin }}%
              </span>
            </span>
          </div>
        </div>

        <!-- Status selectors (Payment & Fulfillment) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[9px] font-label uppercase text-secondary font-bold block mb-1">Pago</label>
            <select 
              :value="order.paymentStatus" 
              @change="updateOrderStatus(order, 'paymentStatus', $event.target.value)"
              class="w-full text-[11px] font-label uppercase font-bold px-2.5 py-2 rounded-xl border border-outline-variant focus:outline-none transition-all shadow-2xs cursor-pointer"
              :class="order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'"
            >
              <option value="paid">Pagado</option>
              <option value="pending">Pendiente</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label class="text-[9px] font-label uppercase text-secondary font-bold block mb-1">Despacho</label>
            <select 
              :value="order.fulfillmentStatus" 
              @change="updateOrderStatus(order, 'fulfillmentStatus', $event.target.value)"
              class="w-full text-[11px] font-label uppercase font-bold px-2.5 py-2 rounded-xl border border-outline-variant focus:outline-none transition-all shadow-2xs cursor-pointer"
              :class="order.fulfillmentStatus === 'delivered' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : (order.fulfillmentStatus === 'shipped' ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-surface-container text-secondary')"
            >
              <option value="unfulfilled">Sin Empaque</option>
              <option value="packing">Preparando</option>
              <option value="shipped">Despachado</option>
              <option value="delivered">Entregado</option>
            </select>
          </div>
        </div>

        <!-- Action: Ver Remito / Detalle -->
        <button 
          @click="viewOrderDetail(order)"
          class="w-full py-2.5 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-xl text-primary font-label text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95"
        >
          <span class="material-symbols-outlined text-sm">receipt_long</span>
          <span>Ver Remito Completo</span>
        </button>
      </div>
    </div>

    <!-- Desktop Sales Table (>= md) -->
    <div class="hidden md:block bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-[0_8px_30px_-10px_rgba(46,25,17,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[850px] text-left text-xs font-sans">
          <thead class="bg-surface-container-high/80 border-b border-outline-variant text-[11px] font-label uppercase tracking-widest text-secondary font-bold">
            <tr>
              <th class="py-4 px-5">Nº Pedido / Fecha</th>
              <th class="py-4 px-5">Cliente & Contacto</th>
              <th class="py-4 px-5">Perfumes Comprados</th>
              <th class="py-4 px-5">Venta ($) | Costo ($)</th>
              <th class="py-4 px-5">Ganancia Neta</th>
              <th class="py-4 px-5">Pago</th>
              <th class="py-4 px-5">Despacho</th>
              <th class="py-4 px-5 text-right">Acciones</th>
            </tr>
          </thead>
          
          <tbody v-if="filteredOrders.length === 0">
            <tr>
              <td colspan="8" class="text-center py-14 text-secondary">
                No se encontraron ventas con los filtros seleccionados.
              </td>
            </tr>
          </tbody>

          <TransitionGroup 
            v-else
            name="admin-row" 
            tag="tbody" 
            class="divide-y divide-outline-variant/60 relative"
          >
            <tr 
              v-for="order in filteredOrders" 
              :key="order.id"
              class="hover:bg-surface-container/40 transition-colors duration-150"
            >
              <!-- Order ID & Date -->
              <td class="py-4 px-5 align-top">
                <span class="font-mono font-bold text-primary block text-sm">#{{ order.orderNumber }}</span>
                <span class="text-[11px] text-secondary mt-0.5 block">{{ new Date(order.date).toLocaleDateString('es-AR') }}</span>
                <span class="text-[9px] font-label uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/70 block w-max mt-1.5 font-bold text-primary shadow-2xs">
                  {{ order.source === 'web' ? 'Tienda Web' : (order.source === 'whatsapp' ? 'WhatsApp' : 'Manual') }}
                </span>
              </td>

              <!-- Customer -->
              <td class="py-4 px-5 align-top">
                <p class="font-medium text-primary text-sm">{{ order.customer?.firstName }} {{ order.customer?.lastName }}</p>
                <p class="text-[11px] text-secondary mt-0.5">{{ order.customer?.city }}, {{ order.customer?.province }}</p>
                <button 
                  @click="sendWhatsAppTracking(order)"
                  class="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 px-2.5 py-0.5 rounded-full transition-colors shadow-2xs"
                  title="Abrir chat de WhatsApp"
                >
                  <span class="material-symbols-outlined text-xs">chat</span>
                  <span>{{ order.customer?.phone }}</span>
                </button>
              </td>

              <!-- Products list -->
              <td class="py-4 px-5 align-top max-w-xs">
                <div class="space-y-1">
                  <div 
                    v-for="item in order.items" 
                    :key="item.id"
                    class="flex items-center gap-1.5 text-xs"
                  >
                    <span class="font-bold text-primary">{{ item.quantity }}x</span>
                    <span class="truncate text-secondary">{{ item.name }} ({{ item.size }})</span>
                  </div>
                </div>
              </td>

              <!-- Revenue vs Cost -->
              <td class="py-4 px-5 align-top">
                <span class="font-bold text-primary block text-sm">${{ order.total.toLocaleString('es-AR') }}</span>
                <span class="text-[11px] text-secondary mt-0.5 block">Costo: ${{ order.totalCost.toLocaleString('es-AR') }}</span>
              </td>

              <!-- Profit -->
              <td class="py-4 px-5 align-top">
                <span class="font-bold text-emerald-800 block text-sm">
                  +${{ order.profit.toLocaleString('es-AR') }}
                </span>
                <span class="text-[10px] text-emerald-850 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-block mt-1 shadow-2xs">
                  {{ order.profitMargin }}% Margen
                </span>
              </td>

              <!-- Payment Status Select -->
              <td class="py-4 px-5 align-top">
                <select 
                  :value="order.paymentStatus" 
                  @change="updateOrderStatus(order, 'paymentStatus', $event.target.value)"
                  class="text-[11px] font-label uppercase font-bold px-3 py-1.5 rounded-xl border border-outline-variant focus:outline-none transition-all shadow-2xs cursor-pointer"
                  :class="order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'"
                >
                  <option value="paid">Pagado</option>
                  <option value="pending">Pendiente</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </td>

              <!-- Fulfillment Status Select -->
              <td class="py-4 px-5 align-top">
                <select 
                  :value="order.fulfillmentStatus" 
                  @change="updateOrderStatus(order, 'fulfillmentStatus', $event.target.value)"
                  class="text-[11px] font-label uppercase font-bold px-3 py-1.5 rounded-xl border border-outline-variant focus:outline-none transition-all shadow-2xs cursor-pointer"
                  :class="order.fulfillmentStatus === 'delivered' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : (order.fulfillmentStatus === 'shipped' ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-surface-container text-secondary')"
                >
                  <option value="unfulfilled">Sin Empaque</option>
                  <option value="packing">Preparando</option>
                  <option value="shipped">Despachado</option>
                  <option value="delivered">Entregado</option>
                </select>
              </td>

              <!-- Actions -->
              <td class="py-4 px-5 align-top text-right space-x-1.5">
                <button 
                  @click="viewOrderDetail(order)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-primary rounded-lg border border-outline-variant/60 hover:border-primary hover:bg-surface-container transition-all shadow-2xs"
                  title="Ver Remito / Detalle"
                >
                  <span class="material-symbols-outlined text-base">receipt_long</span>
                </button>
                <button 
                  @click="confirmDeleteOrder(order)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-rose-700 rounded-lg border border-outline-variant/60 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs"
                  title="Eliminar Pedido"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <ManualOrderModal 
      :is-open="isManualOrderModalOpen"
      @close="isManualOrderModalOpen = false"
      @saved="ordersStore.fetchOrders()"
    />

    <OrderDetailModal 
      :is-open="isOrderDetailModalOpen"
      :order="selectedOrderForDetail"
      @close="isOrderDetailModalOpen = false"
      @shipment-generated="ordersStore.fetchOrders()"
    />

    <DeleteConfirmModal 
      :is-open="isDeleteModalOpen"
      :title="`¿Eliminar pedido #${orderToDelete?.orderNumber}?`"
      message="Esta orden se eliminará de las estadísticas y registros comerciales permanentemente."
      :is-deleting="isDeleting"
      @close="isDeleteModalOpen = false"
      @confirm="handleDeleteOrder"
    />

  </div>
</template>
