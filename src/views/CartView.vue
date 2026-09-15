<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useShippingStore } from '@/stores/shipping'
import { useToastStore } from '@/stores/toast'

const cartStore = useCartStore()
const shippingStore = useShippingStore()
const toastStore = useToastStore()
const router = useRouter()

const couponInput = ref('')
const couponMessage = ref(null)

const postalCodeInput = ref(shippingStore.postalCode || '')
const isCalculatingShipping = ref(false)

let cartQuoteTimeout = null

const handleCalculateShipping = async () => {
  const clean = (postalCodeInput.value || '').toString().trim().replace(/\D/g, '')
  if (clean.length < 4) {
    toastStore.show('Ingresá un código postal válido de 4 dígitos.', 'error')
    return
  }
  isCalculatingShipping.value = true
  const res = await shippingStore.calculateShipping(clean, cartStore.subtotal)
  isCalculatingShipping.value = false
  if (res && res.success) {
    toastStore.show(`Tarifas calculadas para ${res.destination.zone}`, 'success')
  } else {
    toastStore.show(shippingStore.error || 'Error al cotizar envío con Andreani', 'error')
  }
}

const onPostalCodeInput = () => {
  clearTimeout(cartQuoteTimeout)
  const clean = (postalCodeInput.value || '').toString().trim().replace(/\D/g, '')
  if (clean.length >= 4) {
    cartQuoteTimeout = setTimeout(() => {
      handleCalculateShipping()
    }, 350)
  }
}

const handleApplyCoupon = () => {
  if (!couponInput.value.trim()) return
  const result = cartStore.applyCoupon(couponInput.value)
  couponMessage.value = result
  if (result.success) {
    toastStore.show(result.message, 'success')
    couponInput.value = ''
  } else {
    toastStore.show(result.message, 'error')
  }
}

const proceedToCheckout = () => {
  router.push('/checkout')
}
</script>

