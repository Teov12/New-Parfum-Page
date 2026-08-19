<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const cartStore = useCartStore()
const toastStore = useToastStore()
const router = useRouter()

const couponInput = ref('')
const couponMessage = ref(null)

const sampleOptions = [
  { id: 1, name: 'YSL Libre Eau de Parfum (2ml)', brand: 'Yves Saint Laurent', family: 'Floral Ámbar' },
  { id: 2, name: 'Dior Sauvage Parfum (2ml)', brand: 'Dior', family: 'Amaderada Cítrica' },
  { id: 3, name: 'Baccarat Rouge 540 Extrait (1.5ml)', brand: 'Maison Francis Kurkdjian', family: 'Oriental Floral' },
  { id: 4, name: 'Coco Mademoiselle EDP (2ml)', brand: 'Chanel', family: 'Floral Chipre' }
]

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

        <h1 class="font-serif text-4xl md:text-5xl text-primary font-normal tracking-tight">
          Bolsa de Compras
        </h1>
      </div>

      <!-- If Cart is Empty -->
      <div v-if="cartStore.items.length === 0" class="bg-surface border border-outline-variant rounded-3xl p-16 text-center shadow-xs">
        <span class="material-symbols-outlined text-6xl text-outline mb-4">shopping_bag</span>
        <h2 class="font-serif text-3xl text-primary font-normal mb-2">Tu bolsa está actualmente vacía</h2>
        <p class="font-sans text-secondary max-w-md mx-auto mb-8 leading-relaxed">
          Explorá nuestras colecciones de fragancias de autor, clásicos del lujo y descubrí tu próxima firma olfativa.
        </p>
        <RouterLink 
          to="/catalogo"
          class="inline-flex items-center gap-2 bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-9 py-4 rounded-full hover:bg-surface hover:text-primary-container border border-primary-container transition-all shadow-xs"
        >
          <span>Explorar Colección de Perfumes</span>
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </RouterLink>
      </div>

      <!-- If Cart has Items -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Cart Items List (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Free Shipping Progress Box (Rounded 3xl) -->
          <div class="bg-surface border border-outline-variant rounded-3xl p-6 shadow-xs">
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

          <!-- Items Table / Cards (Rounded 3xl) -->
          <div class="bg-surface border border-outline-variant rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div class="border-b border-outline-variant pb-4 flex justify-between items-center">
              <h2 class="font-serif text-xl text-primary font-medium">
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
                    class="w-20 h-24 object-cover bg-surface-container rounded-2xl border border-outline-variant flex-shrink-0"
                  />
                  <div>
                    <span class="font-label text-xs uppercase tracking-widest text-secondary">{{ item.brand }}</span>
                    <RouterLink :to="`/producto/${item.slug}`" class="block font-serif text-lg text-primary font-medium hover:text-primary-container">
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
                  <!-- Counter -->
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

          <!-- Courtesy Sample Selection Card (Rounded 3xl) -->
          <div class="bg-surface border border-outline-variant rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl text-tertiary">card_giftcard</span>
              <div>
                <h3 class="font-serif text-lg text-primary font-medium">Muestra de Cortesía Sin Cargo</h3>
                <p class="font-sans text-xs text-secondary">Cada pedido incluye una muestra de perfumería exclusiva de regalo.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div 
                v-for="sample in sampleOptions" 
                :key="sample.id"
                @click="cartStore.selectSample(sample.name)"
                class="p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center shadow-2xs"
                :class="cartStore.selectedSample === sample.name 
                  ? 'bg-surface-container border-primary ring-1 ring-primary' 
                  : 'bg-surface border-outline-variant hover:border-outline'"
              >
                <div>
                  <span class="font-label text-[10px] uppercase tracking-widest text-secondary block">{{ sample.brand }}</span>
                  <p class="font-serif text-sm text-primary font-medium">{{ sample.name }}</p>
                  <p class="text-xs text-secondary">{{ sample.family }}</p>
                </div>
                <span 
                  class="material-symbols-outlined text-xl"
                  :class="cartStore.selectedSample === sample.name ? 'text-primary' : 'text-outline'"
                >
                  {{ cartStore.selectedSample === sample.name ? 'radio_button_checked' : 'radio_button_unchecked' }}
                </span>
              </div>
            </div>
          </div>

        </div>

        <!-- Sticky Order Summary Sidebar (4 cols - Rounded 3xl) -->
        <div class="lg:col-span-4 sticky top-28 space-y-6">
          
          <div class="bg-surface border border-outline-variant rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
            <h2 class="font-serif text-2xl text-primary font-normal border-b border-outline-variant pb-4">
              Resumen de Compra
            </h2>

            <!-- Coupon Input (Pill) -->
            <div class="space-y-2">
              <label class="font-label text-xs uppercase tracking-widest text-primary font-bold">
                Cupón de Descuento
              </label>
              <div class="flex gap-2">
                <input 
                  v-model="couponInput"
                  type="text" 
                  placeholder="GICCA10 / LUJO15"
                  class="flex-grow bg-surface-container border border-outline-variant rounded-full px-4 py-2.5 text-xs font-label uppercase tracking-widest text-primary focus:border-primary focus:outline-none"
                  @keyup.enter="handleApplyCoupon"
                />
                <button 
                  @click="handleApplyCoupon"
                  class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-inverse-surface transition-colors shadow-2xs"
                >
                  Aplicar
                </button>
              </div>

              <!-- Active coupon badge -->
              <div v-if="cartStore.coupon" class="bg-surface-container p-3 rounded-2xl border border-outline-variant flex justify-between items-center text-xs">
                <span class="text-tertiary font-semibold flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  {{ cartStore.coupon.label }} ({{ cartStore.coupon.code }})
                </span>
                <button @click="cartStore.removeCoupon" class="text-xs text-secondary hover:text-error underline">
                  Quitar
                </button>
              </div>
            </div>

            <!-- Price Breakdown -->
            <div class="space-y-3 font-sans text-sm border-t border-b border-outline-variant py-4">
              <div class="flex justify-between text-secondary">
                <span>Subtotal</span>
                <span class="text-primary font-medium">${{ cartStore.subtotal.toLocaleString('es-AR') }}</span>
              </div>
              <div v-if="cartStore.discountAmount > 0" class="flex justify-between text-tertiary font-medium">
                <span>Descuento</span>
                <span>-${{ cartStore.discountAmount.toLocaleString('es-AR') }}</span>
              </div>
              <div class="flex justify-between text-secondary">
                <span>Envío estimado</span>
                <span class="font-medium text-primary">
                  {{ cartStore.shippingCost === 0 ? '¡GRATIS!' : `$${cartStore.shippingCost.toLocaleString('es-AR')}` }}
                </span>
              </div>
            </div>

            <!-- Total -->
            <div class="flex justify-between items-baseline">
              <div>
                <span class="font-serif text-xl text-primary font-normal">Total a Pagar</span>
                <p class="text-xs font-sans text-secondary">IVA incluido</p>
              </div>
              <div class="text-right">
                <span class="font-sans text-3xl font-bold text-primary">
                  ${{ cartStore.total.toLocaleString('es-AR') }}
                </span>
                <p class="font-label text-[11px] text-secondary uppercase tracking-wider">
                  Hasta 3 cuotas sin interés
                </p>
              </div>
            </div>

            <!-- Primary Action Buttons (Pill Buttons) -->
            <div class="space-y-3 pt-2">
              <button 
                @click="proceedToCheckout"
                class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Iniciar Compra Segura</span>
                <span class="material-symbols-outlined text-sm">lock</span>
              </button>

              <a 
                :href="`https://wa.me/5491158249910?text=${encodeURIComponent('Hola Gicca Perfumes, quiero consultar sobre mi pedido de: ' + cartStore.items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(', '))}`"
                target="_blank"
                class="w-full bg-surface text-primary font-label text-xs uppercase tracking-widest py-3.5 rounded-full border border-outline hover:bg-surface-container transition-all flex items-center justify-center gap-2 text-center shadow-2xs"
              >
                <span>Finalizar por WhatsApp con Sommelier</span>
              </a>
            </div>

          </div>

          <!-- Trust card -->
          <div class="p-4 bg-surface rounded-2xl border border-outline-variant flex items-center gap-3 text-xs font-sans text-secondary shadow-2xs">
            <span class="material-symbols-outlined text-xl text-primary">security</span>
            <span>Tus datos de pago están encriptados y procesados de manera segura.</span>
          </div>

        </div>

      </div>

    </div>
  </div>
</template>
