<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'
import { useToastStore } from '@/stores/toast'
import { useAdminAuthStore } from '@/stores/adminAuth'

const tenantStore = useTenantStore()
const toastStore = useToastStore()
const adminAuthStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('gicca_admin_token') || ''}`
})

const platformInfo = ref({ name: '', domain: '', dnsTarget: '', mpOAuthEnabled: false })
const storeUrl = ref('')
// Dominio propio pendiente de verificación por registro TXT
const domainState = ref({ pendingDomain: '', domainVerification: null })
const limits = ref({ customDomain: true })

const isSaving = ref(false)
const isUploadingIcon = ref(false)

const LUXURY_ICONS = [
  { id: 'spa', label: 'Atelier / Loto', icon: 'spa' },
  { id: 'diamond', label: 'Diamante / Joya', icon: 'diamond' },
  { id: 'local_florist', label: 'Flor / Esencias', icon: 'local_florist' },
  { id: 'auto_awesome', label: 'Destellos / Magia', icon: 'auto_awesome' },
  { id: 'crown', label: 'Corona / Royal', icon: 'crown' },
  { id: 'flare', label: 'Resplandor / Aura', icon: 'flare' },
  { id: 'vital_signs', label: 'Línea de Vida', icon: 'vital_signs' },
  { id: 'all_inclusive', label: 'Infinito / Firma', icon: 'all_inclusive' },
  { id: 'verified', label: 'Garantía / Oficial', icon: 'verified' },
  { id: 'favorite', label: 'Favorito / Pasión', icon: 'favorite' }
]

const form = ref({
  name: '',
  domain: '',
  subdomain: '',
  branding: {
    tagline: '',
    logoUrl: '',
    iconUrl: '',
    storeIcon: 'spa',
    faviconUrl: '',
    whatsappNumber: '',
    instagram: '',
    primaryColor: '#D4AF37'
  },
  commercial: {
    alias: '',
    cbu: '',
    bankName: '',
    accountHolder: '',
    cuit: '',
    notificationEmail: '',
    cardFeeRate: 28,
    maxInstallments: 6,
    freeShippingThreshold: 250000,
    mpAccessToken: '',
    mpAccessTokenSet: false,
    mpAccessTokenHint: '',
    mpPublicKey: '',
    mpConnection: { method: '', nickname: '' },
    andreani: {
      username: '',
      password: '',
      passwordSet: false,
      clientCode: '',
      contractDomicilio: '',
      contractSucursal: '',
      contractUrgente: '',
      originZip: '',
      sandbox: true,
      disabled: false
    }
  },
  seo: {
    title: '',
    description: '',
    keywords: '',
    ogImage: ''
  }
})

// Mercado Pago queda conectado por token guardado (manual u OAuth) o por uno recién pegado
const mpConnected = computed(() => Boolean(form.value.commercial.mpAccessTokenSet || form.value.commercial.mpAccessToken))
const mpConnectedByOAuth = computed(() => form.value.commercial.mpConnection?.method === 'oauth')

const isTestingMp = ref(false)
const mpTestResult = ref(null)

const isCheckingDns = ref(false)
const dnsCheckResult = ref(null)

const verifyDomainDns = async () => {
  if (!form.value.domain) {
    toastStore.show('Por favor ingresá un dominio para verificar', 'warning')
    return
  }
  isCheckingDns.value = true
  dnsCheckResult.value = null
  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch('/api/tenant/verify-domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ domain: form.value.domain })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al verificar dominio')
    dnsCheckResult.value = data
    if (data.verified) {
      toastStore.show(data.verificationMessage, 'success')
      await loadSettings()
      return
    }
    if (data.verificationMessage) {
      toastStore.show(data.verificationMessage, 'info')
      return
    }
    if (data.hasRecords) {
      toastStore.show('¡Registros DNS detectados correctamente!', 'success')
    } else {
      toastStore.show('Aún no se detectan registros DNS para este dominio', 'info')
    }
  } catch (err) {
    dnsCheckResult.value = { success: false, message: err.message }
    toastStore.show(err.message, 'error')
  } finally {
    isCheckingDns.value = false
  }
}

const applySettings = (tenant) => {
  credentialsForm.value.email = tenant.adminEmail || credentialsForm.value.email
  storeUrl.value = tenant.storeUrl || ''
  domainState.value = { pendingDomain: tenant.pendingDomain || '', domainVerification: tenant.domainVerification || null }
  limits.value = tenant.limits || limits.value
  form.value.name = tenant.name || ''
  form.value.domain = tenant.pendingDomain || tenant.domain || ''
  form.value.subdomain = tenant.subdomain || ''
  form.value.branding = {
    ...form.value.branding,
    ...(tenant.branding || {}),
    instagram: tenant.branding?.instagram || tenant.branding?.instagramUrl || ''
  }
  form.value.seo = { ...form.value.seo, ...(tenant.seo || {}) }
  const commercial = tenant.commercial || {}
  form.value.commercial = {
    ...form.value.commercial,
    ...commercial,
    mpAccessToken: '',
    andreani: { ...form.value.commercial.andreani, ...(commercial.andreani || {}), password: '' }
  }
}

const loadSettings = async () => {
  const res = await fetch('/api/tenant/settings', { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar la configuración')
  const data = await res.json()
  if (data?.tenant) applySettings(data.tenant)
  if (data?.platform) platformInfo.value = { ...platformInfo.value, ...data.platform }
}

onMounted(async () => {
  try {
    await loadSettings()
  } catch (e) {
    toastStore.show(e.message, 'error')
  }

  fetch('/api/platform/info')
    .then(r => r.ok ? r.json() : null)
    .then(info => { if (info) platformInfo.value = { ...platformInfo.value, mpOAuthEnabled: info.mpOAuthEnabled } })
    .catch(() => {})

  // Vuelta desde la autorización de Mercado Pago
  if (route.query.mp === 'conectado') {
    toastStore.show('¡Tu cuenta de Mercado Pago quedó conectada!', 'success')
    router.replace({ query: {} })
  } else if (route.query.mp === 'error') {
    toastStore.show(`No se pudo conectar Mercado Pago: ${route.query.detalle || 'intentá de nuevo'}`, 'error')
    router.replace({ query: {} })
  }
})

// Conexión de Mercado Pago en un clic (OAuth de la plataforma)
const isConnectingMp = ref(false)
const connectMercadoPago = async () => {
  isConnectingMp.value = true
  try {
    const res = await fetch('/api/mercadopago/oauth/start', { headers: authHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar la conexión')
    window.location.href = data.url
  } catch (err) {
    toastStore.show(err.message, 'error')
    isConnectingMp.value = false
  }
}

const disconnectMercadoPago = async () => {
  if (!confirm('¿Desconectar Mercado Pago? Tus clientes no van a poder pagar con tarjeta hasta que lo vuelvas a conectar.')) return
  try {
    await tenantStore.updateSettings({ commercial: { clearMpCredentials: true } })
    await loadSettings()
    toastStore.show('Mercado Pago desconectado', 'info')
  } catch (err) {
    toastStore.show(err.message, 'error')
  }
}

// Equipo: usuarios con acceso a pedidos y catálogo
const staff = ref([])
const staffLimit = ref(null)
const staffForm = ref({ name: '', email: '', password: '' })
const isSavingStaff = ref(false)

const loadStaff = async () => {
  const res = await fetch('/api/staff', { headers: authHeaders() })
  if (!res.ok) return
  const data = await res.json()
  staff.value = data.staff || []
  staffLimit.value = data.limit
}

const addStaffMember = async () => {
  isSavingStaff.value = true
  try {
    const res = await fetch('/api/staff', { method: 'POST', headers: authHeaders(), body: JSON.stringify(staffForm.value) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo crear el usuario')
    staffForm.value = { name: '', email: '', password: '' }
    toastStore.show('Usuario agregado. Compartile su email y contraseña.', 'success')
    await loadStaff()
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isSavingStaff.value = false
  }
}

const removeStaffMember = async (member) => {
  if (!confirm(`¿Quitar el acceso de ${member.email}?`)) return
  const res = await fetch(`/api/staff/${member.id}`, { method: 'DELETE', headers: authHeaders() })
  if (res.ok) {
    toastStore.show('Acceso quitado', 'info')
    await loadStaff()
  } else {
    toastStore.show('No se pudo quitar el acceso', 'error')
  }
}

onMounted(loadStaff)

// Acceso al panel: email y contraseña propios del dueño de la tienda
const credentialsForm = ref({ email: '', currentPassword: '', newPassword: '', confirmPassword: '' })
const isSavingCredentials = ref(false)

const handleSaveCredentials = async () => {
  const { email, currentPassword, newPassword, confirmPassword } = credentialsForm.value
  if (newPassword.length < 8) {
    toastStore.show('La nueva contraseña debe tener al menos 8 caracteres', 'warning')
    return
  }
  if (newPassword !== confirmPassword) {
    toastStore.show('Las contraseñas nuevas no coinciden', 'warning')
    return
  }

  isSavingCredentials.value = true
  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch('/api/auth/credentials', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email, currentPassword, newPassword })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudieron actualizar las credenciales')
    credentialsForm.value = { email, currentPassword: '', newPassword: '', confirmPassword: '' }
    toastStore.show('Credenciales actualizadas. Ingresá con tu nuevo email y contraseña.', 'success')
    adminAuthStore.logout(false)
    router.push('/admin/login')
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isSavingCredentials.value = false
  }
}

const handleTestMercadoPago = async () => {
  if (!mpConnected.value) {
    toastStore.show('Ingresá primero el Access Token de Mercado Pago', 'error')
    return
  }
  isTestingMp.value = true
  mpTestResult.value = null
  try {
    const token = localStorage.getItem('gicca_admin_token') || ''
    const res = await fetch('/api/checkout/test-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        accessToken: form.value.commercial.mpAccessToken
      })
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      mpTestResult.value = {
        success: false,
        message: data.error || 'Credenciales inválidas en Mercado Pago'
      }
      toastStore.show(data.error || 'Error al validar credenciales', 'error')
      return
    }

    mpTestResult.value = {
      success: true,
      message: data.message,
      account: data.account
    }
    toastStore.show('¡Credenciales de Mercado Pago verificadas y listas para cobrar!', 'success')
  } catch (err) {
    mpTestResult.value = {
      success: false,
      message: err.message || 'Error de conexión con Mercado Pago'
    }
    toastStore.show(err.message || 'Error al probar credenciales', 'error')
  } finally {
    isTestingMp.value = false
  }
}

const handleIconUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  isUploadingIcon.value = true
  try {
    toastStore.show('Subiendo ícono de la tienda...', 'info')
    const url = await tenantStore.uploadIcon(file)
    form.value.branding.iconUrl = url
    toastStore.show('¡Ícono subido con éxito! Presioná "Guardar Cambios" para aplicarlo.', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al subir ícono', 'error')
  } finally {
    isUploadingIcon.value = false
    event.target.value = ''
  }
}

const clearCustomIcon = () => {
  form.value.branding.iconUrl = ''
  toastStore.show('Se eliminó la imagen del ícono. Usando símbolo predeterminado.', 'info')
}

const handleSave = async () => {
  isSaving.value = true
  try {
    // Las credenciales vacías no se envían: el servidor conserva las guardadas
    const { mpAccessTokenSet, mpAccessTokenHint, mpConnection, andreani, ...commercial } = form.value.commercial
    const { passwordSet, ...andreaniData } = andreani
    await tenantStore.updateSettings({
      name: form.value.name,
      domain: form.value.domain,
      subdomain: form.value.subdomain,
      branding: form.value.branding,
      seo: form.value.seo,
      commercial: { ...commercial, andreani: andreaniData }
    })
    await loadSettings()

    toastStore.show('¡Configuración de la tienda, dominio y medios de pago guardada!', 'success')
  } catch (err) {
    console.error(err)
    toastStore.show(err.message || 'Error al guardar cambios', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-300">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-6">
      <div>
        <h1 class="font-sans text-2xl sm:text-3xl text-primary font-normal">Configuración de Tienda & Medios de Pago</h1>
        <p class="font-sans text-xs text-secondary mt-1">
          Ajustá el ícono de la marca, identidad visual, datos bancarios para transferencias y tu pasarela de Mercado Pago.
        </p>
      </div>

      <button
        @click="handleSave"
        :disabled="isSaving"
        class="bg-primary-container text-on-primary hover:bg-inverse-surface font-label text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 self-start sm:self-auto font-bold cursor-pointer"
      >
        <span class="material-symbols-outlined text-base">save</span>
        <span>{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</span>
      </button>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
      
      <!-- Columna Izquierda: Ícono & Identidad (6 cols) -->
      <div class="xl:col-span-6 space-y-6">
        
        <!-- Tarjeta Ícono & Logotipo de la Tienda -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-primary">token</span>
              <div>
                <h2 class="font-sans text-base font-bold text-primary">Ícono & Logotipo de la Tienda</h2>
                <p class="text-[11px] text-secondary">Visible en la barra de navegación, pie de página, favicon y panel admin.</p>
              </div>
            </div>
            <span class="text-[10px] font-label uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-950 font-bold border border-amber-300/60">
              Ícono Tienda
            </span>
          </div>

          <!-- 1. Imagen / Archivo Personalizado -->
          <div class="space-y-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-2">
                1. Subir Imagen o Logo Personalizado (PNG, SVG, ICO, JPG)
              </label>
              
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <label 
                  class="cursor-pointer bg-surface-container hover:bg-surface-container-high border border-dashed border-outline-variant hover:border-primary rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-xs font-label uppercase tracking-wider text-primary font-bold transition-all shadow-2xs group flex-grow"
                  :class="isUploadingIcon ? 'opacity-50 pointer-events-none' : ''"
                >
                  <span class="material-symbols-outlined text-lg text-primary group-hover:scale-110 transition-transform">
                    {{ isUploadingIcon ? 'hourglass_top' : 'cloud_upload' }}
                  </span>
                  <span>{{ isUploadingIcon ? 'Subiendo archivo...' : 'Seleccionar Archivo de Imagen' }}</span>
                  <input 
                    type="file" 
                    accept="image/*,.ico,.svg" 
                    class="hidden" 
                    @change="handleIconUpload" 
                  />
                </label>

                <button 
                  v-if="form.branding.iconUrl"
                  type="button"
                  @click="clearCustomIcon"
                  class="px-3.5 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-label uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                  title="Eliminar imagen y volver a símbolo"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                  <span>Quitar</span>
                </button>
              </div>

              <!-- Input directo URL de imagen opcional -->
              <div class="mt-2.5">
                <input 
                  v-model="form.branding.iconUrl" 
                  type="text" 
                  placeholder="O ingresá aquí el enlace directo a tu imagen (https://...)" 
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <!-- 2. Símbolo Insignia de Alta Gama (Fallback / Vectorial) -->
            <div class="pt-4 border-t border-outline-variant">
              <div class="flex items-center justify-between mb-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">
                  2. O elegir Símbolo de Alta Gama
                </label>
                <span class="text-[10px] text-secondary font-sans">
                  {{ form.branding.iconUrl ? '(Inactivo mientras haya imagen)' : 'Activo como ícono principal' }}
                </span>
              </div>

              <!-- Presets Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  v-for="item in LUXURY_ICONS"
                  :key="item.id"
                  type="button"
                  @click="form.branding.storeIcon = item.icon"
                  class="p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                  :class="form.branding.storeIcon === item.icon && !form.branding.iconUrl
                    ? 'bg-primary text-amber-200 border-primary font-bold shadow-xs scale-102 ring-2 ring-amber-400/40' 
                    : 'bg-surface-container border-outline-variant/80 text-secondary hover:text-primary hover:border-primary/50'"
                >
                  <span class="material-symbols-outlined text-xl">{{ item.icon }}</span>
                  <span class="text-[10px] font-label uppercase tracking-wider truncate w-full">{{ item.label }}</span>
                </button>
              </div>

              <!-- Input para nombre libre de Material Symbol -->
              <div class="mt-3 flex items-center gap-2">
                <span class="text-[11px] text-secondary font-label uppercase tracking-wider flex-shrink-0">Nombre de símbolo:</span>
                <input 
                  v-model="form.branding.storeIcon" 
                  type="text" 
                  placeholder="spa, diamond, local_florist, auto_awesome..." 
                  class="flex-grow bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <!-- 3. Previsualizaciones en Vivo (Live Preview) -->
            <div class="pt-4 border-t border-outline-variant space-y-3">
              <span class="block font-label text-xs uppercase tracking-widest text-secondary font-bold">
                Previsualización en Vivo
              </span>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Preview Navbar -->
                <div class="bg-surface border border-outline-variant rounded-xl p-3 shadow-2xs space-y-1.5">
                  <span class="text-[9px] font-label uppercase tracking-widest text-secondary font-semibold block">Navbar Público</span>
                  <div class="flex items-center gap-2 p-2 bg-surface-container/50 rounded-lg border border-outline-variant/60">
                    <img 
                      v-if="form.branding.iconUrl" 
                      :src="form.branding.iconUrl" 
                      alt="Ícono" 
                      class="w-7 h-7 object-contain rounded-md"
                    />
                    <div 
                      v-else 
                      class="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-container text-amber-200 flex items-center justify-center flex-shrink-0 shadow-2xs"
                    >
                      <span class="material-symbols-outlined text-base">{{ form.branding.storeIcon || 'spa' }}</span>
                    </div>
                    <span class="font-sans text-sm font-bold text-primary truncate">
                      {{ form.name || 'Mi Tienda' }}
                    </span>
                  </div>
                </div>

                <!-- Preview Favicon Browser Tab -->
                <div class="bg-surface border border-outline-variant rounded-xl p-3 shadow-2xs space-y-1.5">
                  <span class="text-[9px] font-label uppercase tracking-widest text-secondary font-semibold block">Pestaña del Navegador (Favicon)</span>
                  <div class="flex items-center gap-2 p-2 bg-slate-100 rounded-lg border border-slate-300/80">
                    <img 
                      v-if="form.branding.iconUrl" 
                      :src="form.branding.iconUrl" 
                      alt="Favicon" 
                      class="w-4 h-4 object-contain rounded-2xs"
                    />
                    <div 
                      v-else 
                      class="w-4 h-4 rounded-2xs bg-primary text-amber-300 flex items-center justify-center flex-shrink-0 text-[9px] font-serif font-bold"
                    >
                      {{ (form.name || 'G').charAt(0).toUpperCase() }}
                    </div>
                    <span class="text-xs text-slate-800 truncate font-sans">
                      {{ form.name || 'Mi Tienda' }} | Boutique
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tarjeta Identidad -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div class="flex items-center gap-3 border-b border-outline-variant pb-3">
            <span class="material-symbols-outlined text-xl text-primary">store</span>
            <h2 class="font-sans text-base font-bold text-primary">Identidad de la Perfumería</h2>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Nombre de la Tienda *
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ej. Aromas de París"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Eslogan / Bajada
              </label>
              <input
                v-model="form.branding.tagline"
                type="text"
                placeholder="Ej. Alta Perfumería & Fragancias de Autor"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  WhatsApp de Pedidos *
                </label>
                <input
                  v-model="form.branding.whatsappNumber"
                  type="text"
                  placeholder="5491122334455"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
                <p class="text-[10px] text-secondary mt-1">Con código de país y área (sin espacios ni guiones).</p>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  Usuario Instagram
                </label>
                <input
                  v-model="form.branding.instagram"
                  type="text"
                  placeholder="@tuperfumeria"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  Email de contacto (visible en la tienda)
                </label>
                <input
                  v-model="form.branding.contactEmail"
                  type="email"
                  placeholder="hola@tuperfumeria.com"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Tarjeta Políticas Comerciales -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div class="flex items-center gap-3 border-b border-outline-variant pb-3">
            <span class="material-symbols-outlined text-xl text-primary">percent</span>
            <h2 class="font-sans text-base font-bold text-primary">Políticas Comerciales & Envíos</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Recargo por Tarjeta / MP (%)
              </label>
              <div class="relative">
                <input
                  v-model.number="form.commercial.cardFeeRate"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 pr-8 text-sm font-sans focus:border-primary focus:outline-none"
                />
                <span class="absolute right-3 top-3 text-xs text-secondary font-bold">%</span>
              </div>
              <p class="text-[10px] text-secondary mt-1">Porcentaje para absorber hasta 6 cuotas de Mercado Pago (Recomendado: 28%).</p>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Envío Gratis a partir de ($)
              </label>
              <input
                v-model.number="form.commercial.freeShippingThreshold"
                type="number"
                min="0"
                step="5000"
                placeholder="250000"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
              />
              <p class="text-[10px] text-secondary mt-1">Superando este monto, Andreani es bonificado. Poné 0 si no ofrecés envío gratis.</p>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Cuotas máximas con tarjeta
              </label>
              <input
                v-model.number="form.commercial.maxInstallments"
                type="number"
                min="1"
                max="24"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Email para avisos de ventas
              </label>
              <input
                v-model="form.commercial.notificationEmail"
                type="email"
                placeholder="ventas@miperfumeria.com"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
              />
              <p class="text-[10px] text-secondary mt-1">Recibís cada venta y tus clientes te responden a este email.</p>
            </div>
          </div>
        </div>

        <!-- Tarjeta SEO -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div class="flex items-center gap-3 border-b border-outline-variant pb-3">
            <span class="material-symbols-outlined text-xl text-primary">travel_explore</span>
            <div>
              <h2 class="font-sans text-base font-bold text-primary">Google y vista previa al compartir</h2>
              <p class="text-[11px] text-secondary">Cómo aparece tu tienda en Google, WhatsApp e Instagram.</p>
            </div>
          </div>
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Título</label>
            <input v-model="form.seo.title" type="text" maxlength="70" placeholder="Ej. Aromas de París | Perfumes importados originales" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Descripción</label>
            <textarea v-model="form.seo.description" rows="3" maxlength="300" placeholder="Qué vendés, envíos, cuotas..." class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm focus:border-primary focus:outline-none"></textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Palabras clave</label>
              <input v-model="form.seo.keywords" type="text" placeholder="perfumes árabes, decants..." class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Imagen para compartir (URL)</label>
              <input v-model="form.seo.ogImage" type="text" placeholder="https://..." class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Tarjeta Dominio Propio & DNS -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-primary">language</span>
              <div>
                <h2 class="font-sans text-base font-bold text-primary">Tu Dominio Propio & DNS</h2>
                <p class="text-xs text-secondary">Vincula tu propio dominio web o subdominio de marca</p>
              </div>
            </div>
            <span 
              :class="form.domain ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-surface-container text-secondary border-outline-variant'"
              class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border shadow-2xs font-mono"
            >
              {{ form.domain ? 'Personalizado' : 'Predeterminado' }}
            </span>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Dominio Web Principal
              </label>
              <div class="flex gap-2">
                <input
                  v-model="form.domain"
                  type="text"
                  placeholder="ej. miperfumeria.com.ar"
                  class="flex-1 bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  @click="verifyDomainDns"
                  :disabled="isCheckingDns || !form.domain"
                  class="px-4 py-3 bg-surface border border-outline-variant hover:border-primary text-primary font-label text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <span v-if="isCheckingDns" class="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                  <span v-else class="material-symbols-outlined text-sm">dns</span>
                  <span>{{ isCheckingDns ? 'Comprobando...' : 'Verificar DNS' }}</span>
                </button>
              </div>
              <p class="text-[11px] text-secondary mt-1">Escribe tu dominio sin https:// ni barras (ej: miperfumeria.com.ar).</p>
              <p v-if="storeUrl" class="text-[11px] text-secondary mt-1">Dirección actual de tu tienda: <a :href="storeUrl" target="_blank" class="underline font-mono">{{ storeUrl }}</a></p>
              <p v-if="!limits.customDomain" class="text-[11px] text-amber-800 mt-1">El dominio propio está disponible desde el plan Profesional.</p>
            </div>

            <!-- Verificación del dominio propio -->
            <div v-if="domainState.domainVerification" class="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-xs text-amber-950 space-y-2">
              <p class="font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm">pending</span>
                {{ domainState.pendingDomain }} está pendiente de verificación
              </p>
              <p>Para confirmar que el dominio es tuyo, agregá este registro en tu proveedor de dominio y después tocá "Verificar DNS":</p>
              <div class="bg-surface p-3 rounded-lg border border-outline-variant font-mono text-[11px] space-y-1 break-all">
                <div>Tipo: <strong>{{ domainState.domainVerification.type }}</strong></div>
                <div>Nombre: <strong>{{ domainState.domainVerification.name }}</strong></div>
                <div>Valor: <strong>{{ domainState.domainVerification.value }}</strong></div>
              </div>
            </div>

            <!-- Alerta Diagnóstico DNS -->
            <div v-if="dnsCheckResult" :class="dnsCheckResult.hasRecords ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' : 'bg-amber-50/80 border-amber-300 text-amber-950'" class="p-3.5 rounded-xl border text-xs leading-relaxed space-y-1">
              <div class="flex items-center gap-2 font-bold">
                <span class="material-symbols-outlined text-sm">{{ dnsCheckResult.hasRecords ? 'check_circle' : 'info' }}</span>
                <span>{{ dnsCheckResult.hasRecords ? 'Registros DNS Encontrados' : 'Propagación en Progreso o Incompleta' }}</span>
              </div>
              <p>{{ dnsCheckResult.message }}</p>
            </div>

            <!-- Guía DNS -->
            <div class="bg-surface-container/70 border border-outline-variant/80 rounded-xl p-4 space-y-3">
              <div class="flex items-center gap-2 text-xs font-bold text-primary">
                <span class="material-symbols-outlined text-base text-secondary">tune</span>
                <span>Instrucciones de Configuración DNS</span>
              </div>
              <div class="text-xs text-secondary space-y-2 font-sans">
                <p>En el panel de tu proveedor de dominio (NIC Argentina, DonWeb, GoDaddy, Cloudflare, etc.), añade estos registros:</p>
                <div class="bg-surface p-3 rounded-lg border border-outline-variant font-mono text-[11px] space-y-1">
                  <div class="flex justify-between border-b border-outline-variant/60 pb-1 text-secondary">
                    <span>Tipo: <strong>A</strong></span>
                    <span>Host: <strong>@</strong></span>
                    <span>Destino: <strong>{{ platformInfo.dnsTarget || 'IP del servidor de la plataforma' }}</strong></span>
                  </div>
                  <div class="flex justify-between pt-1 text-secondary">
                    <span>Tipo: <strong>CNAME</strong></span>
                    <span>Host: <strong>www</strong></span>
                    <span>Destino: <strong>{{ form.domain || 'tu-dominio.com.ar' }}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Columna Derecha: Medios de Pago (6 cols) -->
      <div class="xl:col-span-6 space-y-6">
        
        <!-- 1. Transferencia Bancaria Directa -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-emerald-700">account_balance</span>
              <h2 class="font-sans text-base font-bold text-primary">Transferencia Bancaria ({{ form.commercial.cardFeeRate || 28 }}% OFF)</h2>
            </div>
            <span class="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Activo
            </span>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  Alias Bancario *
                </label>
                <input
                  v-model="form.commercial.alias"
                  type="text"
                  placeholder="MI.PERFUMERIA.MP"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 font-mono text-sm focus:border-primary focus:outline-none font-bold text-emerald-800"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  Nombre del Banco *
                </label>
                <input
                  v-model="form.commercial.bankName"
                  type="text"
                  placeholder="Mercado Pago / Banco Galicia"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                CBU o CVU (22 dígitos) *
              </label>
              <input
                v-model="form.commercial.cbu"
                type="text"
                maxlength="22"
                placeholder="0000003100010000000000"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 font-mono text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  Titular de la Cuenta *
                </label>
                <input
                  v-model="form.commercial.accountHolder"
                  type="text"
                  placeholder="Nombre del titular de la cuenta"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  CUIT / CUIL
                </label>
                <input
                  v-model="form.commercial.cuit"
                  type="text"
                  placeholder="30-71829401-9"
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Andreani -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-rose-700">local_shipping</span>
              <h2 class="font-sans text-base font-bold text-primary">Andreani</h2>
            </div>
            <label class="flex items-center gap-2 text-xs text-secondary cursor-pointer">
              <input v-model="form.commercial.andreani.disabled" type="checkbox" class="rounded border-outline-variant" />
              No ofrecer Andreani
            </label>
          </div>
          <p class="text-xs text-secondary leading-relaxed">
            Con tu cuenta de Andreani las cotizaciones son las de tu contrato y podés generar etiquetas desde Ventas. Sin cuenta, mostramos tarifas de referencia.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input v-model="form.commercial.andreani.username" type="text" autocomplete="off" placeholder="Usuario API" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.password" type="password" autocomplete="new-password" :placeholder="form.commercial.andreani.passwordSet ? 'Contraseña guardada (vacío = mantener)' : 'Contraseña API'" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.clientCode" type="text" placeholder="Código de cliente" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.originZip" type="text" placeholder="CP de origen (ej. 5000)" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.contractDomicilio" type="text" placeholder="Contrato a domicilio" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.contractSucursal" type="text" placeholder="Contrato a sucursal" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
          </div>
          <p class="text-[11px] text-secondary font-bold uppercase tracking-wider pt-1">Dirección de despacho (remitente)</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input v-model="form.commercial.andreani.originStreet" type="text" placeholder="Calle" class="col-span-2 w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.originNumber" type="text" placeholder="Número" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.originCity" type="text" placeholder="Localidad" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            <input v-model="form.commercial.andreani.originProvince" type="text" placeholder="Provincia" class="col-span-2 sm:col-span-4 w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
          </div>
          <p class="text-[10px] text-secondary">El remitente usa la razón social y el CUIT cargados en Legales.</p>
          <label class="flex items-center gap-2 text-xs text-secondary cursor-pointer">
            <input v-model="form.commercial.andreani.sandbox" type="checkbox" class="rounded border-outline-variant" />
            Modo prueba (sandbox de Andreani)
          </label>
        </div>

        <!-- Acceso al panel -->
        <form @submit.prevent="handleSaveCredentials" class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div class="flex items-center gap-3 border-b border-outline-variant pb-3">
            <span class="material-symbols-outlined text-xl text-primary">admin_panel_settings</span>
            <h2 class="font-sans text-base font-bold text-primary">Acceso al Panel</h2>
          </div>
          <p class="text-xs text-secondary leading-relaxed">
            Email y contraseña con los que ingresás a este panel. Solo vos tenés acceso: guardalos en un lugar seguro.
          </p>
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Email de acceso</label>
            <input v-model="credentialsForm.email" type="email" required autocomplete="username" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Contraseña actual</label>
            <input v-model="credentialsForm.currentPassword" type="password" required autocomplete="current-password" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Nueva contraseña</label>
              <input v-model="credentialsForm.newPassword" type="password" required minlength="8" autocomplete="new-password" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Repetir contraseña</label>
              <input v-model="credentialsForm.confirmPassword" type="password" required minlength="8" autocomplete="new-password" class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-xs focus:border-primary focus:outline-none" />
            </div>
          </div>
          <button
            type="submit"
            :disabled="isSavingCredentials"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-primary font-label text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <span class="material-symbols-outlined text-sm">lock_reset</span>
            <span>{{ isSavingCredentials ? 'Guardando...' : 'Actualizar acceso' }}</span>
          </button>
        </form>

        <!-- Equipo -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-primary">group</span>
              <h2 class="font-sans text-base font-bold text-primary">Equipo</h2>
            </div>
            <span class="text-[10px] font-mono text-secondary">{{ staff.length }} / {{ staffLimit ?? '∞' }}</span>
          </div>
          <p class="text-xs text-secondary">Usuarios que gestionan pedidos y catálogo, sin acceso a configuración, cobros ni finanzas.</p>
          <ul v-if="staff.length" class="divide-y divide-outline-variant/60 text-xs">
            <li v-for="member in staff" :key="member.id" class="flex items-center justify-between py-2">
              <span><strong>{{ member.name || member.email }}</strong> <span class="text-secondary">{{ member.name ? member.email : '' }}</span></span>
              <button type="button" @click="removeStaffMember(member)" class="text-rose-700 underline">Quitar</button>
            </li>
          </ul>
          <form @submit.prevent="addStaffMember" class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input v-model="staffForm.name" type="text" placeholder="Nombre" class="bg-surface-container border border-outline-variant rounded-xl p-2.5 text-xs focus:border-primary focus:outline-none" />
            <input v-model="staffForm.email" type="email" required placeholder="Email" class="bg-surface-container border border-outline-variant rounded-xl p-2.5 text-xs focus:border-primary focus:outline-none" />
            <input v-model="staffForm.password" type="password" required minlength="8" autocomplete="new-password" placeholder="Contraseña (8+)" class="bg-surface-container border border-outline-variant rounded-xl p-2.5 text-xs focus:border-primary focus:outline-none" />
            <button type="submit" :disabled="isSavingStaff" class="sm:col-span-3 px-4 py-2.5 rounded-xl border border-outline-variant hover:border-primary text-primary font-label text-xs uppercase tracking-wider font-bold disabled:opacity-50">
              {{ isSavingStaff ? 'Agregando...' : 'Agregar usuario' }}
            </button>
          </form>
        </div>

        <!-- 2. Pasarela Mercado Pago -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-blue-600">credit_card</span>
              <h2 class="font-sans text-base font-bold text-primary">Mercado Pago (Tarjetas & Cuotas)</h2>
            </div>
            <span
              class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full"
              :class="mpConnected ? 'bg-blue-100 text-blue-800' : 'bg-surface-container text-secondary'"
            >
              {{ mpConnected ? 'Conectado' : 'Sin Configurar' }}
            </span>
          </div>

          <div class="space-y-4">
            <p class="text-xs text-secondary leading-relaxed">
              Cobrá con tarjetas de crédito en cuotas directamente en tu cuenta de Mercado Pago.
            </p>

            <div v-if="platformInfo.mpOAuthEnabled" class="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
              <template v-if="mpConnectedByOAuth">
                <p class="text-xs text-blue-900">
                  Cuenta conectada<span v-if="form.commercial.mpConnection.nickname">: <strong>{{ form.commercial.mpConnection.nickname }}</strong></span>
                </p>
                <button type="button" @click="disconnectMercadoPago" class="text-xs underline text-rose-700">Desconectar Mercado Pago</button>
              </template>
              <template v-else>
                <button
                  type="button"
                  @click="connectMercadoPago"
                  :disabled="isConnectingMp"
                  class="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#009ee3] hover:bg-[#0088c4] text-white font-label text-xs uppercase tracking-wider font-bold disabled:opacity-60"
                >
                  <span class="material-symbols-outlined text-base">link</span>
                  {{ isConnectingMp ? 'Abriendo Mercado Pago...' : 'Conectar mi cuenta de Mercado Pago' }}
                </button>
                <p class="text-[11px] text-blue-900/80">Es la forma recomendada: no necesitás copiar credenciales. Si preferís, podés cargarlas manualmente abajo.</p>
              </template>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Mercado Pago Access Token (Producción)
              </label>
              <input
                v-model="form.commercial.mpAccessToken"
                type="password"
                autocomplete="off"
                :placeholder="form.commercial.mpAccessTokenSet ? `Guardado: ${form.commercial.mpAccessTokenHint} (dejalo vacío para mantenerlo)` : 'APP_USR-xxxxxxxxxxxxxxxx-xxxxxx...'"
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 font-mono text-xs focus:border-primary focus:outline-none"
              />
              <p class="text-[10px] text-secondary mt-1">Obtenelo en: Mercado Pago Developers &gt; Tus Credenciales.</p>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Mercado Pago Public Key (Producción)
              </label>
              <input
                v-model="form.commercial.mpPublicKey"
                type="text"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 font-mono text-xs focus:border-primary focus:outline-none"
              />
            </div>

            <!-- Test Connection Button & Result -->
            <div class="flex flex-col gap-2 pt-1">
              <button
                type="button"
                @click="handleTestMercadoPago"
                :disabled="isTestingMp || !mpConnected"
                class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-600/30 bg-blue-50 text-blue-800 hover:bg-blue-100 font-label text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span v-if="isTestingMp" class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span v-else class="material-symbols-outlined text-sm">verified_user</span>
                <span>{{ isTestingMp ? 'Verificando con Mercado Pago...' : 'Verificar Conexión con Mercado Pago' }}</span>
              </button>

              <div
                v-if="mpTestResult"
                class="p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all"
                :class="mpTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'"
              >
                <span class="material-symbols-outlined text-base mt-0.5 shrink-0">
                  {{ mpTestResult.success ? 'check_circle' : 'error' }}
                </span>
                <div class="space-y-0.5">
                  <p class="font-bold">{{ mpTestResult.message }}</p>
                  <p v-if="mpTestResult.account" class="text-[11px] opacity-90">
                    Cuenta: {{ mpTestResult.account.email }} ({{ mpTestResult.account.country }})
                  </p>
                </div>
              </div>
            </div>

            <div class="p-4 bg-blue-50/60 rounded-xl border border-blue-200/70 text-xs text-blue-900 space-y-1.5">
              <div class="font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-base">info</span>
                <span>¿Cómo conseguir tus claves de Mercado Pago?</span>
              </div>
              <ol class="list-decimal list-inside space-y-0.5 text-[11px] text-blue-800">
                <li>Ingresá a <a href="https://www.mercadopago.com.ar/developers" target="_blank" class="underline font-bold">mercadopago.com.ar/developers</a> con tu cuenta de MP.</li>
                <li>Hacé click en <strong>Tus Integraciones</strong> &gt; <strong>Crear Aplicación</strong>.</li>
                <li>Copiá el <strong>Access Token de Producción</strong> y pegalo en el casillero de arriba.</li>
              </ol>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- Floating bottom bar on mobile -->
    <div class="pt-4 flex justify-end">
      <button
        @click="handleSave"
        :disabled="isSaving"
        class="w-full sm:w-auto bg-primary-container text-on-primary hover:bg-inverse-surface font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 font-bold cursor-pointer"
      >
        <span class="material-symbols-outlined text-base">save</span>
        <span>{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</span>
      </button>
    </div>
  </div>
</template>
