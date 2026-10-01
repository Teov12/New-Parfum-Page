<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useTenantStore } from '@/stores/tenant'
import { useToastStore } from '@/stores/toast'

const customerStore = useCustomerStore()
const tenantStore = useTenantStore()
const toastStore = useToastStore()

// login | register | verify | forgot | reset
const mode = ref('login')
const isBusy = ref(false)
const error = ref('')
const form = ref({ email: '', password: '', firstName: '', lastName: '', code: '' })
const profile = ref(null)

const statusLabel = (order) => {
  if (['cancelled', 'refunded'].includes(order.paymentStatus)) return 'Cancelado'
  if (order.fulfillmentStatus === 'delivered') return 'Entregado'
  if (order.fulfillmentStatus === 'shipped') return 'En camino'
  if (order.paymentStatus === 'paid') return 'Pagado'
  return 'Pendiente de pago'
}

const loadAccount = async () => {
  const customer = await customerStore.fetchMe()
  if (customer) {
    profile.value = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      dni: customer.dni,
      address: { address: '', apartment: '', city: '', province: '', postalCode: '', ...(customer.address || {}) }
    }
    customerStore.fetchOrders().catch(() => {})
  }
}

onMounted(loadAccount)

const run = async (fn) => {
  error.value = ''
  isBusy.value = true
  try {
    await fn()
  } catch (err) {
    error.value = err.message
    if (err.data?.needsVerification) mode.value = 'verify'
  } finally {
    isBusy.value = false
  }
}

const handleLogin = () => run(async () => {
  await customerStore.login(form.value.email, form.value.password)
  await loadAccount()
})

const handleRegister = () => run(async () => {
  await customerStore.register({
    email: form.value.email,
    password: form.value.password,
    firstName: form.value.firstName,
    lastName: form.value.lastName
  })
  mode.value = 'verify'
  toastStore.show('Te enviamos un código a tu email', 'info')
})

const handleVerify = () => run(async () => {
  await customerStore.verify(form.value.email, form.value.code)
  toastStore.show('¡Cuenta confirmada!', 'success')
  await loadAccount()
})

const handleForgot = () => run(async () => {
  await customerStore.resendCode(form.value.email, 'reset')
  mode.value = 'reset'
  toastStore.show('Si el email tiene cuenta, te enviamos un código', 'info')
})

const handleReset = () => run(async () => {
  await customerStore.resetPassword(form.value.email, form.value.code, form.value.password)
  toastStore.show('Contraseña actualizada', 'success')
  await loadAccount()
})

const resend = () => run(async () => {
  await customerStore.resendCode(form.value.email, mode.value === 'reset' ? 'reset' : 'verify')
  toastStore.show('Código reenviado', 'info')
})

const saveProfile = () => run(async () => {
  await customerStore.updateProfile(profile.value)
  toastStore.show('Datos guardados', 'success')
})

const logout = () => {
  customerStore.logout()
  profile.value = null
  mode.value = 'login'
}

const inputClass = 'w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm focus:border-primary focus:outline-none'
</script>

