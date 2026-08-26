<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useProductStore } from '@/stores/products'
import Navbar from '@/components/layout/Navbar.vue'
import Footer from '@/components/layout/Footer.vue'
import CartDrawer from '@/components/cart/CartDrawer.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

const productStore = useProductStore()

onMounted(() => {
  productStore.fetchProducts()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface text-on-surface font-sans">
    <!-- Sticky Main Navigation -->
    <Navbar />

    <!-- Main Dynamic Route View -->
    <main class="flex-grow">
      <RouterView />
    </main>

    <!-- Editorial Footer -->
    <Footer />

    <!-- Slide-over Cart Drawer -->
    <CartDrawer />

    <!-- Global Floating Toast Notifications -->
    <ToastContainer />
  </div>
</template>
