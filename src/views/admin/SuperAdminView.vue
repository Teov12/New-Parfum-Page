<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const tenants = ref([])
const isLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('all')

const isCreateModalOpen = ref(false)
const isSubmitting = ref(false)

const emptyTenantForm = () => ({
  name: '',
  tenantId: '',
  domain: '',
  subdomain: '',
  plan: 'pro',
  whatsappNumber: '',
  alias: '',
  adminEmail: '',
  adminPassword: '',
  seedStarter: true
})

const newTenantForm = ref(emptyTenantForm())
const accessDenied = ref(false)

const fetchTenants = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch('/api/tenant/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.status === 401 || res.status === 403) {
      accessDenied.value = true
      throw new Error('Esta consola requiere una cuenta de superadmin de la plataforma.')
    }
    if (!res.ok) throw new Error('Error al obtener lista de perfumerías')
    const data = await res.json()
    tenants.value = Array.isArray(data) ? data : [data]
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchTenants()
})

const filteredTenants = computed(() => {
  return tenants.value.filter(t => {
    if (statusFilter.value !== 'all' && (t.status || 'active') !== statusFilter.value) {
      return false
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = t.name?.toLowerCase().includes(q)
      const matchId = t.tenantId?.toLowerCase().includes(q)
      const matchDomain = t.domain?.toLowerCase().includes(q)
      return matchName || matchId || matchDomain
    }
    return true
  })
})

const stats = computed(() => {
  const list = tenants.value || []
  const activeCount = list.filter(t => (t.status || 'active') === 'active').length
  const customDomainsCount = list.filter(t => Boolean(t.domain)).length
  // Estimación MRR pro ($45.000 por tienda)
  const estimatedMrr = activeCount * 45000

  return {
    total: list.length,
    activeCount,
    customDomainsCount,
    estimatedMrr
  }
})

const handleAutoSlug = () => {
  if (!newTenantForm.value.tenantId && newTenantForm.value.name) {
    newTenantForm.value.tenantId = newTenantForm.value.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
    newTenantForm.value.subdomain = newTenantForm.value.tenantId
    newTenantForm.value.alias = `${newTenantForm.value.tenantId.toUpperCase()}.MP`
  }
}

