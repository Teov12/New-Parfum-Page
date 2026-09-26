<script setup>
import { ref, computed, watch } from 'vue'
import { useProductStore } from '@/stores/products'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'saved'])

const productStore = useProductStore()
const ordersStore = useOrdersStore()
const toastStore = useToastStore()

const isSubmittingOrder = ref(false)

const manualOrderForm = ref({
  customer: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dni: '',
    address: '',
    apartment: '',
    city: 'Córdoba',
    province: 'Córdoba',
    postalCode: '2400'
  },
  selectedProductId: '',
  selectedProductSize: '100 ml',
  quantity: 1,
  unitPrice: 0,
  unitCostPrice: 0,
  shippingMethod: 'Andreani Estándar a Domicilio',
  shippingCost: 0,
  discountAmount: 0,
  paymentMethod: 'transfer',
  paymentStatus: 'paid',
  fulfillmentStatus: 'packing',
  notes: '',
  source: 'manual_admin'
})

// Initialize form values when modal opens
watch(() => props.isOpen, (open) => {
  if (open) {
    const firstProd = productStore.items[0]
    manualOrderForm.value = {
      customer: {
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        dni: '',
        address: '',
        apartment: '',
        city: 'Córdoba',
        province: 'Córdoba',
        postalCode: '2400'
      },
      selectedProductId: firstProd?.id || '',
      selectedProductSize: firstProd?.sizes?.[0]?.size || '100 ml',
      quantity: 1,
      unitPrice: firstProd?.price || 145000,
      unitCostPrice: firstProd?.costPrice || Math.round((firstProd?.price || 145000) * 0.45),
      shippingMethod: 'Andreani Estándar a Domicilio',
      shippingCost: 0,
      discountAmount: 0,
      paymentMethod: 'transfer',
      paymentStatus: 'paid',
      fulfillmentStatus: 'packing',
      notes: '',
      source: 'manual_admin'
    }
  }
})

// Profit and totals calculations
const manualOrderSubtotal = computed(() => {
  return (Number(manualOrderForm.value.unitPrice) || 0) * (Number(manualOrderForm.value.quantity) || 1)
})

const manualOrderTotalCost = computed(() => {
  return (Number(manualOrderForm.value.unitCostPrice) || 0) * (Number(manualOrderForm.value.quantity) || 1)
})

const manualOrderTotal = computed(() => {
  const sub = manualOrderSubtotal.value
  const disc = Number(manualOrderForm.value.discountAmount) || 0
  const ship = Number(manualOrderForm.value.shippingCost) || 0
  return Math.max(0, sub - disc + ship)
})

const manualOrderProfit = computed(() => {
  const netRevenue = Math.max(0, manualOrderSubtotal.value - (Number(manualOrderForm.value.discountAmount) || 0))
  return Math.max(0, netRevenue - manualOrderTotalCost.value)
})

const manualOrderProfitMargin = computed(() => {
  const netRevenue = Math.max(0, manualOrderSubtotal.value - (Number(manualOrderForm.value.discountAmount) || 0))
  if (netRevenue <= 0) return 0
  return Math.round((manualOrderProfit.value / netRevenue) * 100)
})

// Auto-fill price and cost when selecting product
watch(() => manualOrderForm.value.selectedProductId, (prodId) => {
  if (!prodId) return
  const prod = productStore.items.find(p => p.id === prodId)
  if (prod) {
    const defaultSize = prod.sizes?.find(s => s.default) || prod.sizes?.[0]
    manualOrderForm.value.selectedProductSize = defaultSize?.size || '100 ml'
    manualOrderForm.value.unitPrice = defaultSize?.price || prod.price || 0
    manualOrderForm.value.unitCostPrice = defaultSize?.costPrice || prod.costPrice || Math.round((prod.price || 0) * 0.45)
  }
})

