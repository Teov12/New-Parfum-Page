<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { useOrdersStore } from '@/stores/orders'
import { useProductStore } from '@/stores/products'
import { useTenantStore } from '@/stores/tenant'
import OnboardingModal from '@/components/admin/OnboardingModal.vue'

const router = useRouter()
const route = useRoute()
const adminAuthStore = useAdminAuthStore()
const ordersStore = useOrdersStore()
const productStore = useProductStore()
const tenantStore = useTenantStore()

const isSidebarCollapsed = ref(
  localStorage.getItem('admin_sidebar_collapsed') !== null 
    ? localStorage.getItem('admin_sidebar_collapsed') === 'true' 
    : (typeof window !== 'undefined' && window.innerWidth < 1280)
)
const isMobileDrawerOpen = ref(false)
const isOnboardingOpen = ref(false)

// Rol del usuario: el equipo (staff) no ve configuración, finanzas ni suscripción
const isOwner = computed(() => adminAuthStore.adminUser?.role !== 'staff')

// Estado de la suscripción para el aviso de prueba / tienda pausada
const billing = ref(null)
const fetchBilling = async () => {
  try {
    const res = await fetch('/api/billing', {
      headers: { Authorization: `Bearer ${adminAuthStore.token}` }
    })
    if (res.ok) billing.value = await res.json()
  } catch {
    billing.value = null
  }
}

const billingBanner = computed(() => {
  const b = billing.value
  if (!b || b.exempt) return null
  if (b.storeStatus === 'suspended') {
    return {
      tone: 'danger',
      text: b.suspendedReason === 'manual'
        ? 'Tu tienda está pausada por la plataforma. Escribinos para reactivarla.'
        : 'Tu tienda está pausada: la prueba gratis terminó o hay un pago pendiente. Activá tu plan para volver a vender.'
    }
  }
  if (b.status === 'trialing' && b.trialDaysLeft !== null) {
    return {
      tone: b.trialDaysLeft <= 3 ? 'warning' : 'info',
      text: b.trialDaysLeft === 0
        ? 'Tu prueba gratis termina hoy. Activá tu plan para no pausar la tienda.'
        : `Te quedan ${b.trialDaysLeft} día${b.trialDaysLeft === 1 ? '' : 's'} de prueba gratis del plan ${b.plan.name}.`
    }
  }
  if (['past_due', 'cancelled'].includes(b.status)) {
    return { tone: 'warning', text: 'Hay un problema con el cobro de tu suscripción. Revisalo para que la tienda siga online.' }
  }
  return null
})

watch(() => tenantStore.isLoaded, (loaded) => {
  if (loaded && tenantStore.branding && tenantStore.branding.onboardingCompleted === false) {
    isOnboardingOpen.value = true
  }
}, { immediate: true })

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  localStorage.setItem('admin_sidebar_collapsed', String(isSidebarCollapsed.value))
}

onMounted(async () => {
  const isValid = await adminAuthStore.verifySession()
  if (isValid) {
    adminAuthStore.loadDashboardData()
    ordersStore.fetchOrders()
    ordersStore.fetchStats()
    productStore.fetchProducts()
    productStore.fetchStats()
    tenantStore.fetchCurrentTenant()
    fetchBilling()
  } else {
    router.push('/admin/login')
  }
})

const handleLogout = () => {
  adminAuthStore.logout()
  router.push('/admin/login')
}

// Pending orders count for real-time badge
const pendingOrdersCount = computed(() => {
  return ordersStore.items.filter(
    o => o.paymentStatus === 'pending' || o.fulfillmentStatus === 'unfulfilled'
  ).length
})

