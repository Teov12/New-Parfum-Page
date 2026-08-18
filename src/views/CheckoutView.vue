<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const cartStore = useCartStore()
const toastStore = useToastStore()
const router = useRouter()

const currentStep = ref(1) // 1: Datos & Envío, 2: Pago, 3: Confirmación

// Form state
const form = ref({
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  apartment: '',
  city: '',
  province: 'CABA',
  postalCode: '',
  shippingMethod: 'standard',
  paymentMethod: 'credit_card',
  notes: ''
})

const isSubmitting = ref(false)
const orderNumber = ref(`GIC-${Math.floor(100000 + Math.random() * 900000)}`)

const handleNextToPayment = () => {
  if (!form.value.email || !form.value.firstName || !form.value.lastName || !form.value.address) {
    toastStore.show('Por favor completá todos los campos requeridos de envío.', 'error')
    return
  }
  currentStep.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleFinalizeOrder = () => {
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    currentStep.value = 3
    toastStore.show('¡Orden confirmada con éxito! Te enviamos los detalles por correo.', 'success')
    cartStore.clearCart()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, 1200)
}
</script>

<template>
  <div class="bg-surface-container py-12 min-h-screen">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Checkout Stepper Bar -->
      <div class="max-w-3xl mx-auto mb-10">
        <div class="flex justify-between items-center relative">
          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-outline-variant z-0"></div>
          
          <!-- Step 1 Indicator -->
          <div class="relative z-10 flex flex-col items-center bg-surface-container px-3">
            <div 
              class="w-8 h-8 flex items-center justify-center font-label text-xs font-bold border transition-colors"
              :class="currentStep >= 1 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              1
            </div>
            <span class="font-label text-[10px] uppercase tracking-widest text-primary mt-1">Envío</span>
          </div>

          <!-- Step 2 Indicator -->
          <div class="relative z-10 flex flex-col items-center bg-surface-container px-3">
            <div 
              class="w-8 h-8 flex items-center justify-center font-label text-xs font-bold border transition-colors"
              :class="currentStep >= 2 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              2
            </div>
            <span class="font-label text-[10px] uppercase tracking-widest text-primary mt-1">Pago</span>
          </div>

          <!-- Step 3 Indicator -->
          <div class="relative z-10 flex flex-col items-center bg-surface-container px-3">
            <div 
              class="w-8 h-8 flex items-center justify-center font-label text-xs font-bold border transition-colors"
              :class="currentStep === 3 ? 'bg-tertiary text-on-tertiary border-tertiary' : 'bg-surface text-secondary border-outline'"
            >
              3
            </div>
            <span class="font-label text-[10px] uppercase tracking-widest text-primary mt-1">Confirmación</span>
          </div>
        </div>
      </div>

      <!-- STEP 3: ORDER SUCCESS CONFIRMATION -->
      <div v-if="currentStep === 3" class="max-w-2xl mx-auto bg-surface border border-primary p-8 md:p-12 text-center space-y-6 animate-in fade-in">
        <div class="w-16 h-16 bg-surface-container mx-auto flex items-center justify-center border border-primary text-primary">
          <span class="material-symbols-outlined text-4xl">check_circle</span>
        </div>

        <div>
          <span class="font-label text-xs uppercase tracking-[0.2em] text-secondary">Orden #{{ orderNumber }}</span>
          <h1 class="font-serif text-3xl sm:text-4xl text-primary font-normal mt-2">
            ¡Gracias por tu compra, {{ form.firstName }}!
          </h1>
          <p class="font-sans text-secondary text-sm max-w-md mx-auto mt-2 leading-relaxed">
            Hemos recibido tu pedido correctamente. En breve recibirás un correo en <strong>{{ form.email }}</strong> con la confirmación y el código de seguimiento postal.
          </p>
        </div>

        <div class="bg-surface-container p-6 text-left border border-outline-variant space-y-3 font-sans text-xs text-secondary">
          <p class="font-label text-xs uppercase tracking-widest text-primary font-bold">Detalle de Entrega:</p>
          <p><strong>Destinatario:</strong> {{ form.firstName }} {{ form.lastName }} ({{ form.phone }})</p>
          <p><strong>Dirección:</strong> {{ form.address }} {{ form.apartment }}, {{ form.city }}, {{ form.province }} (CP {{ form.postalCode }})</p>
          <p><strong>Método de Pago:</strong> {{ form.paymentMethod === 'credit_card' ? 'Tarjeta de Crédito / Débito' : 'Transferencia Bancaria (10% OFF)' }}</p>
        </div>

        <div class="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink 
            to="/"
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 border border-primary-container hover:bg-surface hover:text-primary-container transition-all"
          >
            Volver a la Tienda
          </RouterLink>
          <a 
            :href="`https://wa.me/5491158249910?text=${encodeURIComponent(`Hola Gicca! Acabo de realizar la orden #${orderNumber}. Quería consultar sobre el seguimiento de mi pedido.`)}`"
            target="_blank"
            class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 border border-primary hover:bg-surface-container transition-all flex items-center justify-center gap-2"
          >
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>

      <!-- STEPS 1 & 2 LAYOUT: FORM + SUMMARY -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        <!-- Left Checkout Form (7 cols) -->
        <div class="lg:col-span-7 space-y-8">
          
          <!-- STEP 1: SHIPPING & CONTACT -->
          <div v-if="currentStep === 1" class="bg-surface border border-outline-variant p-6 sm:p-8 space-y-6">
            
            <div>
              <h2 class="font-serif text-2xl text-primary font-normal">Información de Contacto</h2>
              <p class="font-sans text-xs text-secondary mt-0.5">Para enviarte el recibo y las alertas de envío.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Email *
                </label>
                <input 
                  v-model="form.email"
                  type="email" 
                  placeholder="ejemplo@correo.com"
                  required
                  class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Nombre *
                </label>
                <input 
                  v-model="form.firstName"
                  type="text" 
                  placeholder="Tu nombre"
                  required
                  class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Apellido *
                </label>
                <input 
                  v-model="form.lastName"
                  type="text" 
                  placeholder="Tu apellido"
                  required
                  class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input 
                  v-model="form.phone"
                  type="tel" 
                  placeholder="+54 9 11 ..."
                  required
                  class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div class="border-t border-outline-variant pt-6">
              <h2 class="font-serif text-2xl text-primary font-normal mb-1">Dirección de Entrega</h2>
              <p class="font-sans text-xs text-secondary mb-4">Entregamos en cajas discretas blindadas de alta protección.</p>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="sm:col-span-2">
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                    Calle y Número *
                  </label>
                  <input 
                    v-model="form.address"
                    type="text" 
                    placeholder="Av. Alvear 1850"
                    required
                    class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                    Piso / Depto (Opcional)
                  </label>
                  <input 
                    v-model="form.apartment"
                    type="text" 
                    placeholder="Piso 4B"
                    class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                    Código Postal *
                  </label>
                  <input 
                    v-model="form.postalCode"
                    type="text" 
                    placeholder="1425"
                    required
                    class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                    Ciudad / Localidad *
                  </label>
                  <input 
                    v-model="form.city"
                    type="text" 
                    placeholder="Buenos Aires"
                    required
                    class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                    Provincia *
                  </label>
                  <select 
                    v-model="form.province"
                    class="w-full bg-surface-container border border-outline-variant p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                  >
                    <option>CABA</option>
                    <option>Buenos Aires</option>
                    <option>Córdoba</option>
                    <option>Santa Fe</option>
                    <option>Mendoza</option>
                    <option>Neuquén</option>
                    <option>Entre Ríos</option>
                    <option>Tucumán</option>
                    <option>Salta</option>
                    <option>Otra Provincia</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Continue CTA -->
            <div class="pt-4 flex justify-between items-center border-t border-outline-variant">
              <RouterLink to="/carrito" class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline">
                ← Volver al carrito
              </RouterLink>
              <button 
                @click="handleNextToPayment"
                class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 border border-primary-container hover:bg-inverse-surface transition-all flex items-center gap-2"
              >
                <span>Continuar al Pago</span>
                <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

          </div>

          <!-- STEP 2: PAYMENT METHOD -->
          <div v-if="currentStep === 2" class="bg-surface border border-outline-variant p-6 sm:p-8 space-y-6">
            
            <div class="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <h2 class="font-serif text-2xl text-primary font-normal">Método de Pago</h2>
                <p class="font-sans text-xs text-secondary mt-0.5">Seleccioná cómo deseas abonar tu orden.</p>
              </div>
              <button @click="currentStep = 1" class="text-xs font-label uppercase tracking-widest text-primary underline">
                Modificar Envío
              </button>
            </div>

            <!-- Payment Options -->
            <div class="space-y-4">
              <!-- Credit / Debit Card -->
              <label 
                class="flex items-start gap-4 p-4 border cursor-pointer transition-all"
                :class="form.paymentMethod === 'credit_card' ? 'border-primary bg-surface-container-low ring-1 ring-primary' : 'border-outline-variant hover:border-primary'"
              >
                <input type="radio" value="credit_card" v-model="form.paymentMethod" class="mt-1 accent-primary" />
                <div class="flex-grow">
                  <div class="flex justify-between items-baseline">
                    <span class="font-label text-xs uppercase tracking-widest text-primary font-bold">Tarjeta de Crédito / Débito (Mercado Pago)</span>
                    <span class="font-label text-[10px] bg-secondary-container px-2 py-0.5 uppercase text-primary font-bold">Hasta 6 cuotas</span>
                  </div>
                  <p class="font-sans text-xs text-secondary mt-1">Visa, Mastercard, American Express, Cabal y dinero en cuenta.</p>
                </div>
              </label>

              <!-- Bank Transfer (10% OFF) -->
              <label 
                class="flex items-start gap-4 p-4 border cursor-pointer transition-all"
                :class="form.paymentMethod === 'transfer' ? 'border-primary bg-surface-container-low ring-1 ring-primary' : 'border-outline-variant hover:border-primary'"
              >
                <input type="radio" value="transfer" v-model="form.paymentMethod" class="mt-1 accent-primary" />
                <div class="flex-grow">
                  <div class="flex justify-between items-baseline">
                    <span class="font-label text-xs uppercase tracking-widest text-primary font-bold">Transferencia Bancaria Directa</span>
                    <span class="font-label text-[10px] bg-primary-container text-on-primary px-2 py-0.5 uppercase font-bold">10% OFF EXTRA</span>
                  </div>
                  <p class="font-sans text-xs text-secondary mt-1">Te mostraremos el CBU / Alias en la confirmación para enviar el comprobante.</p>
                </div>
              </label>
            </div>

            <!-- Security Notice -->
            <div class="p-4 bg-surface-container border border-outline-variant flex items-center gap-3 text-xs font-sans text-secondary">
              <span class="material-symbols-outlined text-primary text-xl">lock</span>
              <p>Tu información de pago está totalmente protegida mediante estándares bancarios internacionales.</p>
            </div>

            <!-- Submit Final Button -->
            <div class="pt-4 flex justify-between items-center border-t border-outline-variant">
              <button @click="currentStep = 1" class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline">
                ← Volver a datos
              </button>
              <button 
                @click="handleFinalizeOrder"
                :disabled="isSubmitting"
                class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-4 border border-primary-container hover:bg-inverse-surface transition-all flex items-center gap-2 font-bold shadow-md disabled:opacity-50"
              >
                <span v-if="isSubmitting">Procesando Orden...</span>
                <span v-else>Confirmar y Pagar (${{ cartStore.total.toLocaleString('es-AR') }})</span>
                <span class="material-symbols-outlined text-sm">lock</span>
              </button>
            </div>

          </div>

        </div>

        <!-- Right Mini Summary Box (5 cols) -->
        <aside class="lg:col-span-5 bg-surface border border-primary p-6 sm:p-8 space-y-6 shadow-sm sticky top-24">
          <h3 class="font-serif text-xl text-primary font-normal border-b border-outline-variant pb-3">
            Resumen de tu Orden ({{ cartStore.totalItems }})
          </h3>

          <!-- Items Thumbnail List -->
          <div class="divide-y divide-outline-variant max-h-64 overflow-y-auto pr-1">
            <div 
              v-for="item in cartStore.items" 
              :key="`${item.id}-${item.size}`"
              class="py-3 flex items-center gap-3 first:pt-0"
            >
              <img :src="item.image" :alt="item.name" class="w-12 h-14 object-cover border border-outline-variant bg-surface-container flex-shrink-0" />
              <div class="min-w-0 flex-grow">
                <p class="font-serif text-sm text-primary font-medium truncate">{{ item.name }}</p>
                <p class="font-label text-[10px] text-secondary uppercase">{{ item.size }} • Cant: {{ item.quantity }}</p>
              </div>
              <span class="font-sans font-bold text-sm text-primary flex-shrink-0">
                ${{ (item.price * item.quantity).toLocaleString('es-AR') }}
              </span>
            </div>
          </div>

          <!-- Courtesy Sample Info -->
          <div class="bg-surface-container p-3 border border-outline-variant flex items-center gap-2 text-xs font-sans text-secondary">
            <span class="material-symbols-outlined text-tertiary">card_giftcard</span>
            <span class="truncate">Muestra de cortesía: <strong>{{ cartStore.selectedSample }}</strong></span>
          </div>

          <!-- Totals Breakdown -->
          <div class="space-y-2 font-sans text-sm border-t border-outline-variant pt-4">
            <div class="flex justify-between text-secondary">
              <span>Subtotal:</span>
              <span>${{ cartStore.subtotal.toLocaleString('es-AR') }}</span>
            </div>
            <div v-if="cartStore.discountAmount > 0" class="flex justify-between text-tertiary font-medium">
              <span>Descuento:</span>
              <span>-${{ cartStore.discountAmount.toLocaleString('es-AR') }}</span>
            </div>
            <div class="flex justify-between text-secondary">
              <span>Envío:</span>
              <span>{{ cartStore.shippingCost === 0 ? 'GRATIS' : `$${cartStore.shippingCost.toLocaleString('es-AR')}` }}</span>
            </div>
            <div class="flex justify-between items-baseline border-t border-primary pt-3 font-serif text-xl text-primary font-bold">
              <span>Total a Pagar:</span>
              <span class="font-sans text-2xl">${{ cartStore.total.toLocaleString('es-AR') }}</span>
            </div>
          </div>
        </aside>

      </div>

    </div>
  </div>
</template>
