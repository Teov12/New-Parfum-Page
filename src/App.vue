<script setup>
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useProductStore } from '@/stores/products'
import Navbar from '@/components/layout/Navbar.vue'
import Footer from '@/components/layout/Footer.vue'
import CartDrawer from '@/components/cart/CartDrawer.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const route = useRoute()
const productStore = useProductStore()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

onMounted(() => {
  productStore.fetchProducts()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface text-on-surface font-sans">
    <!-- Sticky Main Navigation (Only for public store) -->
    <Navbar v-if="!isAdminRoute" />

    <!-- Main Dynamic Route View -->
    <main class="flex-grow">
      <RouterView />
    </main>

    <!-- Editorial Footer (Only for public store) -->
    <Footer v-if="!isAdminRoute" />

    <!-- Slide-over Cart Drawer (Only for public store) -->
    <CartDrawer v-if="!isAdminRoute" />

    <!-- Global Floating Toast Notifications -->
    <ToastContainer />
  </div>
</template>
