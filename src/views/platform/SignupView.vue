<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const info = ref({ name: 'Perfumerías Online', domain: '', trialDays: 14, plans: [], signupEnabled: true })
const form = ref({
  storeName: '',
  subdomain: '',
  email: '',
  password: '',
  whatsappNumber: '',
  plan: ['basic', 'pro', 'enterprise'].includes(route.query.plan) ? route.query.plan : 'pro',
  seedStarter: true,
  acceptTerms: false
})
const subdomainEdited = ref(false)
const availability = ref(null) // null | { subdomain, available }
const isChecking = ref(false)
const isSubmitting = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/api/platform/info')
    if (res.ok) info.value = await res.json()
  } catch {
    // Valores por defecto
  }
})

const slugify = (value) => String(value || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

watch(() => form.value.storeName, (name) => {
  if (!subdomainEdited.value) form.value.subdomain = slugify(name)
})

let checkTimeout
watch(() => form.value.subdomain, (value) => {
  availability.value = null
  clearTimeout(checkTimeout)
  const clean = slugify(value)
  if (clean.length < 3) return
  checkTimeout = setTimeout(async () => {
    isChecking.value = true
    try {
      const res = await fetch(`/api/platform/subdomain-available?name=${encodeURIComponent(clean)}`)
      availability.value = await res.json()
    } catch {
      availability.value = null
    } finally {
      isChecking.value = false
    }
  }, 350)
})

const storeAddress = computed(() => {
  const sub = slugify(form.value.subdomain) || 'tu-tienda'
  return info.value.domain ? `${sub}.${info.value.domain}` : sub
})

const canSubmit = computed(() =>
  form.value.storeName.trim().length >= 2 &&
  form.value.email.includes('@') &&
  form.value.password.length >= 8 &&
  form.value.acceptTerms &&
  availability.value?.available !== false &&
  !isSubmitting.value
)

const handleSubmit = async () => {
  error.value = ''
  isSubmitting.value = true
  try {
    const res = await fetch('/api/platform/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form.value, subdomain: slugify(form.value.subdomain) })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'No pudimos crear tu tienda')
    // Entra directo al panel de la tienda nueva
    window.location.href = data.adminUrl
  } catch (err) {
    error.value = err.message
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#11100F] text-[#F3EFEA] font-sans flex flex-col">
    <header class="max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
      <RouterLink to="/plataforma" class="font-serif text-lg tracking-wide">{{ info.name }}</RouterLink>
      <RouterLink to="/admin/login" class="text-xs font-label uppercase tracking-wider text-white/70 hover:text-white">Ya tengo tienda</RouterLink>
    </header>

    <main class="flex-1 flex items-start sm:items-center justify-center px-4 py-8">
      <form @submit.prevent="handleSubmit" class="w-full max-w-lg bg-[#1B1917] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div class="space-y-1">
          <h1 class="font-serif text-3xl">Creá tu tienda</h1>
          <p class="text-sm text-white/60">{{ info.trialDays }} días gratis. Sin tarjeta para empezar.</p>
        </div>

        <div v-if="!info.signupEnabled" class="text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200">
          El registro de tiendas no está disponible en este momento.
        </div>

        <label class="block space-y-1.5">
          <span class="text-[11px] font-label uppercase tracking-wider text-white/70 font-bold">Nombre de tu perfumería</span>
          <input v-model="form.storeName" required maxlength="80" placeholder="Ej: Aromas de París" class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-sm focus:border-amber-500 focus:outline-none" />
        </label>

        <label class="block space-y-1.5">
          <span class="text-[11px] font-label uppercase tracking-wider text-white/70 font-bold">Dirección de tu tienda</span>
          <input
            v-model="form.subdomain"
            @input="subdomainEdited = true"
            required
            maxlength="40"
            class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-sm font-mono focus:border-amber-500 focus:outline-none"
          />
          <span class="text-xs flex items-center gap-1.5" :class="availability?.available === false ? 'text-rose-300' : 'text-white/50'">
            <span v-if="isChecking" class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            <span v-else-if="availability?.available" class="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
            <span v-else-if="availability?.available === false" class="material-symbols-outlined text-sm">error</span>
            {{ availability?.available === false ? 'Esa dirección no está disponible' : storeAddress }}
          </span>
        </label>

        <div class="grid sm:grid-cols-2 gap-4">
          <label class="block space-y-1.5">
            <span class="text-[11px] font-label uppercase tracking-wider text-white/70 font-bold">Tu email</span>
            <input v-model="form.email" type="email" required autocomplete="email" class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-sm focus:border-amber-500 focus:outline-none" />
          </label>
          <label class="block space-y-1.5">
            <span class="text-[11px] font-label uppercase tracking-wider text-white/70 font-bold">Contraseña</span>
            <input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres" class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-sm focus:border-amber-500 focus:outline-none" />
          </label>
        </div>

        <label class="block space-y-1.5">
          <span class="text-[11px] font-label uppercase tracking-wider text-white/70 font-bold">WhatsApp para pedidos (opcional)</span>
          <input v-model="form.whatsappNumber" inputmode="tel" placeholder="5491122334455" class="w-full bg-[#11100F] border border-white/10 rounded-xl p-3 text-sm font-mono focus:border-amber-500 focus:outline-none" />
        </label>

        <div class="space-y-1.5">
          <span class="text-[11px] font-label uppercase tracking-wider text-white/70 font-bold">Plan</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="plan in info.plans"
              :key="plan.id"
              type="button"
              @click="form.plan = plan.id"
              class="rounded-xl border p-3 text-left text-xs transition-colors"
              :class="form.plan === plan.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/30'"
            >
              <span class="block font-bold">{{ plan.name }}</span>
              <span class="text-white/50">${{ Number(plan.price).toLocaleString('es-AR') }}/mes</span>
            </button>
          </div>
        </div>

        <label class="flex items-start gap-3 text-xs text-white/75 cursor-pointer">
          <input v-model="form.seedStarter" type="checkbox" class="mt-0.5 rounded border-white/20 text-amber-600" />
          <span>Cargar un catálogo de ejemplo con perfumes populares (lo podés editar o borrar).</span>
        </label>
        <label class="flex items-start gap-3 text-xs text-white/75 cursor-pointer">
          <input v-model="form.acceptTerms" type="checkbox" required class="mt-0.5 rounded border-white/20 text-amber-600" />
          <span>Acepto los términos del servicio y la política de privacidad de {{ info.name }}.</span>
        </label>

        <p v-if="error" class="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">{{ error }}</p>

        <button
          type="submit"
          :disabled="!canSubmit || !info.signupEnabled"
          class="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-[#11100F] font-label text-xs uppercase tracking-widest font-bold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <span v-if="isSubmitting" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
          {{ isSubmitting ? 'Creando tu tienda...' : 'Crear mi tienda gratis' }}
        </button>
      </form>
    </main>
  </div>
</template>