<template>
  <div class="bg-surface-container py-12 min-h-[70vh]">
    <div class="max-w-4xl mx-auto px-4">
      <!-- Sesión iniciada -->
      <div v-if="customerStore.isLoggedIn && profile" class="grid lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 space-y-4">
          <div class="flex items-center justify-between">
            <h1 class="font-serif text-3xl text-primary">Mis pedidos</h1>
            <button type="button" @click="logout" class="text-xs underline text-secondary hover:text-primary">Cerrar sesión</button>
          </div>
          <p v-if="customerStore.isLoading" class="text-sm text-secondary">Cargando...</p>
          <p v-else-if="customerStore.orders.length === 0" class="text-sm text-secondary bg-surface border border-outline-variant rounded-2xl p-6">
            Todavía no hiciste pedidos con {{ customerStore.customer.email }}.
            <RouterLink to="/catalogo" class="underline text-primary">Ver el catálogo</RouterLink>
          </p>
          <RouterLink
            v-for="order in customerStore.orders"
            :key="order.orderNumber"
            :to="`/pedido/${order.orderNumber}?token=${order.accessToken}`"
            class="block bg-surface border border-outline-variant rounded-2xl p-5 hover:border-primary transition-colors"
          >
            <div class="flex justify-between items-start gap-3">
              <div>
                <p class="font-bold text-primary">#{{ order.orderNumber }}</p>
                <p class="text-xs text-secondary">{{ new Date(order.createdAt || order.date).toLocaleDateString('es-AR') }} · {{ order.items.length }} producto(s)</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-primary">${{ Number(order.total).toLocaleString('es-AR') }}</p>
                <p class="text-[11px] uppercase tracking-wider text-secondary">{{ statusLabel(order) }}</p>
              </div>
            </div>
          </RouterLink>
        </div>

        <form @submit.prevent="saveProfile" class="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-6 space-y-3 h-fit">
          <h2 class="font-label text-xs uppercase tracking-widest text-primary font-bold">Mis datos de envío</h2>
          <p class="text-xs text-secondary">Los usamos para completar el checkout más rápido.</p>
          <div class="grid grid-cols-2 gap-2">
            <input v-model="profile.firstName" placeholder="Nombre" :class="inputClass" />
            <input v-model="profile.lastName" placeholder="Apellido" :class="inputClass" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input v-model="profile.phone" placeholder="Teléfono" :class="inputClass" />
            <input v-model="profile.dni" placeholder="DNI" :class="inputClass" />
          </div>
          <input v-model="profile.address.address" placeholder="Calle y número" :class="inputClass" />
          <div class="grid grid-cols-2 gap-2">
            <input v-model="profile.address.apartment" placeholder="Piso / depto" :class="inputClass" />
            <input v-model="profile.address.postalCode" placeholder="Código postal" :class="inputClass" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input v-model="profile.address.city" placeholder="Ciudad" :class="inputClass" />
            <input v-model="profile.address.province" placeholder="Provincia" :class="inputClass" />
          </div>
          <button type="submit" :disabled="isBusy" class="w-full py-3 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest disabled:opacity-50">Guardar</button>
        </form>
      </div>

      <!-- Acceso -->
      <div v-else class="max-w-md mx-auto bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5">
        <div class="text-center space-y-1">
          <h1 class="font-serif text-3xl text-primary">
            {{ { login: 'Ingresá a tu cuenta', register: 'Creá tu cuenta', verify: 'Confirmá tu email', forgot: 'Recuperá tu contraseña', reset: 'Nueva contraseña' }[mode] }}
          </h1>
          <p class="text-xs text-secondary">en {{ tenantStore.storeName }}</p>
        </div>

        <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="space-y-3">
          <input v-model="form.email" type="email" required autocomplete="email" placeholder="Email" :class="inputClass" />
          <input v-model="form.password" type="password" required autocomplete="current-password" placeholder="Contraseña" :class="inputClass" />
          <button type="submit" :disabled="isBusy" class="w-full py-3 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest disabled:opacity-50">Ingresar</button>
          <div class="flex justify-between text-xs">
            <button type="button" @click="mode = 'register'" class="underline text-primary">Crear cuenta</button>
            <button type="button" @click="mode = 'forgot'" class="underline text-secondary">Olvidé mi contraseña</button>
          </div>
        </form>

        <form v-else-if="mode === 'register'" @submit.prevent="handleRegister" class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <input v-model="form.firstName" placeholder="Nombre" :class="inputClass" />
            <input v-model="form.lastName" placeholder="Apellido" :class="inputClass" />
          </div>
          <input v-model="form.email" type="email" required autocomplete="email" placeholder="Email" :class="inputClass" />
          <input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" placeholder="Contraseña (mínimo 8 caracteres)" :class="inputClass" />
          <button type="submit" :disabled="isBusy" class="w-full py-3 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest disabled:opacity-50">Crear cuenta</button>
          <button type="button" @click="mode = 'login'" class="w-full text-xs underline text-secondary">Ya tengo cuenta</button>
        </form>

        <form v-else-if="mode === 'verify' || mode === 'reset'" @submit.prevent="mode === 'verify' ? handleVerify() : handleReset()" class="space-y-3">
          <p class="text-xs text-secondary text-center">Ingresá el código de 6 dígitos que enviamos a <strong>{{ form.email }}</strong>.</p>
          <input v-model="form.code" inputmode="numeric" maxlength="6" required placeholder="Código" :class="`${inputClass} text-center tracking-[0.5em] font-mono`" />
          <input v-if="mode === 'reset'" v-model="form.password" type="password" required minlength="8" autocomplete="new-password" placeholder="Nueva contraseña" :class="inputClass" />
          <button type="submit" :disabled="isBusy" class="w-full py-3 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest disabled:opacity-50">Confirmar</button>
          <button type="button" @click="resend" class="w-full text-xs underline text-secondary">Reenviar código</button>
        </form>

        <form v-else-if="mode === 'forgot'" @submit.prevent="handleForgot" class="space-y-3">
          <input v-model="form.email" type="email" required autocomplete="email" placeholder="Email de tu cuenta" :class="inputClass" />
          <button type="submit" :disabled="isBusy" class="w-full py-3 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest disabled:opacity-50">Enviar código</button>
          <button type="button" @click="mode = 'login'" class="w-full text-xs underline text-secondary">Volver</button>
        </form>

        <p v-if="error" class="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
