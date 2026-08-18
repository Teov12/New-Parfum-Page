<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { products } from '@/data/products'
import ProductCard from '@/components/product/ProductCard.vue'

const cartStore = useCartStore()
const toastStore = useToastStore()
const router = useRouter()

const couponCodeInput = ref('')

const sampleOptions = [
  { name: 'Libre YSL 2ml - Muestra de Cortesía', brand: 'Yves Saint Laurent', desc: 'Floral lavanda y flor de azahar' },
  { name: 'Sauvage Parfum 2ml - Muestra de Cortesía', brand: 'Dior', desc: 'Amaderada mandarina y sándalo' },
  { name: 'Baccarat Rouge 540 1.5ml - Muestra de Cortesía', brand: 'Maison Francis Kurkdjian', desc: 'Oriental azafrán y cedro' },
  { name: 'Coco Mademoiselle 2ml - Muestra de Cortesía', brand: 'Chanel', desc: 'Chispeante naranja y pachulí' }
]

const handleApplyCoupon = () => {
  if (!couponCodeInput.value.trim()) return
  const res = cartStore.applyCoupon(couponCodeInput.value)
  if (res.success) {
    toastStore.show(res.message, 'success')
    couponCodeInput.value = ''
  } else {
    toastStore.show(res.message, 'error')
  }
}

const suggestedProducts = products.filter(p => !cartStore.items.some(i => i.id === p.id)).slice(0, 4)
</script>

