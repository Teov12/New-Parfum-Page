<script setup>
import { computed, onMounted, watch, defineAsyncComponent } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useSiteContentStore } from '@/stores/siteContent'
import { useTenantStore } from '@/stores/tenant'
import Navbar from '@/components/layout/Navbar.vue'
import Footer from '@/components/layout/Footer.vue'
import CartDrawer from '@/components/cart/CartDrawer.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import DemoBanner from '@/components/layout/DemoBanner.vue'
import { initTracking, trackEvent } from '@/utils/tracking'

const PlatformLandingView = defineAsyncComponent(() => import('@/views/platform/PlatformLandingView.vue'))
const StoreUnavailable = defineAsyncComponent(() => import('@/components/layout/StoreUnavailable.vue'))

const route = useRoute()
const productStore = useProductStore()
const siteContentStore = useSiteContentStore()
const tenantStore = useTenantStore()

const isAdminRoute = computed(() => route.path.startsWith('/admin') || route.path.startsWith('/superadmin'))
const isPlatformRoute = computed(() => Boolean(route.meta.platform))

// En el dominio raíz de la plataforma, la home es la landing para nuevas perfumerías
const showPlatformLanding = computed(() =>
  tenantStore.isPlatformHost && !isAdminRoute.value && !isPlatformRoute.value
)

// Tienda pausada o inexistente: se muestra un aviso en lugar de la vidriera
const showStoreUnavailable = computed(() =>
  !tenantStore.isPlatformHost && !isAdminRoute.value && !isPlatformRoute.value &&
  !(tenantStore.isSuspended && route.meta.alwaysAvailable) &&
  (tenantStore.isSuspended || tenantStore.isNotFound)
)

const showStoreChrome = computed(() =>
  !isAdminRoute.value && !isPlatformRoute.value && !showPlatformLanding.value && !showStoreUnavailable.value
)

// Píxeles de marketing de la tienda: solo en la vidriera, con una página vista por navegación
watch(() => route.fullPath, () => {
  if (!showStoreChrome.value) return
  initTracking(tenantStore.marketing)
  trackEvent('PageView')
})

onMounted(() => {
  tenantStore.fetchCurrentTenant()
  if (!tenantStore.isPlatformHost) {
    productStore.fetchProducts()
    siteContentStore.fetchSiteContent()
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface text-on-surface font-sans">
    <PlatformLandingView v-if="showPlatformLanding" />

    <StoreUnavailable v-else-if="showStoreUnavailable" />

    <template v-else>
      <DemoBanner v-if="showStoreChrome" context="store" />

      <!-- Sticky Main Navigation (Only for public store) -->
      <Navbar v-if="showStoreChrome" />

      <!-- Main Dynamic Route View with Fluid Page Transition -->
      <main class="flex-grow">
        <RouterView v-slot="{ Component }">
          <Transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>

      <!-- Editorial Footer (Only for public store) -->
      <Footer v-if="showStoreChrome" />

      <!-- Slide-over Cart Drawer (Only for public store) -->
      <CartDrawer v-if="showStoreChrome" />
    </template>

    <!-- Global Floating Toast Notifications -->
    <ToastContainer />
  </div>
</template>
