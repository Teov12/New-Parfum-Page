<script setup>
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'

const router = useRouter()
const route = useRoute()
const adminAuthStore = useAdminAuthStore()

const adminPassword = ref('')
const showPassword = ref(false)

const handleLogin = async () => {
  const success = await adminAuthStore.login(adminPassword.value)
  if (success) {
    const redirect = route.query.redirect || '/admin/ventas'
    router.push(redirect)
  }
}
</script>

<template>
  <div class="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-surface-container-low overflow-hidden">
    <!-- Ambient Decorative Luxury Glows -->
    <div class="absolute w-[500px] h-[500px] bg-primary-container/10 rounded-full blur-3xl pointer-events-none -top-24 -left-24"></div>
    <div class="absolute w-[400px] h-[400px] bg-surface-container-highest/50 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20"></div>

    <div class="relative z-10 bg-surface/95 backdrop-blur-md border border-outline-variant rounded-2xl p-8 sm:p-12 max-w-md w-full shadow-[0_20px_50px_-15px_rgba(46,25,17,0.12)] space-y-7">
      <div class="text-center space-y-2">
        <div class="w-14 h-14 bg-surface-container rounded-2xl border border-outline-variant flex items-center justify-center mx-auto text-primary shadow-xs">
          <span class="material-symbols-outlined text-2xl text-primary">lock</span>
        </div>
        <h1 class="font-serif text-3xl sm:text-4xl font-normal tracking-wide text-primary">GICCA</h1>
        <p class="font-label text-xs uppercase tracking-[0.25em] text-secondary">Acceso al Panel Boutique</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block font-label text-xs uppercase tracking-widest text-primary mb-2 font-semibold">
            Contraseña de Administrador
          </label>
          <div class="relative">
            <input 
              v-model="adminPassword"
              :type="showPassword ? 'text' : 'password'" 
              required
              autofocus
              placeholder="••••••••••••"
              class="w-full bg-surface-container/70 border border-outline-variant rounded-xl px-4 py-3 pr-10 text-sm font-sans text-primary placeholder:text-secondary focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs"
            />
            <button 
              type="button" 
              @click="showPassword = !showPassword"
              class="absolute right-3 top-3 text-secondary hover:text-primary transition-colors"
            >
              <span class="material-symbols-outlined text-lg">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <p v-if="adminAuthStore.loginError" class="text-xs text-rose-700 font-sans mt-2 flex items-center gap-1.5 animate-in fade-in">
            <span class="material-symbols-outlined text-sm">error</span>
            <span>{{ adminAuthStore.loginError }}</span>
          </p>
        </div>

        <button 
          type="submit" 
          :disabled="adminAuthStore.isLoggingIn"
          class="w-full bg-primary text-on-primary hover:bg-primary-container font-label text-xs uppercase tracking-widest py-3.5 rounded-xl border border-primary transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
        >
          <span>{{ adminAuthStore.isLoggingIn ? 'Verificando credenciales...' : 'Ingresar al Atelier' }}</span>
          <span class="material-symbols-outlined text-base">arrow_forward</span>
        </button>

        <div class="pt-2 text-center">
          <RouterLink to="/" class="font-label text-[11px] uppercase tracking-widest text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 py-1">
            <span class="material-symbols-outlined text-sm">west</span>
            <span>Volver a la Tienda Pública</span>
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>
