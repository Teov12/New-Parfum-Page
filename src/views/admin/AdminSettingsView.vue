<script setup>
import { ref, onMounted } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useToastStore } from '@/stores/toast'

const tenantStore = useTenantStore()
const toastStore = useToastStore()

const isSaving = ref(false)
const isTestingMp = ref(false)

const form = ref({
  name: '',
  branding: {
    tagline: '',
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
    cardFeeRate: 20,
    freeShippingThreshold: 250000,
    mpAccessToken: '',
    mpPublicKey: ''
  }
})

onMounted(async () => {
  await tenantStore.fetchCurrentTenant()
  form.value.name = tenantStore.name || 'Gicca Perfumes'
  form.value.branding = {
    tagline: tenantStore.branding?.tagline || '',
    whatsappNumber: tenantStore.branding?.whatsappNumber || '5493564622055',
    instagram: tenantStore.branding?.instagram || '@giccaparfum',
    primaryColor: tenantStore.branding?.primaryColor || '#D4AF37'
  }
  form.value.commercial = {
    alias: tenantStore.commercial?.alias || 'GICCA.PERFUMES.MP',
    cbu: tenantStore.commercial?.cbu || '0000003100010000000000',
    bankName: tenantStore.commercial?.bankName || 'Mercado Pago',
    accountHolder: tenantStore.commercial?.accountHolder || 'Gicca Perfumes S.A.',
    cuit: tenantStore.commercial?.cuit || '30-71829401-9',
    cardFeeRate: tenantStore.commercial?.cardFeeRate ?? 20,
    freeShippingThreshold: tenantStore.commercial?.freeShippingThreshold ?? 250000,
    mpAccessToken: tenantStore.commercial?.mpAccessToken || '',
    mpPublicKey: tenantStore.commercial?.mpPublicKey || ''
  }
})

const handleSave = async () => {
  isSaving.value = true
  try {
    const token = localStorage.getItem('gicca_admin_token')
    const res = await fetch('/api/tenant/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: form.value.name,
        branding: form.value.branding,
        commercial: form.value.commercial
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error al guardar configuración')
    }

    toastStore.show('¡Configuración de la perfumería y medios de pago guardada!', 'success')
    await tenantStore.fetchCurrentTenant()
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
          Ajustá la identidad de tu perfumería, datos para transferencias bancarias y tu pasarela de Mercado Pago.
        </p>
      </div>

      <button
        @click="handleSave"
        :disabled="isSaving"
        class="bg-primary-container text-on-primary hover:bg-inverse-surface font-label text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 self-start sm:self-auto font-bold"
      >
        <span class="material-symbols-outlined text-base">save</span>
        <span>{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</span>
      </button>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Columna Izquierda: Identidad & Branding (6 cols) -->
      <div class="lg:col-span-6 space-y-6">
        
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
                placeholder="Ej. Gicca Perfumes Boutique"
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
                  placeholder="5493564622055"
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
                  placeholder="@giccaparfum"
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
              <p class="text-[10px] text-secondary mt-1">Recargo aplicado sobre el precio de transferencia.</p>
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
              <p class="text-[10px] text-secondary mt-1">Superando este monto, Andreani es bonificado.</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Columna Derecha: Medios de Pago (6 cols) -->
      <div class="lg:col-span-6 space-y-6">
        
        <!-- 1. Transferencia Bancaria Directa -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-emerald-700">account_balance</span>
              <h2 class="font-sans text-base font-bold text-primary">Transferencia Bancaria (20% OFF)</h2>
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
                  placeholder="GICCA.PERFUMES.MP"
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
                  placeholder="Gicca Perfumes S.A."
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

        <!-- 2. Pasarela Mercado Pago -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div class="flex items-center justify-between border-b border-outline-variant pb-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-xl text-blue-600">credit_card</span>
              <h2 class="font-sans text-base font-bold text-primary">Mercado Pago (Tarjetas & Cuotas)</h2>
            </div>
            <span
              class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full"
              :class="form.commercial.mpAccessToken ? 'bg-blue-100 text-blue-800' : 'bg-surface-container text-secondary'"
            >
              {{ form.commercial.mpAccessToken ? 'Conectado' : 'Sin Configurar' }}
            </span>
          </div>

          <div class="space-y-4">
            <p class="text-xs text-secondary leading-relaxed">
              Ingresá tus credenciales de Mercado Pago para cobrar con tarjetas de crédito en hasta 3 o 6 cuotas directamente a tu cuenta bancaria.
            </p>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Mercado Pago Access Token (Producción)
              </label>
              <input
                v-model="form.commercial.mpAccessToken"
                type="password"
                placeholder="APP_USR-xxxxxxxxxxxxxxxx-xxxxxx..."
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
        class="w-full sm:w-auto bg-primary-container text-on-primary hover:bg-inverse-surface font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 font-bold"
      >
        <span class="material-symbols-outlined text-base">save</span>
        <span>{{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}</span>
      </button>
    </div>
  </div>
</template>
