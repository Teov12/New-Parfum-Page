<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const cartStore = useCartStore()
const toastStore = useToastStore()
const router = useRouter()

// Checkout Steps: 1: Delivery info, 2: Payment method, 3: Confirmation
const currentStep = ref(1)
const isSubmitting = ref(false)

// Form Fields
const form = ref({
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  dni: '',
  address: '',
  apartment: '',
  city: 'Buenos Aires',
  province: 'CABA',
  postalCode: '1425',
  notes: '',
  paymentMethod: 'transfer', // 'credit_card', 'transfer', 'mercado_pago'
  shippingType: 'standard' // 'standard', 'express'
})

const orderResult = ref(null)

const shippingCost = computed(() => {
  if (cartStore.subtotal >= 200000) return 0
  return form.value.shippingType === 'express' ? 6500 : 3900
})

const transferDiscount = computed(() => {
  if (form.value.paymentMethod === 'transfer') {
    return Math.round((cartStore.subtotal - cartStore.discountAmount) * 0.10)
  }
  return 0
})

const finalTotal = computed(() => {
  return Math.max(0, cartStore.subtotal - cartStore.discountAmount - transferDiscount.value + shippingCost.value)
})

const handleStep1Submit = () => {
  if (!form.value.email || !form.value.firstName || !form.value.lastName || !form.value.address || !form.value.phone) {
    toastStore.show('Por favor completá los campos obligatorios.', 'error')
    return
  }
  currentStep.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleFinalOrder = () => {
  isSubmitting.value = true

  setTimeout(() => {
    isSubmitting.value = false
    const orderNumber = `GIC-${Math.floor(100000 + Math.random() * 900000)}`
    orderResult.value = {
      orderNumber,
      date: new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }),
      items: [...cartStore.items],
      sample: cartStore.selectedSample,
      total: finalTotal.value,
      paymentMethod: form.value.paymentMethod,
      customer: { ...form.value }
    }
    cartStore.clearCart()
    currentStep.value = 3
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toastStore.show(`¡Orden ${orderNumber} confirmada con éxito!`, 'success')
  }, 1200)
}
</script>