// Current page breadcrumb and contextual info
const currentPageInfo = computed(() => {
  const path = route.path
  if (path.includes('/admin/productos')) {
    return {
      title: 'Catálogo & Decants',
      subtitle: 'Inventario de frascos y muestras fraccionadas',
      icon: 'inventory_2',
      badge: `${productStore.items.length} Perfumes`
    }
  }
  if (path.includes('/admin/finanzas')) {
    return {
      title: 'Finanzas & Rentabilidad',
      subtitle: 'Auditoría en tiempo real de facturación, costos y márgenes',
      icon: 'monitoring',
      badge: `${ordersStore.stats?.overallProfitMargin || 0}% Margen Neto`
    }
  }
  if (path.includes('/admin/diseno')) {
    return {
      title: 'Diseño & Vitrina',
      subtitle: 'Personalización editorial, banners y catálogo visual',
      icon: 'palette',
      badge: 'Editor Visual'
    }
  }
  if (path.includes('/admin/plan')) {
    return {
      title: 'Mi Plan',
      subtitle: 'Suscripción, prueba gratis y límites de tu tienda',
      icon: 'workspace_premium',
      badge: billing.value?.plan?.name || 'Plan'
    }
  }
  if (path.includes('/admin/tienda')) {
    return {
      title: 'Configuración & Pagos',
      subtitle: 'Mercado Pago Checkout, transferencias bancarias y envío gratis',
      icon: 'storefront',
      badge: 'Ajustes SaaS'
    }
  }
  return {
    title: 'Ventas & Pedidos',
    subtitle: 'Gestión de órdenes, cobros y logística con Andreani',
    icon: 'receipt_long',
    badge: `${ordersStore.items.length} Órdenes`
  }
})