const handleCreateTenant = async () => {
  if (!newTenantForm.value.name || !newTenantForm.value.tenantId) {
    toastStore.show('El nombre e identificador son obligatorios', 'warning')
    return
  }

  isSubmitting.value = true
  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch('/api/tenant/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newTenantForm.value)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al crear la tienda')

    // Si se eligió precargar catálogo sugerido
    if (newTenantForm.value.seedStarter) {
      try {
        await fetch('/api/products/seed-starter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': newTenantForm.value.tenantId
          }
        })
      } catch (e) {
        console.warn('Could not auto-seed starter:', e)
      }
    }

    toastStore.show(`¡Perfumería "${newTenantForm.value.name}" creada con éxito! Acceso: ${newTenantForm.value.adminEmail}`, 'success')
    isCreateModalOpen.value = false
    newTenantForm.value = emptyTenantForm()
    await fetchTenants()
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const toggleTenantStatus = async (tenant) => {
  const currentStatus = tenant.status || 'active'
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
  const confirmMsg = newStatus === 'suspended'
    ? `¿Estás seguro de pausar la perfumería "${tenant.name}"? Los clientes verán aviso de mantenimiento.`
    : `¿Reactivar la perfumería "${tenant.name}"?`

  if (!confirm(confirmMsg)) return

  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch(`/api/tenant/${tenant.tenantId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al cambiar estado')
    tenant.status = newStatus
    toastStore.show(data.message || 'Estado actualizado', 'success')
  } catch (err) {
    toastStore.show(err.message, 'error')
  }
}

// Restablece el email y la contraseña del dueño de una tienda (ej: si la olvidó)
const resetTenantAccess = async (tenant) => {
  const email = prompt(`Email de acceso para "${tenant.name}":`, tenant.adminEmail || '')
  if (!email) return
  const password = prompt('Nueva contraseña (mínimo 8 caracteres). Compartila por un canal seguro:')
  if (!password) return

  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch(`/api/tenant/${tenant.tenantId}/credentials`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al actualizar el acceso')
    tenant.adminEmail = email
    tenant.hasAdminUser = true
    toastStore.show(data.message || 'Acceso actualizado', 'success')
  } catch (err) {
    toastStore.show(err.message, 'error')
  }
}

const deleteTenant = async (tenant) => {
  if (tenant.tenantId === 'gicca') {
    toastStore.show('No es posible dar de baja la perfumería principal', 'warning')
    return
  }
  if (!confirm(`¿Eliminar permanentemente la perfumería "${tenant.name}"? Esta acción borrará su configuración.`)) {
    return
  }

  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch(`/api/tenant/${tenant.tenantId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al eliminar perfumería')
    toastStore.show(data.message || 'Perfumería eliminada', 'success')
    await fetchTenants()
  } catch (err) {
    toastStore.show(err.message, 'error')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#11100F] text-[#F3EFEA] font-sans selection:bg-amber-600 selection:text-white">
    
    <!-- Topbar Superadmin -->
    <header class="border-b border-white/10 bg-[#171614]/90 backdrop-blur-md sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <span class="material-symbols-outlined text-2xl">hub</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="font-serif text-lg sm:text-xl font-bold tracking-tight text-white">SaaS Boutique Engine</h1>
              <span class="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Superadmin
              </span>
            </div>
            <p class="text-xs text-white/50">Centro de Operaciones Multi-Tenant & Perfumerías Clientes</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <RouterLink 
            to="/admin/ventas" 
            class="px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-label uppercase tracking-wider text-white/80 transition-colors flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-sm">dashboard</span>
            <span>Panel Tienda</span>
          </RouterLink>

          <button
            @click="isCreateModalOpen = true"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-label uppercase tracking-wider font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <span class="material-symbols-outlined text-base">add_business</span>
            <span>Nueva Perfumería</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <div v-if="accessDenied" class="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 text-sm text-rose-200 flex items-start gap-3">
        <span class="material-symbols-outlined text-rose-300">lock</span>
        <div>
          <p class="font-bold">Esta consola es solo para el superadmin de la plataforma.</p>
          <p class="text-xs text-rose-200/80 mt-1">Cerrá sesión e ingresá con el email y la contraseña definidos en SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD.</p>
        </div>
      </div>

      <!-- KPI Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        <div class="bg-[#1B1917] border border-white/10 rounded-2xl p-5 shadow-xs">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-label uppercase tracking-widest text-white/60">Tiendas Totales</span>
            <span class="material-symbols-outlined text-amber-400 text-xl">storefront</span>
          </div>
          <p class="font-sans text-3xl font-bold text-white">{{ stats.total }}</p>
          <p class="text-[11px] text-white/40 mt-1">Perfumerías registradas</p>
        </div>

        <div class="bg-[#1B1917] border border-white/10 rounded-2xl p-5 shadow-xs">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-label uppercase tracking-widest text-emerald-400">Tiendas Activas</span>
            <span class="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
          </div>
          <p class="font-sans text-3xl font-bold text-emerald-400">{{ stats.activeCount }}</p>
          <p class="text-[11px] text-white/40 mt-1">Operando y vendiendo en vivo</p>
        </div>

        <div class="bg-[#1B1917] border border-white/10 rounded-2xl p-5 shadow-xs">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-label uppercase tracking-widest text-sky-400">Dominios Propios</span>
            <span class="material-symbols-outlined text-sky-400 text-xl">language</span>
          </div>
          <p class="font-sans text-3xl font-bold text-sky-400">{{ stats.customDomainsCount }}</p>
          <p class="text-[11px] text-white/40 mt-1">Con DNS certificados</p>
        </div>

        <div class="bg-[#1B1917] border border-white/10 rounded-2xl p-5 shadow-xs">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-label uppercase tracking-widest text-amber-300">MRR Estimado</span>
            <span class="material-symbols-outlined text-amber-300 text-xl">payments</span>
          </div>
          <p class="font-sans text-3xl font-bold text-amber-300">${{ stats.estimatedMrr.toLocaleString('es-AR') }}</p>
          <p class="text-[11px] text-white/40 mt-1">Facturación mensual SaaS</p>
        </div>

      </div>

      <!-- Action Bar: Search & Filter -->
      <div class="bg-[#1B1917] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div class="relative flex-1 max-w-md">
          <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-base">search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, slug o dominio..."
            class="w-full bg-[#11100F] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div class="flex items-center gap-3">
          <select
            v-model="statusFilter"
            class="bg-[#11100F] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activas</option>
            <option value="trial">En Prueba (Trial)</option>
            <option value="suspended">Suspendidas</option>
          </select>

          <button
            @click="fetchTenants"
            class="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Refrescar lista"
          >
            <span class="material-symbols-outlined text-base">refresh</span>
          </button>
        </div>
      </div>

      <!-- Tenants Table Card -->
      <div class="bg-[#1B1917] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-xs font-sans">
            <thead>
              <tr class="border-b border-white/10 text-white/50 uppercase font-label tracking-wider text-[11px] bg-white/[0.02]">
                <th class="py-4 px-6">Perfumería</th>
                <th class="py-4 px-6">Identificador & URL</th>
                <th class="py-4 px-6">Dominio Propio</th>
                <th class="py-4 px-6">Plan SaaS</th>
                <th class="py-4 px-6">Estado</th>
                <th class="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-if="filteredTenants.length === 0">
                <td colspan="6" class="py-12 text-center text-white/40">
                  No se encontraron perfumerías con los filtros aplicados.
                </td>
              </tr>

              <tr 
                v-for="t in filteredTenants" 
                :key="t.tenantId"
                class="hover:bg-white/[0.02] transition-colors"
              >
                <!-- Tienda -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <span class="material-symbols-outlined text-lg">{{ t.branding?.storeIcon || 'spa' }}</span>
                    </div>
                    <div>
                      <p class="font-bold text-white text-sm">{{ t.name }}</p>
                      <p class="text-[11px] text-white/40">{{ t.branding?.tagline || 'Perfumería Exclusiva' }}</p>
                    </div>
                  </div>
                </td>

                <!-- Slug / Subdominio -->
                <td class="py-4 px-6">
                  <span class="font-mono text-white/80 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {{ t.tenantId }}
                  </span>
                  <div class="mt-1">
                    <a 
                      :href="`/?tenant=${t.tenantId}`" 
                      target="_blank"
                      class="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Abrir Vitrina</span>
                      <span class="material-symbols-outlined text-[10px]">open_in_new</span>
                    </a>
                  </div>
                </td>

                <!-- Dominio DNS -->
                <td class="py-4 px-6">
                  <div v-if="t.domain" class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <a 
                      :href="`https://${t.domain}`" 
                      target="_blank"
                      class="text-white hover:text-amber-400 transition-colors font-mono underline"
                    >
                      {{ t.domain }}
                    </a>
                  </div>
                  <span v-else class="text-white/30 text-[11px] italic">Sin dominio propio</span>
                </td>

                <!-- Plan -->
                <td class="py-4 px-6">
                  <span class="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Plan {{ t.plan || 'pro' }}
                  </span>
                </td>

                <!-- Estado -->
                <td class="py-4 px-6">
                  <span 
                    :class="(t.status || 'active') === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'"
                    class="font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border inline-block"
                  >
                    {{ (t.status || 'active') === 'active' ? 'Activo' : 'Suspendido' }}
                  </span>
                </td>

                <!-- Acciones -->
                <td class="py-4 px-6 text-right space-x-1.5">
                  <button
                    @click="toggleTenantStatus(t)"
                    :class="(t.status || 'active') === 'active' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'"
                    class="px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-label uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                    :title="(t.status || 'active') === 'active' ? 'Pausar tienda' : 'Reactivar tienda'"
                  >
                    <span class="material-symbols-outlined text-sm">
                      {{ (t.status || 'active') === 'active' ? 'pause_circle' : 'play_circle' }}
                    </span>
                    <span>{{ (t.status || 'active') === 'active' ? 'Pausar' : 'Activar' }}</span>
                  </button>

                  <button
                    @click="resetTenantAccess(t)"
                    class="px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-label uppercase tracking-wider transition-colors inline-flex items-center gap-1 text-sky-300 hover:bg-sky-500/10"
                    :title="t.hasAdminUser ? `Acceso actual: ${t.adminEmail}` : 'Sin usuario administrador'"
                  >
                    <span class="material-symbols-outlined text-sm">key</span>
                    <span>Acceso</span>
                  </button>

                  <button
                    v-if="t.tenantId !== 'gicca'"
                    @click="deleteTenant(t)"
                    class="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Eliminar perfumería"
                  >
                    <span class="material-symbols-outlined text-base">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </main>

    <!-- Modal Aprovisionar Nueva Perfumería -->
    <div v-if="isCreateModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-[#1B1917] border border-white/10 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        
        <div class="flex justify-between items-center border-b border-white/10 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span class="material-symbols-outlined text-xl">add_business</span>
            </div>
            <div>
              <h3 class="font-serif text-xl font-bold text-white">Aprovisionar Perfumería</h3>
              <p class="text-xs text-white/50">Crea una nueva tienda cliente en la nube</p>
            </div>
          </div>
          <button @click="isCreateModalOpen = false" class="text-white/40 hover:text-white transition-colors">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form @submit.prevent="handleCreateTenant" class="space-y-4 text-xs font-sans">
          
          <div>
            <label class="block font-label text-[11px] uppercase tracking-wider text-white/70 font-bold mb-1">
              Nombre Comercial
            </label>
            <input 
              v-model="newTenantForm.name"
              @blur="handleAutoSlug"
              type="text" 
              placeholder="Ej. Aromas de París, L'Elixir Boutique"
              required
              class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none text-xs"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-label text-[11px] uppercase tracking-wider text-white/70 font-bold mb-1">
                Identificador (Slug)
              </label>
              <input 
                v-model="newTenantForm.tenantId"
                type="text" 
                placeholder="ej. aromasparis"
                required
                class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none text-xs font-mono"
              />
            </div>

            <div>
              <label class="block font-label text-[11px] uppercase tracking-wider text-white/70 font-bold mb-1">
                Plan
              </label>
              <select 
                v-model="newTenantForm.plan"
                class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none text-xs"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro ($45k/mes)</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-label text-[11px] uppercase tracking-wider text-white/70 font-bold mb-1">
              Dominio Propio (Opcional)
            </label>
            <input 
              v-model="newTenantForm.domain"
              type="text" 
              placeholder="ej. aromasdeparis.com.ar"
              class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label class="block font-label text-[11px] uppercase tracking-wider text-white/70 font-bold mb-1">
              WhatsApp para Pedidos
            </label>
            <input 
              v-model="newTenantForm.whatsappNumber"
              type="text" 
              placeholder="5491122334455"
              class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none text-xs font-mono"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-label text-[11px] uppercase tracking-wider text-white/70 font-bold mb-1">
                Email del Dueño *
              </label>
              <input
                v-model="newTenantForm.adminEmail"
                type="email"
                required
                autocomplete="off"
                placeholder="duenio@perfumeria.com"
                class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none text-xs"
              />
            </div>
            <div>
              <label class="block font-label text-[11px] uppercase tracking-wider text-white/70 font-bold mb-1">
                Contraseña Inicial *
              </label>
              <input
                v-model="newTenantForm.adminPassword"
                type="text"
                required
                minlength="8"
                autocomplete="new-password"
                placeholder="Mínimo 8 caracteres"
                class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:border-amber-500 focus:outline-none text-xs font-mono"
              />
            </div>
          </div>

          <div class="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center gap-3">
            <input
              v-model="newTenantForm.seedStarter"
              type="checkbox" 
              id="seedStarterCheck"
              class="rounded border-white/20 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label for="seedStarterCheck" class="text-white/80 cursor-pointer leading-tight">
              <strong>Precargar Catálogo Sugerido:</strong> Incluirá 8 perfumes de alta demanda (Lattafa Asad, Yara, Khamrah, Sauvage, Bleu, etc.) con pirámides olfativas y tamaños listos para vender.
            </label>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button 
              type="button" 
              @click="isCreateModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-xs font-label uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-label uppercase tracking-wider font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <span v-if="isSubmitting" class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ isSubmitting ? 'Aprovisionando...' : 'Crear Tienda' }}</span>
            </button>
          </div>

        </form>

      </div>
    </div>

  </div>
</template>