<template>
  <div class="bg-surface-container py-12">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Checkout Stepper Progress (Rounded-full Pills) -->
      <div class="max-w-xl mx-auto mb-10">
        <div class="flex items-center justify-between relative">
          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-outline-variant z-0"></div>

          <!-- Step 1 Indicator -->
          <div class="relative z-10 flex flex-col items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-label text-xs font-bold border transition-colors shadow-2xs"
              :class="currentStep >= 1 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              1
            </div>
            <span class="font-label text-[10px] uppercase tracking-wider text-primary mt-1.5 font-bold">Envío</span>
          </div>

          <!-- Step 2 Indicator -->
          <div class="relative z-10 flex flex-col items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-label text-xs font-bold border transition-colors shadow-2xs"
              :class="currentStep >= 2 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              2
            </div>
            <span class="font-label text-[10px] uppercase tracking-wider text-primary mt-1.5 font-bold">Pago</span>
          </div>

          <!-- Step 3 Indicator -->
          <div class="relative z-10 flex flex-col items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-label text-xs font-bold border transition-colors shadow-2xs"
              :class="currentStep === 3 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              3
            </div>
            <span class="font-label text-[10px] uppercase tracking-wider text-primary mt-1.5 font-bold">Confirmación</span>
          </div>
        </div>
      </div>

      <!-- SUCCESS CONFIRMATION SCREEN (Step 3 - Rounded 3xl) -->
      <div v-if="currentStep === 3 && orderResult" class="max-w-2xl mx-auto bg-surface border border-outline-variant rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-6">
        <div class="w-20 h-20 bg-surface-container rounded-full border border-outline-variant flex items-center justify-center mx-auto text-tertiary shadow-sm">
          <span class="material-symbols-outlined text-4xl">check_circle</span>
        </div>

        <div>
          <span class="font-label text-xs uppercase tracking-[0.2em] text-secondary">¡Orden Recibida Exitosamente!</span>
          <h1 class="font-serif text-3xl sm:text-4xl text-primary font-normal mt-1 mb-2">
            Gracias por tu compra, {{ orderResult.customer.firstName }}
          </h1>
          <p class="font-sans text-secondary text-sm">
            Enviamos el comprobante y el seguimiento a <strong>{{ orderResult.customer.email }}</strong>.
          </p>
        </div>

        <div class="bg-surface-container rounded-2xl p-6 text-left space-y-4 border border-outline-variant text-sm font-sans shadow-2xs">
          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <span class="font-label text-xs uppercase text-secondary">Número de Pedido:</span>
            <span class="font-mono font-bold text-primary text-base">{{ orderResult.orderNumber }}</span>
          </div>

          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <span class="font-label text-xs uppercase text-secondary">Método de Pago:</span>
            <span class="font-medium text-primary">
              {{ orderResult.paymentMethod === 'transfer' ? 'Transferencia Bancaria (10% OFF aplicado)' : 'Tarjeta de Crédito / Débito' }}
            </span>
          </div>

          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <span class="font-label text-xs uppercase text-secondary">Muestra de Cortesía:</span>
            <span class="font-medium text-tertiary">{{ orderResult.sample }}</span>
          </div>

          <div class="flex justify-between items-center pt-1 text-base">
            <span class="font-serif font-bold text-primary">Monto Total Abonado:</span>
            <span class="font-sans font-bold text-primary text-xl">${{ orderResult.total.toLocaleString('es-AR') }}</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <RouterLink 
            to="/"
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-inverse-surface transition-all shadow-xs"
          >
            Volver al Inicio
          </RouterLink>
          <a 
            :href="`https://wa.me/5491158249910?text=${encodeURIComponent('Hola Gicca Perfumes, adjunto comprobante de mi pedido ' + orderResult.orderNumber)}`"
            target="_blank"
            class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline hover:bg-surface-container transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <span>Enviar Comprobante WhatsApp</span>
          </a>
        </div>
      </div>

      <!-- MAIN CHECKOUT WORKFLOW (Steps 1 & 2) -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- FORM COLUMN (7 cols - Rounded 3xl) -->
        <div class="lg:col-span-7 bg-surface border border-outline-variant rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          
          <!-- STEP 1: Delivery Details -->
          <div v-if="currentStep === 1" class="space-y-6">
            <div class="border-b border-outline-variant pb-4">
              <h2 class="font-serif text-2xl text-primary font-normal">1. Datos de Contacto & Entrega</h2>
              <p class="font-sans text-xs text-secondary mt-1">Ingresá los datos del destinatario para la guía de transporte asegurado.</p>
            </div>

            <form @submit.prevent="handleStep1Submit" class="space-y-4">
              <!-- Email -->
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  Correo Electrónico (para confirmación y factura) *
                </label>
                <input 
                  v-model="form.email"
                  type="email" 
                  required
                  placeholder="ejemplo@correo.com"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <!-- First & Last Name -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Nombre *</label>
                  <input 
                    v-model="form.firstName"
                    type="text" 
                    required
                    placeholder="Tu nombre"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Apellido *</label>
                  <input 
                    v-model="form.lastName"
                    type="text" 
                    required
                    placeholder="Tu apellido"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <!-- Phone & DNI -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Teléfono / WhatsApp *</label>
                  <input 
                    v-model="form.phone"
                    type="tel" 
                    required
                    placeholder="+54 9 11 1234-5678"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">DNI / CUIT *</label>
                  <input 
                    v-model="form.dni"
                    type="text" 
                    required
                    placeholder="Para factura y seguro"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <!-- Address & Floor -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Dirección y Número *</label>
                  <input 
                    v-model="form.address"
                    type="text" 
                    required
                    placeholder="Av. Alvear 1850"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Piso / Depto</label>
                  <input 
                    v-model="form.apartment"
                    type="text" 
                    placeholder="Piso 4B"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <!-- City, Province, Zip -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Ciudad</label>
                  <input 
                    v-model="form.city"
                    type="text" 
                    required
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Provincia</label>
                  <select 
                    v-model="form.province"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  >
                    <option value="CABA">CABA</option>
                    <option value="Buenos Aires">Buenos Aires (GBA / Interior)</option>
                    <option value="Córdoba">Córdoba</option>
                    <option value="Santa Fe">Santa Fe</option>
                    <option value="Mendoza">Mendoza</option>
                    <option value="Otra">Otra Provincia</option>
                  </select>
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Código Postal</label>
                  <input 
                    v-model="form.postalCode"
                    type="text" 
                    required
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <!-- Shipping Method Selector -->
              <div class="pt-4 border-t border-outline-variant space-y-3">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">
                  Método de Envío
                </label>

                <div 
                  @click="form.shippingType = 'standard'"
                  class="p-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all shadow-2xs"
                  :class="form.shippingType === 'standard' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant'"
                >
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-xl text-primary">local_shipping</span>
                    <div>
                      <p class="font-serif text-sm text-primary font-medium">Envío Estándar a Domicilio (24 a 48 hs)</p>
                      <p class="text-xs text-secondary">Correo Argentino / Andreani con número de seguimiento</p>
                    </div>
                  </div>
                  <span class="font-sans font-bold text-sm text-primary">
                    {{ cartStore.subtotal >= 200000 ? 'GRATIS' : '$3.900' }}
                  </span>
                </div>

                <div 
                  @click="form.shippingType = 'express'"
                  class="p-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all shadow-2xs"
                  :class="form.shippingType === 'express' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant'"
                >
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-xl text-primary">bolt</span>
                    <div>
                      <p class="font-serif text-sm text-primary font-medium">Envío Prioritario Express Gicca (Mismo día / 24 hs)</p>
                      <p class="text-xs text-secondary">Mensajería privada boutique con entrega personalizada</p>
                    </div>
                  </div>
                  <span class="font-sans font-bold text-sm text-primary">$6.500</span>
                </div>
              </div>

              <!-- Submit Step 1 -->
              <div class="pt-4">
                <button 
                  type="submit"
                  class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Continuar al Pago</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>

          <!-- STEP 2: Payment Selection -->
          <div v-if="currentStep === 2" class="space-y-6">
            <div class="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <h2 class="font-serif text-2xl text-primary font-normal">2. Método de Pago</h2>
                <p class="font-sans text-xs text-secondary mt-1">Seleccioná cómo deseas abonar tu orden.</p>
              </div>
              <button 
                @click="currentStep = 1"
                class="font-label text-xs uppercase tracking-widest text-primary underline"
              >
                Volver a datos
              </button>
            </div>

            <div class="space-y-4">
              <!-- Option 1: Transfer (10% OFF) -->
              <div 
                @click="form.paymentMethod = 'transfer'"
                class="p-5 rounded-2xl border cursor-pointer transition-all shadow-2xs"
                :class="form.paymentMethod === 'transfer' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant'"
              >
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-2xl text-tertiary">account_balance</span>
                    <div>
                      <h4 class="font-serif text-base text-primary font-medium">Transferencia Bancaria Inmediata</h4>
                      <p class="text-xs text-secondary">CBU / Alias oficial de Gicca Boutique</p>
                    </div>
                  </div>
                  <span class="bg-secondary-container text-primary font-label text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold">
                    10% OFF EXTRA
                  </span>
                </div>
                <p class="font-sans text-xs text-secondary mt-2 pl-9">
                  Al confirmar tu pedido recibirás los datos de nuestra cuenta bancaria. Tenés 24 horas para enviar el comprobante.
                </p>
              </div>

              <!-- Option 2: Credit / Debit Card -->
              <div 
                @click="form.paymentMethod = 'credit_card'"
                class="p-5 rounded-2xl border cursor-pointer transition-all shadow-2xs"
                :class="form.paymentMethod === 'credit_card' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant'"
              >
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-2xl text-primary">credit_card</span>
                    <div>
                      <h4 class="font-serif text-base text-primary font-medium">Tarjeta de Crédito o Débito</h4>
                      <p class="text-xs text-secondary">Visa, Mastercard, American Express</p>
                    </div>
                  </div>
                  <span class="font-label text-[10px] uppercase tracking-wider text-primary border border-outline-variant px-2.5 py-1 rounded-full">
                    Hasta 6 Cuotas
                  </span>
                </div>
                <div v-if="form.paymentMethod === 'credit_card'" class="mt-4 pt-4 border-t border-outline-variant space-y-3 animate-in fade-in">
                  <input 
                    type="text" 
                    placeholder="Número de Tarjeta (16 dígitos)"
                    class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono"
                  />
                  <div class="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="MM/AA"
                      class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono"
                    />
                    <input 
                      type="text" 
                      placeholder="CVV"
                      class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <!-- Option 3: Mercado Pago -->
              <div 
                @click="form.paymentMethod = 'mercado_pago'"
                class="p-5 rounded-2xl border cursor-pointer transition-all shadow-2xs"
                :class="form.paymentMethod === 'mercado_pago' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant'"
              >
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-2xl text-primary">payments</span>
                  <div>
                    <h4 class="font-serif text-base text-primary font-medium">Mercado Pago</h4>
                    <p class="text-xs text-secondary">Dinero en cuenta o tarjetas guardadas</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Notas especiales para el empaque de regalo (Opcional):
              </label>
              <textarea 
                v-model="form.notes"
                rows="2" 
                placeholder="Ej. Por favor incluir dedicatoria manuscrita: 'Para mamá con amor'"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none"
              ></textarea>
            </div>

            <!-- Confirm Order Button -->
            <div class="pt-4">
              <button 
                @click="handleFinalOrder"
                :disabled="isSubmitting"
                class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                <span v-if="isSubmitting">Procesando orden...</span>
                <span v-else>Confirmar Pedido (${{ finalTotal.toLocaleString('es-AR') }})</span>
                <span v-if="!isSubmitting" class="material-symbols-outlined text-sm">lock</span>
              </button>
            </div>
          </div>

        </div>

        <!-- ORDER SUMMARY COLUMN (5 cols - Rounded 3xl) -->
        <div class="lg:col-span-5 sticky top-28 bg-surface border border-outline-variant rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
          <h3 class="font-serif text-xl text-primary font-normal border-b border-outline-variant pb-3">
            Detalle de tu Pedido
          </h3>

          <!-- Items Mini List -->
          <div class="divide-y divide-outline-variant max-h-64 overflow-y-auto pr-2 scrollbar-thin">
            <div 
              v-for="item in cartStore.items" 
              :key="`${item.id}-${item.size}`"
              class="py-3 flex items-center gap-3"
            >
              <img 
                :src="item.image" 
                :alt="item.name"
                class="w-12 h-14 object-cover bg-surface-container rounded-xl border border-outline-variant flex-shrink-0"
              />
              <div class="flex-grow min-w-0">
                <h4 class="font-serif text-sm text-primary truncate">{{ item.name }}</h4>
                <p class="font-sans text-xs text-secondary">{{ item.quantity }}x {{ item.size }}</p>
              </div>
              <span class="font-sans font-semibold text-sm text-primary">
                ${{ (item.price * item.quantity).toLocaleString('es-AR') }}
              </span>
            </div>
          </div>

          <!-- Courtesy Sample Pill -->
          <div class="bg-surface-container p-3.5 rounded-2xl border border-outline-variant text-xs flex items-center gap-2 text-tertiary">
            <span class="material-symbols-outlined text-base">card_giftcard</span>
            <span class="truncate">Muestra de Cortesía: <strong>{{ cartStore.selectedSample }}</strong></span>
          </div>

          <!-- Price Math -->
          <div class="space-y-2 text-xs font-sans border-t border-b border-outline-variant py-4">
            <div class="flex justify-between text-secondary">
              <span>Subtotal</span>
              <span>${{ cartStore.subtotal.toLocaleString('es-AR') }}</span>
            </div>
            <div v-if="cartStore.discountAmount > 0" class="flex justify-between text-tertiary font-medium">
              <span>Cupón ({{ cartStore.coupon?.code }})</span>
              <span>-${{ cartStore.discountAmount.toLocaleString('es-AR') }}</span>
            </div>
            <div v-if="transferDiscount > 0" class="flex justify-between text-tertiary font-bold">
              <span>Descuento Transferencia (10% OFF)</span>
              <span>-${{ transferDiscount.toLocaleString('es-AR') }}</span>
            </div>
            <div class="flex justify-between text-secondary">
              <span>Envío ({{ form.shippingType === 'express' ? 'Express' : 'Estándar' }})</span>
              <span>{{ shippingCost === 0 ? 'GRATIS' : `$${shippingCost.toLocaleString('es-AR')}` }}</span>
            </div>
          </div>

          <!-- Total Final -->
          <div class="flex justify-between items-baseline">
            <span class="font-serif text-lg text-primary">Total a Pagar</span>
            <span class="font-sans text-2xl font-bold text-primary">
              ${{ finalTotal.toLocaleString('es-AR') }}
            </span>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