<template>
  <div class="bg-surface-container py-12">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Breadcrumbs & Header -->
      <div class="mb-8">
        <nav class="font-label text-xs uppercase tracking-widest text-secondary flex items-center gap-2 mb-4">
          <RouterLink to="/" class="hover:text-primary transition-colors">Inicio</RouterLink>
          <span>/</span>
          <span class="text-primary font-bold">Bolsa de Compras</span>
        </nav>

        <h1 class="font-sans text-4xl md:text-5xl text-primary font-normal tracking-tight">
          Bolsa de Compras
        </h1>
      </div>

      <!-- If Cart is Empty -->
      <div v-if="cartStore.items.length === 0" class="bg-surface border border-outline-variant rounded-xs p-16 text-center shadow-xs">
        <span class="material-symbols-outlined text-6xl text-outline mb-4">shopping_bag</span>
        <h2 class="font-sans text-3xl text-primary font-normal mb-2">Tu bolsa está actualmente vacía</h2>
        <p class="font-sans text-secondary max-w-md mx-auto mb-8 leading-relaxed">
          Explorá nuestro catálogo de perfumes importados y fragancias árabes al mejor precio.
        </p>
        <RouterLink 
          to="/catalogo"
          class="inline-flex items-center gap-2 bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-9 py-4 rounded-full hover:bg-surface hover:text-primary-container border border-primary-container transition-all shadow-xs"
        >
          <span>Ver Catálogo de Perfumes</span>
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- If Cart has Items -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Cart Items List (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Free Shipping Progress Box -->
          <div class="bg-surface border border-outline-variant rounded-xs p-6 shadow-xs">
            <div class="flex justify-between items-center text-xs font-label uppercase tracking-wider mb-2 text-primary">
              <span v-if="cartStore.amountForFreeShipping > 0">
                Faltan <strong>${{ cartStore.amountForFreeShipping.toLocaleString('es-AR') }}</strong> para disfrutar de <strong>Envío Gratis</strong> en todo el país.
              </span>
              <span v-else class="text-tertiary font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-base">verified</span>
                ¡Tu orden califica para Envío Express Gratuito a Domicilio!
              </span>
              <span class="font-semibold">{{ cartStore.freeShippingProgress }}%</span>
            </div>
            <div class="w-full bg-secondary-container h-2.5 rounded-full overflow-hidden">
              <div 
                class="bg-primary-container h-full rounded-full transition-all duration-500"
                :style="{ width: `${cartStore.freeShippingProgress}%` }"
              ></div>
            </div>
          </div>

          <!-- Items Table / Cards -->
          <div class="bg-surface border border-outline-variant rounded-xs p-6 sm:p-8 space-y-6 shadow-xs">
            <div class="border-b border-outline-variant pb-4 flex justify-between items-center">
              <h2 class="font-sans text-xl text-primary font-medium">
                Artículos en tu pedido ({{ cartStore.totalItems }})
              </h2>
              <button 
                @click="cartStore.clearCart"
                class="font-label text-xs uppercase tracking-wider text-error hover:underline"
              >
                Vaciar bolsa
              </button>
            </div>

            <div class="divide-y divide-outline-variant">
              <div 
                v-for="item in cartStore.items" 
                :key="`${item.id}-${item.size}`"
                class="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"
              >
                <!-- Image & Info -->
                <div class="flex gap-4 items-center">
                  <img 
                    :src="item.image" 
                    :alt="item.name"
                    class="w-20 h-24 object-cover bg-surface-container rounded-xs border border-outline-variant flex-shrink-0"
                  />
                  <div>
                    <span class="font-label text-xs uppercase tracking-widest text-secondary">{{ item.brand }}</span>
                    <RouterLink :to="`/producto/${item.slug}`" class="block font-sans text-lg text-primary font-medium hover:text-primary-container">
                      {{ item.name }}
                    </RouterLink>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="font-label text-xs bg-surface-container px-3 py-0.5 rounded-full border border-outline-variant">
                        {{ item.size }}
                      </span>
                      <span class="text-xs text-secondary">{{ item.concentration }}</span>
                    </div>
                  </div>
                </div>

                <!-- Quantity & Price -->
                <div class="flex items-center justify-between w-full sm:w-auto sm:gap-8">
                  <!-- Counter (Píldora) -->
                  <div class="inline-flex items-center border border-outline-variant rounded-full bg-surface shadow-2xs overflow-hidden">
                    <button 
                      @click="cartStore.updateQuantity(item.id, item.size, item.quantity - 1)"
                      class="px-3 py-1 text-primary hover:bg-surface-container transition-colors text-sm font-bold"
                    >
                      -
                    </button>
                    <span class="px-3 py-1 font-label text-xs font-bold text-primary min-w-[2rem] text-center">
                      {{ item.quantity }}
                    </span>
                    <button 
                      @click="cartStore.updateQuantity(item.id, item.size, item.quantity + 1)"
                      class="px-3 py-1 text-primary hover:bg-surface-container transition-colors text-sm font-bold"
                    >
                      +
                    </button>
                  </div>

                  <!-- Price -->
                  <div class="text-right">
                    <p class="font-sans font-bold text-lg text-primary">
                      ${{ (item.price * item.quantity).toLocaleString('es-AR') }}
                    </p>
                    <p v-if="item.quantity > 1" class="text-[11px] text-secondary">
                      ${{ item.price.toLocaleString('es-AR') }} c/u
                    </p>
                  </div>

                  <!-- Remove Button -->
                  <button 
                    @click="cartStore.removeItem(item.id, item.size)"
                    class="text-secondary hover:text-error transition-colors p-1"
                    title="Eliminar producto"
                  >
                    <span class="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Sticky Order Summary Sidebar (4 cols) -->
        <div class="lg:col-span-4 sticky top-28 space-y-6">
          
          <div class="bg-surface border border-outline-variant rounded-xs p-6 sm:p-8 space-y-6 shadow-md">
            <h2 class="font-sans text-2xl text-primary font-normal border-b border-outline-variant pb-4">
              Resumen de Compra
            </h2>

            <!-- Shipping Calculator Andreani -->
            <div class="space-y-2 border-b border-outline-variant pb-4">
              <div class="flex justify-between items-center">
                <label class="font-label text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-secondary">local_shipping</span>
                  <span>Calcular Envío Andreani</span>
                </label>
              </div>
              <div class="flex gap-2">
                <input 
                  v-model="postalCodeInput"
                  type="text" 
                  placeholder="Código Postal (ej. 5000 o 1414)"
                  maxlength="8"
                  class="bg-surface-container border border-outline-variant rounded-xs px-3 py-2 text-xs font-sans w-full focus:outline-none focus:border-primary"
                  @input="onPostalCodeInput"
                  @keyup.enter="handleCalculateShipping"
                />
                <button 
                  @click="handleCalculateShipping"
                  :disabled="isCalculatingShipping"
                  class="bg-surface text-primary border border-outline font-label text-[11px] uppercase tracking-wider px-3.5 py-2 rounded-xs hover:bg-surface-container transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  {{ isCalculatingShipping ? '...' : 'Calcular' }}
                </button>
              </div>

              <div v-if="shippingStore.destination" class="space-y-2 pt-1">
                <div class="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-xs flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                  <span>Zona: <strong>{{ shippingStore.destination.zone }}</strong></span>
                </div>

                <!-- Selectable Options List in Cart View -->
                <div v-if="shippingStore.options.length > 0" class="space-y-1.5">
                  <div 
                    v-for="opt in shippingStore.options" 
                    :key="opt.id"
                    @click="shippingStore.selectOption(opt.id)"
                    class="p-2 rounded-xs border cursor-pointer flex justify-between items-center text-xs transition-all"
                    :class="shippingStore.selectedOptionId === opt.id ? 'bg-surface-container border-primary font-medium ring-1 ring-primary' : 'bg-surface border-outline-variant hover:border-outline'"
                  >
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-sm text-primary">
                        {{ opt.type === 'sucursal' ? 'store' : (opt.type === 'urgente' ? 'bolt' : 'local_shipping') }}
                      </span>
                      <span class="text-[11px]">{{ opt.name }}</span>
                    </div>
                    <span class="font-bold text-xs" :class="opt.isFree ? 'text-emerald-700' : 'text-primary'">
                      {{ opt.price === 0 ? '¡GRATIS!' : `$${opt.price.toLocaleString('es-AR')} (Aprox.)` }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Price Breakdown -->
            <div class="space-y-3 font-sans text-sm border-b border-outline-variant pb-4">
              <div class="flex justify-between text-secondary">
                <span>Subtotal</span>
                <span class="text-primary font-medium">${{ cartStore.subtotal.toLocaleString('es-AR') }}</span>
              </div>
              <div class="flex justify-between text-secondary">
                <span>Envío ({{ shippingStore.selectedOption?.carrier || 'Andreani' }})</span>
                <span class="font-medium" :class="cartStore.shippingCost === 0 ? 'text-emerald-700' : 'text-primary'">
                  {{ cartStore.shippingCost === 0 ? '¡GRATIS!' : `$${cartStore.shippingCost.toLocaleString('es-AR')} (Aprox.)` }}
                </span>
              </div>
            </div>

            <!-- Total -->
            <div class="space-y-2.5">
              <div class="flex justify-between items-baseline">
                <div>
                  <span class="font-sans text-lg text-primary font-normal">Total con Transferencia</span>
                  <p class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">20% OFF Transferencia</p>
                </div>
                <div class="text-right">
                  <span class="font-sans text-2xl sm:text-3xl font-bold text-primary">
                    ${{ (Math.round(cartStore.subtotal * 0.8) + cartStore.shippingCost).toLocaleString('es-AR') }}
                  </span>
                </div>
              </div>

              <div class="p-3 bg-surface-container rounded-xs border border-outline-variant text-xs text-secondary space-y-1">
                <div class="flex justify-between text-primary font-medium">
                  <span>Precio de Lista (con Tarjeta):</span>
                  <span>${{ cartStore.total.toLocaleString('es-AR') }}</span>
                </div>
                <p class="text-[11px] text-secondary">
                  Hasta <strong>3 y 6 cuotas fijas sin interés</strong> con todas las tarjetas bancarias.
                </p>
              </div>
            </div>

            <!-- Primary Action Buttons (Píldoras) -->
            <div class="space-y-3 pt-2">
              <button 
                @click="proceedToCheckout"
                class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Iniciar Compra Segura</span>
                <span class="material-symbols-outlined text-sm">lock</span>
              </button>

              <a 
                :href="`https://wa.me/5493564622055?text=${encodeURIComponent('Hola Gicca Perfumes, quiero consultar sobre mi pedido de: ' + cartStore.items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(', '))}`"
                target="_blank"
                class="w-full bg-surface text-primary font-label text-xs uppercase tracking-widest py-3.5 rounded-full border border-outline hover:bg-surface-container transition-all flex items-center justify-center gap-2 text-center shadow-2xs"
              >
                <span>Finalizar pedido por WhatsApp</span>
              </a>
            </div>

          </div>

          <!-- Trust card -->
          <div class="p-4 bg-surface rounded-xs border border-outline-variant flex items-center gap-3 text-xs font-sans text-secondary shadow-2xs">
            <span class="material-symbols-outlined text-xl text-primary">security</span>
            <span>Tus datos de pago están encriptados y procesados de manera segura.</span>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>
