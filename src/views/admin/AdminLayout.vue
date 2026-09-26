<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'

const router = useRouter()
const adminAuthStore = useAdminAuthStore()

onMounted(async () => {
  const isValid = await adminAuthStore.verifySession()
  if (isValid) {
    adminAuthStore.loadDashboardData()
  } else {
    router.push('/admin/login')
  }
})

const handleLogout = () => {
  adminAuthStore.logout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-surface-container-low font-sans text-primary selection:bg-primary-fixed selection:text-primary">
    <!-- Top Sticky Admin Navbar (Matching Ecommerce Layout & Colors) -->
    <header class="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant shadow-[0_4px_20px_-4px_rgba(46,25,17,0.03)] transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        <!-- Brand & Context -->
        <div class="flex items-center gap-3.5">
          <RouterLink to="/admin/ventas" class="flex items-baseline gap-2 group">
            <span class="font-serif text-2xl tracking-wider text-primary font-bold group-hover:text-primary-container transition-colors">GICCA</span>
            <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary">Atelier Admin</span>
          </RouterLink>
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-label uppercase text-emerald-800 font-bold shadow-2xs">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>En Vivo</span>
          </div>
        </div>

        <!-- Main Admin Tabs (Segmented Control) -->
        <nav class="hidden md:flex items-center gap-1.5 bg-surface-container/70 p-1.5 rounded-2xl border border-outline-variant/60 shadow-2xs">
          <RouterLink 
            to="/admin/ventas"
            class="px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider transition-all flex items-center gap-2"
            active-class="bg-primary text-on-primary font-bold shadow-xs"
            exact-active-class="bg-primary text-on-primary font-bold shadow-xs"
          >
            <span class="material-symbols-outlined text-base">receipt_long</span>
            <span>Ventas</span>
          </RouterLink>

          <RouterLink 
            to="/admin/productos"
            class="px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider transition-all flex items-center gap-2"
            active-class="bg-primary text-on-primary font-bold shadow-xs"
            exact-active-class="bg-primary text-on-primary font-bold shadow-xs"
          >
            <span class="material-symbols-outlined text-base">local_pharmacy</span>
            <span>Catálogo</span>
          </RouterLink>

          <RouterLink 
            to="/admin/finanzas"
            class="px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider transition-all flex items-center gap-2"
            active-class="bg-primary text-on-primary font-bold shadow-xs"
            exact-active-class="bg-primary text-on-primary font-bold shadow-xs"
          >
            <span class="material-symbols-outlined text-base">monitoring</span>
            <span>Finanzas</span>
          </RouterLink>

          <RouterLink 
            to="/admin/diseno"
            class="px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider transition-all flex items-center gap-2"
            active-class="bg-primary text-on-primary font-bold shadow-xs"
            exact-active-class="bg-primary text-on-primary font-bold shadow-xs"
          >
            <span class="material-symbols-outlined text-base">palette</span>
            <span>Diseño</span>
          </RouterLink>
        </nav>

        <!-- Right User Actions -->
        <div class="flex items-center gap-2 sm:gap-3">
          <RouterLink 
            to="/" 
            target="_blank" 
            class="w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full border border-outline-variant flex items-center justify-center gap-1.5 text-xs font-label uppercase tracking-widest text-primary hover:border-primary hover:bg-surface-container transition-all shadow-2xs"
            title="Ver Tienda"
          >
            <span class="material-symbols-outlined text-base">visibility</span>
            <span class="hidden sm:inline">Ver Tienda</span>
          </RouterLink>

          <span class="hidden lg:inline-block bg-surface-container px-2.5 py-0.5 rounded-full text-[10px] font-label uppercase font-bold text-secondary border border-outline-variant tracking-wider">
            Superadmin
          </span>

          <button 
            @click="handleLogout"
            class="w-9 h-9 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 rounded-full border border-outline-variant/80 text-secondary hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50/70 text-xs font-label uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            title="Cerrar Sesión"
          >
            <span class="material-symbols-outlined text-base">logout</span>
            <span class="hidden sm:inline">Salir</span>
          </button>
        </div>

      </div>
    </header>

    <!-- Mobile Fixed Bottom Navigation Bar (Native App Style) -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-outline-variant py-2 px-3 flex justify-around items-center shadow-[0_-4px_20px_rgba(46,25,17,0.06)]">
      <RouterLink 
        to="/admin/ventas"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-secondary"
        active-class="!text-primary font-bold bg-surface-container shadow-2xs"
        exact-active-class="!text-primary font-bold bg-surface-container shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">receipt_long</span>
        <span class="text-[10px] font-label uppercase tracking-wider mt-0.5">Ventas</span>
      </RouterLink>

      <RouterLink 
        to="/admin/productos"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-secondary"
        active-class="!text-primary font-bold bg-surface-container shadow-2xs"
        exact-active-class="!text-primary font-bold bg-surface-container shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">local_pharmacy</span>
        <span class="text-[10px] font-label uppercase tracking-wider mt-0.5">Catálogo</span>
      </RouterLink>

      <RouterLink 
        to="/admin/finanzas"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-secondary"
        active-class="!text-primary font-bold bg-surface-container shadow-2xs"
        exact-active-class="!text-primary font-bold bg-surface-container shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">monitoring</span>
        <span class="text-[10px] font-label uppercase tracking-wider mt-0.5">Finanzas</span>
      </RouterLink>

      <RouterLink 
        to="/admin/diseno"
        class="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all text-secondary"
        active-class="!text-primary font-bold bg-surface-container shadow-2xs"
        exact-active-class="!text-primary font-bold bg-surface-container shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">palette</span>
        <span class="text-[10px] font-label uppercase tracking-wider mt-0.5">Diseño</span>
      </RouterLink>
    </nav>

    <!-- Main Container with Fluid Route Transitions -->
    <main class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <RouterView v-slot="{ Component }">
        <Transition name="admin-fade-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>