const closeMobileDrawer = () => {
  isMobileDrawerOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#FAF8F5] text-primary flex flex-col font-sans selection:bg-amber-200 selection:text-amber-950">
    
    <div class="flex flex-1 min-h-screen relative">
      
      <!-- DESKTOP COLLAPSIBLE LUXURY SIDEBAR (>= lg) -->
      <aside 
        class="hidden lg:flex flex-col bg-surface border-r border-outline-variant shadow-[4px_0_24px_-4px_rgba(46,25,17,0.03)] z-30 transition-all duration-300 ease-in-out sticky top-0 h-screen flex-shrink-0"
        :class="isSidebarCollapsed ? 'w-20' : 'w-72'"
      >
        <!-- Store Brand Header -->
        <div class="p-5 border-b border-outline-variant flex items-center justify-between gap-3 h-20">
          <RouterLink to="/admin/ventas" class="flex items-center gap-3 min-w-0 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container text-amber-200 flex items-center justify-center flex-shrink-0 shadow-xs border border-primary/20 group-hover:scale-105 transition-transform overflow-hidden">
              <img 
                v-if="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
                :src="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
                :alt="tenantStore.storeName" 
                class="w-full h-full object-contain p-1" 
              />
              <span v-else class="material-symbols-outlined text-xl">{{ tenantStore.branding?.storeIcon || 'spa' }}</span>
            </div>
            <div v-if="!isSidebarCollapsed" class="min-w-0 overflow-hidden transition-all">
              <div class="flex items-center gap-1.5">
                <h1 class="font-serif font-bold text-base text-primary tracking-wide truncate group-hover:text-primary-container transition-colors">
                  {{ tenantStore.storeName || 'Mi Tienda' }}
                </h1>
              </div>
              <p class="font-label text-[10px] uppercase tracking-[0.2em] text-secondary truncate">
                Atelier Admin OS
              </p>
            </div>
          </RouterLink>

          <!-- Collapse / Expand Toggle Button -->
          <button 
            @click="toggleSidebar"
            class="w-7 h-7 rounded-lg border border-outline-variant hover:border-primary/40 bg-surface-container/60 hover:bg-surface-container flex items-center justify-center text-secondary hover:text-primary transition-all cursor-pointer shadow-2xs"
            :title="isSidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'"
          >
            <span class="material-symbols-outlined text-sm transition-transform duration-200" :class="isSidebarCollapsed ? 'rotate-180' : ''">
              chevron_left
            </span>
          </button>
        </div>

        <!-- Store Health & Mode Badge -->
        <div v-if="!isSidebarCollapsed" class="px-5 py-3 bg-surface-container/40 border-b border-outline-variant/60 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="font-label text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Tienda En Vivo</span>
          </div>
          <span class="text-[10px] font-mono text-secondary px-2 py-0.5 rounded-md bg-surface border border-outline-variant">
            ARS • MP v2
          </span>
        </div>

        <!-- Navigation Links Container -->
        <div class="flex-grow py-5 px-3 space-y-6 overflow-y-auto">
          
          <!-- Group 1: Operaciones Comerciales -->
          <div class="space-y-1">
            <div v-if="!isSidebarCollapsed" class="px-3 pb-2 text-[10px] font-label uppercase tracking-[0.2em] text-secondary/80 font-bold">
              Operaciones
            </div>

            <!-- Ventas -->
            <RouterLink 
              to="/admin/ventas"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all relative"
              :class="isSidebarCollapsed ? 'justify-center' : ''"
              active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              exact-active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              title="Ventas y Pedidos"
            >
              <span class="material-symbols-outlined text-xl flex-shrink-0 group-hover:scale-110 transition-transform">receipt_long</span>
              <span v-if="!isSidebarCollapsed" class="truncate flex-grow">Ventas & Pedidos</span>
              <span 
                v-if="!isSidebarCollapsed && pendingOrdersCount > 0"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-2xs animate-pulse"
                title="Pedidos pendientes de cobro o despacho"
              >
                {{ pendingOrdersCount }}
              </span>
            </RouterLink>

            <!-- Catálogo -->
            <RouterLink 
              to="/admin/productos"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all relative"
              :class="isSidebarCollapsed ? 'justify-center' : ''"
              active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              exact-active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              title="Catálogo & Decants"
            >
              <span class="material-symbols-outlined text-xl flex-shrink-0 group-hover:scale-110 transition-transform">inventory_2</span>
              <span v-if="!isSidebarCollapsed" class="truncate flex-grow">Catálogo & Decants</span>
              <span 
                v-if="!isSidebarCollapsed && productStore.items.length > 0"
                class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant text-secondary"
              >
                {{ productStore.items.length }}
              </span>
            </RouterLink>

            <!-- Finanzas -->
            <RouterLink
              v-if="isOwner"
              to="/admin/finanzas"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all relative"
              :class="isSidebarCollapsed ? 'justify-center' : ''"
              active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              exact-active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              title="Finanzas y Rentabilidad"
            >
              <span class="material-symbols-outlined text-xl flex-shrink-0 group-hover:scale-110 transition-transform">monitoring</span>
              <span v-if="!isSidebarCollapsed" class="truncate flex-grow">Finanzas & ROI</span>
              <span 
                v-if="!isSidebarCollapsed && ordersStore.stats?.overallProfitMargin"
                class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-900 border border-emerald-300/80"
              >
                {{ ordersStore.stats.overallProfitMargin }}%
              </span>
            </RouterLink>
          </div>

          <!-- Group 2: Personalización & Configuración -->
          <div class="space-y-1 pt-2 border-t border-outline-variant/60">
            <div v-if="!isSidebarCollapsed" class="px-3 pb-2 text-[10px] font-label uppercase tracking-[0.2em] text-secondary/80 font-bold">
              Personalización
            </div>

            <!-- Diseño -->
            <RouterLink 
              to="/admin/diseno"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all relative"
              :class="isSidebarCollapsed ? 'justify-center' : ''"
              active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              exact-active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              title="Diseño y Vitrina"
            >
              <span class="material-symbols-outlined text-xl flex-shrink-0 group-hover:scale-110 transition-transform">palette</span>
              <span v-if="!isSidebarCollapsed" class="truncate flex-grow">Diseño & Vitrina</span>
            </RouterLink>

            <!-- Tienda -->
            <RouterLink
              v-if="isOwner"
              to="/admin/tienda"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all relative"
              :class="isSidebarCollapsed ? 'justify-center' : ''"
              active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              exact-active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              title="Configuración de Tienda & Medios de Pago"
            >
              <span class="material-symbols-outlined text-xl flex-shrink-0 group-hover:scale-110 transition-transform">storefront</span>
              <span v-if="!isSidebarCollapsed" class="truncate flex-grow">Ajustes & Pagos</span>
            </RouterLink>

            <!-- Mi Plan -->
            <RouterLink
              v-if="isOwner"
              to="/admin/plan"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all relative"
              :class="isSidebarCollapsed ? 'justify-center' : ''"
              active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              exact-active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
              title="Mi Plan y Suscripción"
            >
              <span class="material-symbols-outlined text-xl flex-shrink-0 group-hover:scale-110 transition-transform">workspace_premium</span>
              <span v-if="!isSidebarCollapsed" class="truncate flex-grow">Mi Plan</span>
              <span
                v-if="!isSidebarCollapsed && billing?.status === 'trialing' && billing?.trialDaysLeft !== null"
                class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300"
              >
                {{ billing.trialDaysLeft }}d
              </span>
            </RouterLink>

            <!-- Superadmin SaaS Console -->
            <RouterLink
              v-if="adminAuthStore.isSuperadmin"
              to="/superadmin"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-xl font-label text-xs uppercase tracking-wider transition-all relative text-amber-900 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
              :class="isSidebarCollapsed ? 'justify-center' : ''"
              title="Consola Superadmin Multi-Tenant"
            >
              <span class="material-symbols-outlined text-xl flex-shrink-0 text-amber-800 group-hover:scale-110 transition-transform">hub</span>
              <span v-if="!isSidebarCollapsed" class="truncate flex-grow font-bold">Consola SaaS</span>
            </RouterLink>
          </div>
        </div>

        <!-- Sidebar Footer Actions -->
        <div class="p-3 border-t border-outline-variant space-y-2 bg-surface-container/30">
          <!-- Ver Tienda Pública Button -->
          <RouterLink 
            to="/" 
            target="_blank" 
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-outline-variant hover:border-primary bg-surface hover:bg-surface-container text-primary font-label text-xs uppercase tracking-wider transition-all shadow-2xs group"
            :class="isSidebarCollapsed ? 'justify-center' : ''"
            title="Abrir tienda en nueva pestaña"
          >
            <span class="material-symbols-outlined text-base group-hover:scale-110 transition-transform text-amber-700">open_in_new</span>
            <span v-if="!isSidebarCollapsed" class="truncate font-bold">Ver Tienda Online</span>
          </RouterLink>

          <!-- User Profile & Logout -->
          <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface border border-outline-variant/60 shadow-2xs">
            <div class="flex items-center gap-2.5 min-w-0" :class="isSidebarCollapsed ? 'justify-center w-full' : ''">
              <div class="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-serif font-bold text-xs flex-shrink-0">
                A
              </div>
              <div v-if="!isSidebarCollapsed" class="min-w-0 overflow-hidden">
                <p class="text-xs font-bold text-primary truncate leading-tight">Admin General</p>
                <p class="text-[10px] text-secondary truncate">Superadmin</p>
              </div>
            </div>

            <button 
              v-if="!isSidebarCollapsed"
              @click="handleLogout"
              class="w-8 h-8 rounded-lg text-secondary hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              title="Cerrar Sesión"
            >
              <span class="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- MAIN CONTENT COLUMN -->
      <div class="flex-1 flex flex-col min-w-0 min-h-screen">
        
        <!-- TOP EXECUTIVE COMMAND CENTER HEADER -->
        <header class="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-[0_4px_20px_-4px_rgba(46,25,17,0.03)] h-20 transition-all">
          <div class="w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 max-w-[1720px] mx-auto">
            
            <!-- Left: Mobile Drawer Trigger + Breadcrumb -->
            <div class="flex items-center gap-3 sm:gap-4 min-w-0">
              <!-- Mobile Hamburger Trigger (< lg) -->
              <button 
                @click="isMobileDrawerOpen = true"
                class="lg:hidden w-10 h-10 rounded-xl bg-surface border border-outline-variant hover:border-primary flex items-center justify-center text-primary transition-all shadow-2xs cursor-pointer flex-shrink-0"
                aria-label="Abrir menú de navegación"
              >
                <span class="material-symbols-outlined text-2xl">menu</span>
              </button>

              <!-- Dynamic Section Header -->
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="material-symbols-outlined text-primary text-xl hidden sm:inline-block">
                    {{ currentPageInfo.icon }}
                  </span>
                  <h2 class="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight truncate">
                    {{ currentPageInfo.title }}
                  </h2>
                  <span class="text-[10px] font-label uppercase px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant font-bold text-secondary hidden md:inline-block shadow-2xs">
                    {{ currentPageInfo.badge }}
                  </span>
                </div>
                <p class="text-[11px] text-secondary truncate hidden sm:block mt-0.5">
                  {{ currentPageInfo.subtitle }}
                </p>
              </div>
            </div>

            <!-- Right: Live System Status Pills & Actions -->
            <div class="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              
              <!-- Live Domain Badge -->
              <a 
                href="https://giccaperfumes.com.ar" 
                target="_blank" 
                rel="noopener noreferrer"
                class="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-200 text-[11px] font-label font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shadow-2xs"
                title="Dominio certificado en producción"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>giccaperfumes.com.ar</span>
                <span class="material-symbols-outlined text-xs">verified</span>
              </a>

              <!-- Mercado Pago Connected Pill -->
              <div class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant text-[11px] font-label text-secondary font-medium shadow-2xs">
                <span class="material-symbols-outlined text-sm text-blue-700">credit_card</span>
                <span>Mercado Pago</span>
              </div>

              <!-- Onboarding Wizard Trigger -->
              <button 
                @click="isOnboardingOpen = true"
                class="bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300 font-label text-xs uppercase tracking-wider px-3 sm:px-3.5 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer font-bold"
                title="Abrir Asistente de Configuración Inicial"
              >
                <span class="material-symbols-outlined text-base">auto_fix_high</span>
                <span class="hidden md:inline">Asistente</span>
              </button>

              <!-- Quick View Store CTA -->
              <RouterLink 
                to="/" 
                target="_blank" 
                class="bg-surface hover:bg-surface-container text-primary border border-outline-variant hover:border-primary font-label text-xs uppercase tracking-wider px-3.5 sm:px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <span class="material-symbols-outlined text-base text-amber-800">store</span>
                <span class="hidden sm:inline">Ver Tienda</span>
              </RouterLink>

              <!-- Mobile Logout (< lg) -->
              <button 
                @click="handleLogout"
                class="lg:hidden w-10 h-10 rounded-xl bg-surface border border-outline-variant text-secondary hover:text-rose-700 flex items-center justify-center transition-all shadow-2xs cursor-pointer flex-shrink-0"
                title="Cerrar Sesión"
              >
                <span class="material-symbols-outlined text-xl">logout</span>
              </button>
            </div>

          </div>
        </header>

        <!-- MAIN EXPANDED WORKSPACE CANVAS -->
        <main class="flex-1 w-full max-w-[1720px] mx-auto p-4 sm:p-5 lg:p-6 xl:p-8 2xl:p-10 pb-28 md:pb-12 transition-all">
          <!-- Aviso de prueba gratis / tienda pausada -->
          <div
            v-if="billingBanner"
            class="mb-5 rounded-2xl border px-4 py-3 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            :class="{
              'bg-rose-50 border-rose-200 text-rose-900': billingBanner.tone === 'danger',
              'bg-amber-50 border-amber-300 text-amber-950': billingBanner.tone === 'warning',
              'bg-sky-50 border-sky-200 text-sky-950': billingBanner.tone === 'info'
            }"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-lg">{{ billingBanner.tone === 'danger' ? 'pause_circle' : 'schedule' }}</span>
              <span>{{ billingBanner.text }}</span>
            </div>
            <RouterLink
              v-if="isOwner"
              to="/admin/plan"
              class="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label text-[11px] uppercase tracking-wider font-bold whitespace-nowrap"
            >
              Ver planes
            </RouterLink>
          </div>

          <RouterView v-slot="{ Component }">
            <Transition name="admin-fade-slide" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </main>

      </div>

    </div>

    <!-- MOBILE SLIDING DRAWER (< lg) -->
    <Teleport to="body">
      <Transition name="fade-backdrop">
        <div 
          v-if="isMobileDrawerOpen"
          class="fixed inset-0 z-50 bg-primary/60 backdrop-blur-sm lg:hidden flex"
          @click.self="closeMobileDrawer"
        >
          <Transition name="slide-drawer">
            <div 
              v-if="isMobileDrawerOpen"
              class="w-80 max-w-[85vw] bg-surface h-full p-6 flex flex-col justify-between border-r border-outline-variant shadow-2xl overflow-y-auto"
            >
              <!-- Drawer Header -->
              <div>
                <div class="flex items-center justify-between pb-5 border-b border-outline-variant mb-6">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-primary text-amber-200 flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
                      <img 
                        v-if="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
                        :src="tenantStore.branding?.iconUrl || tenantStore.branding?.logoUrl" 
                        :alt="tenantStore.storeName" 
                        class="w-full h-full object-contain p-1" 
                      />
                      <span v-else class="material-symbols-outlined text-xl">{{ tenantStore.branding?.storeIcon || 'spa' }}</span>
                    </div>
                    <div>
                      <h3 class="font-serif font-bold text-base text-primary">
                        {{ tenantStore.storeName }}
                      </h3>
                      <p class="font-label text-[10px] uppercase tracking-wider text-secondary">
                        Panel de Administración
                      </p>
                    </div>
                  </div>
                  <button 
                    @click="closeMobileDrawer" 
                    class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-primary cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>

                <!-- Drawer Links -->
                <div class="space-y-2">
                  <div class="px-2 text-[10px] font-label uppercase tracking-widest text-secondary font-bold mb-2">
                    Menú Principal
                  </div>

                  <RouterLink 
                    to="/admin/ventas" 
                    @click="closeMobileDrawer"
                    class="flex items-center justify-between p-3 rounded-xl font-label text-xs uppercase tracking-wider text-primary hover:bg-surface-container transition-colors"
                    active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
                  >
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-xl">receipt_long</span>
                      <span>Ventas & Pedidos</span>
                    </div>
                    <span v-if="pendingOrdersCount > 0" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                      {{ pendingOrdersCount }}
                    </span>
                  </RouterLink>

                  <RouterLink 
                    to="/admin/productos" 
                    @click="closeMobileDrawer"
                    class="flex items-center justify-between p-3 rounded-xl font-label text-xs uppercase tracking-wider text-primary hover:bg-surface-container transition-colors"
                    active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
                  >
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-xl">inventory_2</span>
                      <span>Catálogo & Decants</span>
                    </div>
                    <span class="text-[10px] text-secondary font-mono">{{ productStore.items.length }}</span>
                  </RouterLink>

                  <RouterLink
                    v-if="isOwner"
                    to="/admin/finanzas"
                    @click="closeMobileDrawer"
                    class="flex items-center justify-between p-3 rounded-xl font-label text-xs uppercase tracking-wider text-primary hover:bg-surface-container transition-colors"
                    active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
                  >
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-xl">monitoring</span>
                      <span>Finanzas & ROI</span>
                    </div>
                    <span class="text-[10px] text-emerald-800 font-bold">{{ ordersStore.stats?.overallProfitMargin || 0 }}%</span>
                  </RouterLink>

                  <RouterLink 
                    to="/admin/diseno" 
                    @click="closeMobileDrawer"
                    class="flex items-center gap-3 p-3 rounded-xl font-label text-xs uppercase tracking-wider text-primary hover:bg-surface-container transition-colors"
                    active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
                  >
                    <span class="material-symbols-outlined text-xl">palette</span>
                    <span>Diseño & Vitrina</span>
                  </RouterLink>

                  <RouterLink
                    v-if="isOwner"
                    to="/admin/tienda"
                    @click="closeMobileDrawer"
                    class="flex items-center gap-3 p-3 rounded-xl font-label text-xs uppercase tracking-wider text-primary hover:bg-surface-container transition-colors"
                    active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
                  >
                    <span class="material-symbols-outlined text-xl">storefront</span>
                    <span>Configuración Tienda</span>
                  </RouterLink>

                  <RouterLink
                    v-if="isOwner"
                    to="/admin/plan"
                    @click="closeMobileDrawer"
                    class="flex items-center gap-3 p-3 rounded-xl font-label text-xs uppercase tracking-wider text-primary hover:bg-surface-container transition-colors"
                    active-class="bg-primary text-on-primary font-bold shadow-xs !text-amber-200"
                  >
                    <span class="material-symbols-outlined text-xl">workspace_premium</span>
                    <span>Mi Plan</span>
                  </RouterLink>
                </div>
              </div>

              <!-- Drawer Bottom Actions -->
              <div class="pt-6 border-t border-outline-variant space-y-3">
                <RouterLink 
                  to="/" 
                  target="_blank"
                  class="w-full flex items-center justify-center gap-2 p-3 bg-surface-container rounded-xl border border-outline-variant font-label text-xs uppercase tracking-wider text-primary font-bold"
                >
                  <span class="material-symbols-outlined text-base">store</span>
                  <span>Ver Tienda Online</span>
                </RouterLink>

                <button 
                  @click="handleLogout"
                  class="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 font-label text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  <span class="material-symbols-outlined text-base">logout</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>

            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- MOBILE NATIVE BOTTOM APP DOCK (< md) -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-outline-variant py-2 px-2 flex justify-around items-center shadow-[0_-8px_25px_rgba(46,25,17,0.08)]">
      <RouterLink 
        to="/admin/ventas"
        class="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all text-secondary relative"
        active-class="!text-amber-900 !font-bold bg-amber-100/70 shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">receipt_long</span>
        <span class="text-[9px] font-label uppercase tracking-wider mt-0.5">Ventas</span>
        <span 
          v-if="pendingOrdersCount > 0"
          class="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-surface"
        ></span>
      </RouterLink>

      <RouterLink 
        to="/admin/productos"
        class="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all text-secondary relative"
        active-class="!text-amber-900 !font-bold bg-amber-100/70 shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">inventory_2</span>
        <span class="text-[9px] font-label uppercase tracking-wider mt-0.5">Catálogo</span>
      </RouterLink>

      <RouterLink 
        to="/admin/finanzas"
        class="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all text-secondary relative"
        active-class="!text-amber-900 !font-bold bg-amber-100/70 shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">monitoring</span>
        <span class="text-[9px] font-label uppercase tracking-wider mt-0.5">Finanzas</span>
      </RouterLink>

      <RouterLink 
        to="/admin/diseno"
        class="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all text-secondary relative"
        active-class="!text-amber-900 !font-bold bg-amber-100/70 shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">palette</span>
        <span class="text-[9px] font-label uppercase tracking-wider mt-0.5">Diseño</span>
      </RouterLink>

      <RouterLink 
        to="/admin/tienda"
        class="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all text-secondary relative"
        active-class="!text-amber-900 !font-bold bg-amber-100/70 shadow-2xs"
      >
        <span class="material-symbols-outlined text-xl">storefront</span>
        <span class="text-[9px] font-label uppercase tracking-wider mt-0.5">Tienda</span>
      </RouterLink>
    </nav>

    <!-- Modal de Configuración Inicial (Onboarding Wizard) -->
    <OnboardingModal 
      :isOpen="isOnboardingOpen" 
      @close="isOnboardingOpen = false" 
      @completed="isOnboardingOpen = false" 
    />

  </div>
</template>

<style scoped>
.fade-backdrop-enter-active,
.fade-backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.fade-backdrop-enter-from,
.fade-backdrop-leave-to {
  opacity: 0;
}

.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-drawer-enter-from,
.slide-drawer-leave-to {
  transform: translateX(-100%);
}

.admin-fade-slide-enter-active,
.admin-fade-slide-leave-active {
  transition: all 0.2s ease-out;
}

.admin-fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.admin-fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
