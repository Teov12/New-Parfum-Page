<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const cartStore = useCartStore()
const toastStore = useToastStore()
const router = useRouter()

const couponInput = ref('')
const couponMessage = ref(null)

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

const goToCheckout = () => {
  cartStore.closeDrawer()
  router.push('/checkout')
}

const goToCartPage = () => {
  cartStore.closeDrawer()
  router.push('/carrito')
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div 
      v-if="cartStore.isDrawerOpen" 
      class="fixed inset-0 z-50 bg-primary/50 backdrop-blur-xs transition-opacity duration-300"
      @click="cartStore.closeDrawer"
    ></div>

    <!-- Drawer Panel: Estructura arquitectónica limpia con botones ergonómicos -->
    <aside 
      class="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-surface border-l border-outline-variant shadow-2xl flex flex-col transition-transform duration-300 ease-in-out overflow-hidden"
      :class="cartStore.isDrawerOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Header -->
      <div class="p-6 border-b border-outline-variant flex justify-between items-center bg-surface">
        <div>
          <h2 class="font-sans text-2xl text-primary font-medium tracking-tight">Tu Bolsa</h2>
          <p class="font-label text-label-sm text-secondary uppercase tracking-wider">
            {{ cartStore.totalItems }} {{ cartStore.totalItems === 1 ? 'artículo' : 'artículos' }}
          </p>
        </div>
        <button 
          @click="cartStore.closeDrawer"
          class="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-primary transition-colors"
          aria-label="Cerrar bolsa"
        >
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      <!-- Free Shipping Goal Banner (Barra Píldora) -->
      <div class="px-6 py-3.5 bg-surface-container border-b border-outline-variant">
        <div class="flex justify-between items-center text-xs font-label uppercase tracking-wider mb-2 text-primary">
          <span v-if="cartStore.amountForFreeShipping > 0">
            Faltan <strong>${{ cartStore.amountForFreeShipping.toLocaleString('es-AR') }}</strong> para Envío Gratis
          </span>
          <span v-else class="text-tertiary font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">verified</span>
            ¡Felicitaciones! Tenés Envío Gratis
          </span>
          <span class="font-semibold">{{ cartStore.freeShippingProgress }}%</span>
        </div>
        <div class="w-full bg-secondary-container h-2 rounded-full overflow-hidden">
          <div 
            class="bg-primary-container h-full rounded-full transition-all duration-500"
            :style="{ width: `${cartStore.freeShippingProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- Items List -->
      <div class="flex-grow overflow-y-auto p-6 space-y-4">
        <div v-if="cartStore.items.length === 0" class="h-full flex flex-col items-center justify-center text-center py-16">
          <span class="material-symbols-outlined text-5xl text-outline mb-4">shopping_bag</span>
          <h3 class="font-sans text-xl text-primary mb-2">Tu bolsa está vacía</h3>
          <p class="font-sans text-sm text-secondary max-w-xs mb-8">
            Descubrí nuestra exclusiva selección de fragancias de lujo y perfumería de autor.
          </p>
          <button 
            @click="goToCartPage; cartStore.closeDrawer(); router.push('/catalogo')"
            class="bg-primary-container text-on-primary font-label text-label-sm px-8 py-3.5 uppercase tracking-widest rounded-full hover:bg-surface hover:text-primary-container border border-primary-container transition-all shadow-xs"
          >
            Explorar Catálogo
          </button>
        </div>

        <div 
          v-for="item in cartStore.items" 
          :key="`${item.id}-${item.size}`"
          class="p-4 bg-surface-container-low rounded-xs border border-outline-variant flex gap-4"
        >
          <!-- Thumbnail (Encuadre Recto) -->
          <img 
            :src="item.image" 
            :alt="item.name"
            class="w-20 h-24 object-cover bg-surface-lowest rounded-xs border border-outline-variant flex-shrink-0"
          />

          <!-- Details -->
          <div class="flex-grow flex flex-col justify-between min-w-0">
            <div>
              <div class="flex justify-between items-start gap-2">
                <div>
                  <span class="font-label text-[10px] text-secondary uppercase tracking-widest">{{ item.brand }}</span>
                  <h4 class="font-sans text-base text-primary font-medium leading-snug line-clamp-1">
                    {{ item.name }}
                  </h4>
                </div>
                <button 
                  @click="cartStore.removeItem(item.id, item.size)"
                  class="text-secondary hover:text-error transition-colors p-1"
                  title="Eliminar artículo"
                >
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>

              <div class="flex items-center gap-2 mt-1">
                <span class="font-label text-xs bg-surface px-2.5 py-0.5 rounded-full border border-outline-variant text-primary">
                  {{ item.size }}
                </span>
                <span class="text-xs text-secondary">{{ item.concentration }}</span>
              </div>
            </div>

            <!-- Price & Quantity Adjuster (Píldora) -->
            <div class="flex justify-between items-center mt-3 pt-2">
              <div class="inline-flex items-center border border-outline-variant rounded-full bg-surface overflow-hidden shadow-2xs">
                <button 
                  @click="cartStore.updateQuantity(item.id, item.size, item.quantity - 1)"
                  class="px-3 py-1 text-primary hover:bg-surface-container transition-colors text-sm font-bold"
                  aria-label="Restar una unidad"
                >
                  -
                </button>
                <span class="px-3 py-1 font-label text-xs font-semibold text-primary min-w-[2rem] text-center">
                  {{ item.quantity }}
                </span>
                <button 
                  @click="cartStore.updateQuantity(item.id, item.size, item.quantity + 1)"
                  class="px-3 py-1 text-primary hover:bg-surface-container transition-colors text-sm font-bold"
                  aria-label="Sumar una unidad"
                >
                  +
                </button>
              </div>

              <div class="text-right">
                <span class="font-sans font-semibold text-primary text-base">
                  ${{ (item.price * item.quantity).toLocaleString('es-AR') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer & Totals -->
      <div v-if="cartStore.items.length > 0" class="p-6 bg-surface border-t border-outline-variant space-y-4">
        <!-- Breakdown -->
        <div class="space-y-1.5 text-sm font-sans border-b border-outline-variant pb-3">
          <div class="flex justify-between text-secondary">
            <span>Subtotal</span>
            <span>${{ cartStore.subtotal.toLocaleString('es-AR') }}</span>
          </div>
          <div class="flex justify-between text-secondary">
            <span>Envío estimado</span>
            <span>{{ cartStore.shippingCost === 0 ? '¡GRATIS!' : `$${cartStore.shippingCost.toLocaleString('es-AR')}` }}</span>
          </div>
        </div>

        <!-- Total -->
        <div class="flex justify-between items-baseline pt-1">
          <span class="font-sans text-lg text-primary">Total Estimado</span>
          <div class="text-right">
            <span class="font-sans text-2xl font-bold text-primary">
              ${{ cartStore.total.toLocaleString('es-AR') }}
            </span>
            <p class="text-[11px] text-secondary">Hasta 3 cuotas sin interés de ${{ Math.round(cartStore.total / 3).toLocaleString('es-AR') }}</p>
          </div>
        </div>

        <!-- Action CTAs: Píldoras -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button 
            @click="goToCartPage"
            class="w-full bg-transparent text-primary font-label text-label-sm py-3.5 uppercase tracking-widest rounded-full border border-primary hover:bg-surface-container transition-all text-center shadow-2xs"
          >
            Ver Carrito
          </button>
          <button 
            @click="goToCheckout"
            class="w-full bg-primary-container text-on-primary font-label text-label-sm py-3.5 uppercase tracking-widest rounded-full border border-primary-container hover:bg-inverse-surface transition-all text-center flex items-center justify-center gap-2 shadow-md"
          >
            <span>Checkout</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </aside>
  </Teleport>
</template>