<template>
  <div class="bg-surface-container py-12">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Breadcrumbs & Header -->
      <div class="mb-10">
        <nav class="font-label text-xs uppercase tracking-widest text-secondary flex items-center gap-2 mb-4">
          <RouterLink to="/" class="hover:text-primary transition-colors">Inicio</RouterLink>
          <span>/</span>
          <span class="text-primary font-bold">Tu Bolsa de Compras</span>
        </nav>

        <h1 class="font-serif text-4xl md:text-5xl text-primary font-normal tracking-tight">
          Bolsa de Compras
        </h1>
        <p class="font-sans text-sm text-secondary mt-1">
          {{ cartStore.totalItems }} {{ cartStore.totalItems === 1 ? 'fragancia seleccionada' : 'fragancias seleccionadas' }}
        </p>
      </div>

      <!-- Free Shipping Goal Banner -->
      <div class="bg-surface border border-outline-variant p-6 mb-10">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">local_shipping</span>
            <span v-if="cartStore.amountForFreeShipping > 0" class="font-label text-xs uppercase tracking-wider text-primary">
              Agregá <strong>${{ cartStore.amountForFreeShipping.toLocaleString('es-AR') }}</strong> más para obtener <strong>Envío Gratis a todo el país</strong>
            </span>
            <span v-else class="font-label text-xs uppercase tracking-wider text-tertiary font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">verified</span>
              ¡Felicidades! Tenés Envío Gratis garantizado en esta orden
            </span>
          </div>
          <span class="font-label text-xs text-primary font-bold">{{ cartStore.freeShippingProgress }}%</span>
        </div>
        
        <div class="w-full bg-secondary-container h-2">
          <div 
            class="bg-primary-container h-full transition-all duration-500"
            :style="{ width: `${cartStore.freeShippingProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div v-if="cartStore.items.length > 0" class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        <!-- Cart Items Table & Samples (8 cols) -->
        <div class="lg:col-span-8 space-y-8">
          
          <!-- Items List Container -->
          <div class="bg-surface border border-outline-variant divide-y divide-outline-variant">
            <!-- Table Header -->
            <div class="hidden sm:grid grid-cols-12 gap-4 p-4 font-label text-xs uppercase tracking-widest text-secondary bg-surface-container-low">
              <span class="col-span-6">Fragancia & Detalle</span>
              <span class="col-span-2 text-center">Precio</span>
              <span class="col-span-2 text-center">Cantidad</span>
              <span class="col-span-2 text-right">Subtotal</span>
            </div>

            <!-- Item Rows -->
            <div 
              v-for="item in cartStore.items" 
              :key="`${item.id}-${item.size}`"
              class="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center"
            >
              <!-- Info & Image (6 cols) -->
              <div class="sm:col-span-6 flex gap-4 items-center">
                <RouterLink :to="`/producto/${item.slug}`" class="flex-shrink-0">
                  <img 
                    :src="item.image" 
                    :alt="item.name"
                    class="w-20 h-24 object-cover bg-surface-lowest border border-outline-variant"
                  />
                </RouterLink>

                <div class="min-w-0">
                  <span class="font-label text-[10px] text-secondary uppercase tracking-widest">{{ item.brand }}</span>
                  <RouterLink :to="`/producto/${item.slug}`" class="block">
                    <h3 class="font-serif text-lg text-primary font-medium hover:text-primary-container transition-colors truncate">
                      {{ item.name }}
                    </h3>
                  </RouterLink>
                  <p class="font-sans text-xs text-secondary mb-2">
                    {{ item.concentration }} • {{ item.size }}
                  </p>
                  
                  <button 
                    @click="cartStore.removeItem(item.id, item.size)"
                    class="text-xs font-label text-error hover:underline flex items-center gap-1"
                  >
                    <span class="material-symbols-outlined text-xs">delete</span>
                    <span>Quitar</span>
                  </button>
                </div>
              </div>

              <!-- Unit Price (2 cols) -->
              <div class="sm:col-span-2 text-left sm:text-center text-sm font-sans text-secondary">
                <span class="sm:hidden font-label text-xs text-secondary mr-2">Precio:</span>
                ${{ item.price.toLocaleString('es-AR') }}
              </div>

              <!-- Quantity Controls (2 cols) -->
              <div class="sm:col-span-2 flex sm:justify-center">
                <div class="inline-flex items-center border border-primary bg-surface">
                  <button 
                    @click="cartStore.updateQuantity(item.id, item.size, item.quantity - 1)"
                    class="px-2.5 py-1 text-primary hover:bg-surface-container transition-colors text-sm"
                  >
                    -
                  </button>
                  <span class="px-3 py-1 font-label text-xs font-bold text-primary min-w-[2rem] text-center">
                    {{ item.quantity }}
                  </span>
                  <button 
                    @click="cartStore.updateQuantity(item.id, item.size, item.quantity + 1)"
                    class="px-2.5 py-1 text-primary hover:bg-surface-container transition-colors text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              <!-- Subtotal (2 cols) -->
              <div class="sm:col-span-2 text-left sm:text-right font-sans font-bold text-base text-primary">
                <span class="sm:hidden font-label text-xs text-secondary mr-2">Total:</span>
                ${{ (item.price * item.quantity).toLocaleString('es-AR') }}
              </div>
            </div>
          </div>

          <!-- Free Courtesy Sample Picker -->
          <div class="bg-surface border border-outline-variant p-6 space-y-4">
            <div class="flex items-center gap-2 border-b border-outline-variant pb-3">
              <span class="material-symbols-outlined text-xl text-primary">card_giftcard</span>
              <div>
                <h3 class="font-serif text-lg text-primary font-medium">Elegí tu Muestra de Cortesía (Sin Cargo)</h3>
                <p class="font-sans text-xs text-secondary">Cada orden de Gicca incluye 1 muestra de perfumería exclusiva de regalo.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                v-for="sample in sampleOptions" 
                :key="sample.name"
                class="flex items-start gap-3 p-3 border cursor-pointer transition-all"
                :class="cartStore.selectedSample === sample.name 
                  ? 'border-primary bg-surface-container-low ring-1 ring-primary' 
                  : 'border-outline-variant bg-surface hover:border-primary'"
              >
                <input 
                  type="radio" 
                  name="courtesy_sample"
                  :value="sample.name"
                  v-model="cartStore.selectedSample"
                  @change="cartStore.selectSample(sample.name)"
                  class="mt-1 accent-primary"
                />
                <div>
                  <p class="font-label text-xs uppercase tracking-wider text-primary font-bold">{{ sample.name }}</p>
                  <p class="font-sans text-[11px] text-secondary">{{ sample.desc }}</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Continue Shopping Link -->
          <div>
            <RouterLink 
              to="/catalogo"
              class="inline-flex items-center gap-2 font-label text-xs uppercase tracking-widest text-primary hover:text-primary-container underline"
            >
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              <span>Continuar Explorando Fragancias</span>
            </RouterLink>
          </div>

        </div>

        <!-- ORDER SUMMARY BOX (4 cols) -->
        <aside class="lg:col-span-4 bg-surface border border-primary p-6 sm:p-8 space-y-6 shadow-sm sticky top-24">
          <h2 class="font-serif text-2xl text-primary font-normal border-b border-outline-variant pb-4">
            Resumen de la Orden
          </h2>

          <!-- Coupon Module -->
          <div class="space-y-2">
            <label class="font-label text-xs uppercase tracking-widest text-primary font-bold block">
              ¿Tenés un Cupón de Descuento?
            </label>
            
            <div v-if="!cartStore.coupon" class="flex gap-2">
              <input 
                v-model="couponCodeInput"
                type="text" 
                placeholder="EJ. GICCA10"
                class="w-full bg-surface-container border border-outline-variant px-3 py-2 text-xs font-label uppercase tracking-widest text-primary focus:border-primary focus:outline-none"
                @keyup.enter="handleApplyCoupon"
              />
              <button 
                @click="handleApplyCoupon"
                class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-4 py-2 hover:bg-inverse-surface transition-colors"
              >
                Aplicar
              </button>
            </div>

            <div v-else class="flex justify-between items-center bg-surface-container px-3 py-2 text-xs border border-outline-variant">
              <span class="text-tertiary font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">check_circle</span>
                {{ cartStore.coupon.label }}
              </span>
              <button @click="cartStore.removeCoupon" class="text-xs text-error underline">
                Eliminar
              </button>
            </div>

            <div class="flex gap-2 text-[10px] text-secondary font-label uppercase tracking-wider">
              <span>Prueba: <button @click="couponCodeInput = 'GICCA10'; handleApplyCoupon()" class="underline font-bold text-primary">GICCA10</button></span>
              <span>•</span>
              <span><button @click="couponCodeInput = 'BIENVENIDO'; handleApplyCoupon()" class="underline font-bold text-primary">BIENVENIDO</button></span>
            </div>
          </div>

          <!-- Price Breakdown -->
          <div class="space-y-3 font-sans text-sm border-t border-b border-outline-variant py-4">
            <div class="flex justify-between text-secondary">
              <span>Subtotal de productos:</span>
              <span class="font-medium text-primary">${{ cartStore.subtotal.toLocaleString('es-AR') }}</span>
            </div>

            <div v-if="cartStore.discountAmount > 0" class="flex justify-between text-tertiary font-medium">
              <span>Descuento aplicado:</span>
              <span>-${{ cartStore.discountAmount.toLocaleString('es-AR') }}</span>
            </div>

            <div class="flex justify-between text-secondary">
              <span>Envío nacional:</span>
              <span class="font-medium text-primary">
                {{ cartStore.shippingCost === 0 ? '¡GRATIS!' : `$${cartStore.shippingCost.toLocaleString('es-AR')}` }}
              </span>
            </div>

            <div class="flex justify-between text-secondary">
              <span>Muestra de cortesía:</span>
              <span class="text-tertiary font-medium">GRATIS</span>
            </div>
          </div>

          <!-- Total Amount -->
          <div>
            <div class="flex justify-between items-baseline mb-1">
              <span class="font-serif text-xl text-primary font-medium">Total Final</span>
              <span class="font-sans font-bold text-3xl text-primary">
                ${{ cartStore.total.toLocaleString('es-AR') }}
              </span>
            </div>
            <p class="font-label text-xs text-secondary uppercase tracking-wider text-right">
              Hasta 3 cuotas fijas de ${{ Math.round(cartStore.total / 3).toLocaleString('es-AR') }}
            </p>
          </div>

          <!-- Checkout CTA Button -->
          <button 
            @click="router.push('/checkout')"
            class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 font-bold shadow-md"
          >
            <span>Proceder al Checkout Seguro</span>
            <span class="material-symbols-outlined text-sm">lock</span>
          </button>

          <!-- WhatsApp Direct Order Option -->
          <a 
            :href="`https://wa.me/5491158249910?text=${encodeURIComponent(`Hola Gicca Perfumes! Quiero coordinar la compra de mi carrito por un total de $${cartStore.total.toLocaleString('es-AR')}`)}`"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full bg-surface text-primary font-label text-xs uppercase tracking-widest py-3 border border-outline hover:bg-surface-container transition-all flex items-center justify-center gap-2 block text-center"
          >
            <span>💬 Finalizar por WhatsApp con Asesor</span>
          </a>

          <!-- Payment Security Icons -->
          <div class="pt-2 text-center text-xs text-secondary space-y-2">
            <p class="font-label text-[10px] uppercase tracking-widest text-secondary flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-sm text-tertiary">shield</span>
              Pagos 100% Encriptados con SSL de 256 bits
            </p>
          </div>

        </aside>

      </div>

      <!-- EMPTY STATE -->
      <div v-else class="bg-surface border border-outline-variant p-16 text-center max-w-xl mx-auto">
        <span class="material-symbols-outlined text-6xl text-outline mb-4">shopping_bag</span>
        <h2 class="font-serif text-3xl text-primary font-normal mb-3">Tu bolsa de compras está vacía</h2>
        <p class="font-sans text-sm text-secondary mb-8 leading-relaxed">
          Nuestras fragancias de autor y colecciones de alta perfumería te están esperando. Descubrí notas que despiertan emociones.
        </p>
        <RouterLink 
          to="/catalogo"
          class="inline-block bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-9 py-4 border border-primary-container hover:bg-surface hover:text-primary-container transition-all"
        >
          Explorar Catálogo de Fragancias
        </RouterLink>
      </div>

      <!-- SUGGESTED PRODUCTS CAROUSEL -->
      <div v-if="suggestedProducts.length > 0" class="mt-20 border-t border-primary pt-16">
        <div class="text-center max-w-xl mx-auto mb-12">
          <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Recomendaciones del Atelier</p>
          <h2 class="font-serif text-3xl text-primary font-normal">Quizás También Te Interese</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProductCard 
            v-for="prod in suggestedProducts" 
            :key="prod.id" 
            :product="prod" 
          />
        </div>
      </div>

    </div>
  </div>
</template>
