<script setup>
import { RouterView } from 'vue-router'
import TopPromoBar from '@/components/layout/TopPromoBar.vue'
import Navbar from '@/components/layout/Navbar.vue'
import Footer from '@/components/layout/Footer.vue'
import CartDrawer from '@/components/cart/CartDrawer.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-surface text-on-surface font-sans">
    <!-- Top Announcement Bar -->
    <TopPromoBar />

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
