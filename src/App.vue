<script setup>
import { computed, onMounted, defineAsyncComponent } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useSiteContentStore } from '@/stores/siteContent'
import { useTenantStore } from '@/stores/tenant'
import Navbar from '@/components/layout/Navbar.vue'
import Footer from '@/components/layout/Footer.vue'
import CartDrawer from '@/components/cart/CartDrawer.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

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
  (tenantStore.isSuspended || tenantStore.isNotFound)
)

const showStoreChrome = computed(() =>
  !isAdminRoute.value && !isPlatformRoute.value && !showPlatformLanding.value && !showStoreUnavailable.value
)

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