const handleSaveManualOrder = async () => {
  if (!manualOrderForm.value.customer.firstName.trim()) {
    toastStore.show('Ingresá el nombre del cliente.', 'error')
    return
  }
  if (!manualOrderForm.value.customer.phone.trim()) {
    toastStore.show('Ingresá el WhatsApp o teléfono del cliente.', 'error')
    return
  }
  if (!manualOrderForm.value.customer.address.trim()) {
    toastStore.show('Ingresá la dirección de entrega.', 'error')
    return
  }
  if (!manualOrderForm.value.selectedProductId) {
    toastStore.show('Seleccioná un producto del catálogo.', 'error')
    return
  }

  isSubmittingOrder.value = true

  const prod = productStore.items.find(p => p.id === manualOrderForm.value.selectedProductId)
  const orderNumber = `GIC-${Math.floor(100000 + Math.random() * 900000)}`

  const payload = {
    orderNumber,
    customer: { ...manualOrderForm.value.customer },
    items: [
      {
        id: prod?.id || 'custom',
        name: prod?.name || 'Perfume Original',
        brand: prod?.brand || 'Gicca',
        size: manualOrderForm.value.selectedProductSize,
        quantity: Number(manualOrderForm.value.quantity) || 1,
        price: Number(manualOrderForm.value.unitPrice) || 0,
        costPrice: Number(manualOrderForm.value.unitCostPrice) || 0
      }
    ],
    subtotal: manualOrderSubtotal.value,
    shippingCost: Number(manualOrderForm.value.shippingCost) || 0,
    discountAmount: Number(manualOrderForm.value.discountAmount) || 0,
    total: manualOrderTotal.value,
    totalCost: manualOrderTotalCost.value,
    shippingMethod: manualOrderForm.value.shippingMethod,
    paymentMethod: manualOrderForm.value.paymentMethod,
    paymentStatus: manualOrderForm.value.paymentStatus,
    fulfillmentStatus: manualOrderForm.value.fulfillmentStatus,
    notes: manualOrderForm.value.notes,
    source: 'manual_admin'
  }

  const res = await ordersStore.createOrder(payload)
  isSubmittingOrder.value = false

  if (res.success) {
    toastStore.show(`¡Venta #${orderNumber} registrada con éxito! Ganancia: $${manualOrderProfit.value.toLocaleString('es-AR')}`, 'success')
    emit('saved')
    emit('close')
  } else {
    toastStore.show(res.error || 'Error al guardar la venta', 'error')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-2xl w-full max-h-[96vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)] space-y-4 sm:space-y-6 p-4 sm:p-8">
          
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-1">Registro Comercial</span>
              <h2 class="font-serif text-xl sm:text-2xl text-primary font-normal">+ Registrar Venta Manual</h2>
              <p class="font-sans text-xs text-secondary mt-0.5">Creá un pedido con registro comercial y calculá la ganancia al instante.</p>
            </div>
            <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-all">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <form @submit.prevent="handleSaveManualOrder" class="space-y-4">
            
            <!-- Product Selector -->
            <div class="bg-surface-container/70 p-5 rounded-2xl border border-outline-variant space-y-3">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">1. Producto & Precios</label>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] text-secondary mb-1">Perfume del Catálogo *</label>
                  <select 
                    v-model="manualOrderForm.selectedProductId"
                    required
                    class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs cursor-pointer"
                  >
                    <option v-for="p in productStore.items" :key="p.id" :value="p.id">
                      {{ p.name }} ({{ p.brand }})
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] text-secondary mb-1">Cantidad *</label>
                  <input 
                    v-model.number="manualOrderForm.quantity"
                    type="number" 
                    min="1" 
                    required
                    class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label class="block text-[11px] text-secondary mb-1">Precio Unitario de Venta ($ ARS) *</label>
                  <input 
                    v-model.number="manualOrderForm.unitPrice"
                    type="number" 
                    min="0" 
                    required
                    class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary font-bold focus:border-primary focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label class="block text-[11px] text-secondary mb-1">Precio Unitario de Costo ($ ARS) *</label>
                  <input 
                    v-model.number="manualOrderForm.unitCostPrice"
                    type="number" 
                    min="0" 
                    required
                    class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-secondary focus:border-primary focus:outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <!-- Customer Data -->
            <div class="bg-surface-container/70 p-5 rounded-2xl border border-outline-variant space-y-3">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">2. Datos del Cliente</label>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  v-model="manualOrderForm.customer.firstName" 
                  type="text" 
                  required 
                  placeholder="Nombre *" 
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs"
                />
                <input 
                  v-model="manualOrderForm.customer.lastName" 
                  type="text" 
                  placeholder="Apellido" 
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  v-model="manualOrderForm.customer.phone" 
                  type="tel" 
                  required 
                  placeholder="WhatsApp / Teléfono *" 
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs"
                />
                <input 
                  v-model="manualOrderForm.customer.email" 
                  type="email" 
                  placeholder="Email (opcional)" 
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input 
                  v-model="manualOrderForm.customer.address" 
                  type="text" 
                  required 
                  placeholder="Dirección y Número *" 
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans sm:col-span-2 text-primary focus:border-primary focus:outline-none shadow-2xs"
                />
                <input 
                  v-model="manualOrderForm.customer.postalCode" 
                  type="text" 
                  required 
                  placeholder="Código Postal *" 
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            <!-- Shipping & Payment Method -->
            <div class="bg-surface-container/70 p-5 rounded-2xl border border-outline-variant space-y-3">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">3. Logística & Pago</label>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] text-secondary mb-1">Método de Envío</label>
                  <select v-model="manualOrderForm.shippingMethod" class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs cursor-pointer">
                    <option>Andreani Estándar a Domicilio</option>
                    <option>Retiro en Sucursal Andreani</option>
                    <option>Retiro en Boutique / Local</option>
                    <option>Envío Personalizado</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] text-secondary mb-1">Medio de Pago</label>
                  <select v-model="manualOrderForm.paymentMethod" class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs cursor-pointer">
                    <option value="transfer">Transferencia Bancaria</option>
                    <option value="credit_card">Tarjeta de Crédito / Débito</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="cash">Efectivo en Tienda</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label class="block text-[11px] text-secondary mb-1">Estado de Pago</label>
                  <select v-model="manualOrderForm.paymentStatus" class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs cursor-pointer">
                    <option value="paid">Pagado (Abonado)</option>
                    <option value="pending">Pendiente de Pago</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] text-secondary mb-1">Descuento Manual ($ ARS)</label>
                  <input 
                    v-model.number="manualOrderForm.discountAmount" 
                    type="number" 
                    min="0" 
                    placeholder="0" 
                    class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <!-- Real-Time Profit Calculation Box -->
            <div class="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-5 flex justify-between items-center text-xs shadow-2xs">
              <div>
                <span class="font-label uppercase font-bold text-emerald-900 block tracking-wider">Resumen de Rentabilidad:</span>
                <span class="text-emerald-800 font-medium">Total Venta: ${{ manualOrderTotal.toLocaleString('es-AR') }} | Costo: ${{ manualOrderTotalCost.toLocaleString('es-AR') }}</span>
              </div>
              <div class="text-right">
                <span class="font-bold text-base text-emerald-900 block">+${{ manualOrderProfit.toLocaleString('es-AR') }}</span>
                <span class="text-[10px] bg-emerald-100/90 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  {{ manualOrderProfitMargin }}% Margen
                </span>
              </div>
            </div>

            <!-- Submit Action -->
            <div class="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                @click="emit('close')"
                class="px-5 py-2.5 text-xs font-label uppercase tracking-wider rounded-xl border border-outline-variant text-secondary hover:text-primary hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                :disabled="isSubmittingOrder"
                class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md active:scale-95 border border-primary/20 disabled:opacity-50"
              >
                <span>{{ isSubmittingOrder ? 'Guardando...' : 'Crear y Registrar Venta' }}</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
