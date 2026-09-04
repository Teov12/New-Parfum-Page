<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useCartStore } from '@/stores/cart'
import { useShippingStore } from '@/stores/shipping'
import { useToastStore } from '@/stores/toast'

const cartStore = useCartStore()
const shippingStore = useShippingStore()
const toastStore = useToastStore()
const router = useRouter()

// Checkout Steps: 1: Delivery info, 2: WhatsApp & Payment, 3: Confirmation
const currentStep = ref(1)
const isSubmitting = ref(false)
const isFetchingAndreani = ref(false)
const orderResult = ref(null)

// Vee-Validate Schema with Yup
const validationSchema = yup.object({
  firstName: yup.string().trim().required('El nombre es obligatorio').min(2, 'Mínimo 2 letras'),
  lastName: yup.string().trim().required('El apellido es obligatorio').min(2, 'Mínimo 2 letras'),
  phone: yup
    .string()
    .trim()
    .required('El número de WhatsApp es obligatorio')
    .matches(/^[+0-9\s()-]{8,20}$/, 'Ingresá un teléfono válido (ej: +54 9 11 1234 5678)'),
  email: yup.string().trim().email('Ingresá un correo electrónico válido').nullable(),
  dni: yup.string().trim().nullable(),
  address: yup.string().trim().required('La dirección y altura son obligatorias').min(4, 'Ingresá calle y número'),
  apartment: yup.string().trim().nullable(),
  city: yup.string().trim().required('La ciudad es obligatoria'),
  province: yup.string().trim().required('La provincia es obligatoria'),
  postalCode: yup
    .string()
    .trim()
    .required('El código postal es obligatorio')
    .min(4, 'Ingresá un código postal válido (4 a 8 caracteres)'),
  notes: yup.string().trim().nullable()
})

const { handleSubmit, errors, values, setFieldValue, validate } = useForm({
  validationSchema,
  initialValues: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dni: '',
    address: '',
    apartment: '',
    city: shippingStore.destination?.zone?.split(' ')[0] || 'Buenos Aires',
    province: shippingStore.destination?.province || 'CABA',
    postalCode: shippingStore.postalCode || '1414',
    notes: '',
    paymentMethod: 'transfer',
    shippingOptionId: shippingStore.selectedOptionId || 'andreani_domicilio'
  }
})

// Individual reactive fields
const { value: firstName, errorMessage: firstNameError } = useField('firstName')
const { value: lastName, errorMessage: lastNameError } = useField('lastName')
const { value: phone, errorMessage: phoneError } = useField('phone')
const { value: email, errorMessage: emailError } = useField('email')
const { value: dni } = useField('dni')
const { value: address, errorMessage: addressError } = useField('address')
const { value: apartment } = useField('apartment')
const { value: city, errorMessage: cityError } = useField('city')
const { value: province, errorMessage: provinceError } = useField('province')
const { value: postalCode, errorMessage: postalCodeError } = useField('postalCode')
const { value: notes } = useField('notes')
const { value: paymentMethod } = useField('paymentMethod')
const { value: shippingOptionId } = useField('shippingOptionId')

const fetchAndreaniQuotes = async () => {
  if (!postalCode.value || postalCode.value.length < 4) return
  isFetchingAndreani.value = true
  const res = await shippingStore.calculateShipping(postalCode.value, cartStore.subtotal)
  isFetchingAndreani.value = false
  if (res && res.options) {
    if (!res.options.some(o => o.id === shippingOptionId.value)) {
      shippingOptionId.value = res.options[0]?.id || 'andreani_domicilio'
    }
    shippingStore.selectOption(shippingOptionId.value)
  }
}

onMounted(() => {
  fetchAndreaniQuotes()
})

const shippingCost = computed(() => {
  return cartStore.shippingCost
})

const finalTotal = computed(() => {
  return cartStore.total
})

const selectShippingOption = (optionId) => {
  shippingOptionId.value = optionId
  shippingStore.selectOption(optionId)
}

const handleStep1Submit = handleSubmit(async (formValues) => {
  if (!shippingStore.selectedOption) {
    await fetchAndreaniQuotes()
  }
  currentStep.value = 2
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

const buildWhatsAppMessage = (orderNumber) => {
  const customerName = `${firstName.value} ${lastName.value}`.trim()
  const shippingOpt = shippingStore.selectedOption
  const shippingText = shippingOpt 
    ? `${shippingOpt.name} (${shippingOpt.estimatedDays}) - ${shippingOpt.price === 0 ? 'GRATIS' : `$${shippingOpt.price.toLocaleString('es-AR')}`}`
    : 'Andreani Estándar'

  let itemsText = cartStore.items.map((item, idx) => {
    return `   ${idx + 1}. *${item.name}* (${item.brand})\n      • Medida: ${item.size}\n      • Cantidad: ${item.quantity} un.\n      • Subtotal: $${(item.price * item.quantity).toLocaleString('es-AR')}`
  }).join('\n\n')

  let paymentMethodLabel = 'Transferencia Bancaria'
  if (paymentMethod.value === 'credit_card') paymentMethodLabel = 'Tarjeta de Crédito / Débito (hasta 6 cuotas)'
  if (paymentMethod.value === 'mercado_pago') paymentMethodLabel = 'Mercado Pago'

  let msg = `✨ *NUEVO PEDIDO - GICCA PERFUMES* ✨\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `📦 *Nº de Orden:* #${orderNumber}\n`
  msg += `📅 *Fecha:* ${new Date().toLocaleDateString('es-AR')}\n\n`

  msg += `👤 *DATOS DEL CLIENTE:*\n`
  msg += `• *Nombre:* ${customerName}\n`
  msg += `• *WhatsApp / Tel:* ${phone.value}\n`
  if (email.value) msg += `• *Email:* ${email.value}\n`
  if (dni.value) msg += `• *DNI / CUIT:* ${dni.value}\n`
  msg += `\n`

  msg += `📍 *DIRECCIÓN DE ENTREGA:*\n`
  msg += `• *Dirección:* ${address.value}${apartment.value ? `, ${apartment.value}` : ''}\n`
  msg += `• *Localidad:* ${city.value}, ${province.value} (CP ${postalCode.value})\n`
  msg += `• *Logística:* ${shippingText}\n\n`

  msg += `🛍️ *PRODUCTOS:*\n`
  msg += `${itemsText}\n\n`

  msg += `💰 *RESUMEN DE PAGO:*\n`
  msg += `• *Subtotal:* $${cartStore.subtotal.toLocaleString('es-AR')}\n`
  if (cartStore.discountAmount > 0) {
    msg += `• *Descuento Cupón:* -$${cartStore.discountAmount.toLocaleString('es-AR')}\n`
  }
  msg += `• *Envío (Andreani):* ${shippingCost.value === 0 ? '¡GRATIS!' : `$${shippingCost.value.toLocaleString('es-AR')}`}\n`
  msg += `• *TOTAL FINAL A ABONAR:* *$${finalTotal.value.toLocaleString('es-AR')}*\n`
  msg += `• *Preferencia de Pago:* ${paymentMethodLabel}\n\n`

  if (notes.value && notes.value.trim()) {
    msg += `📝 *NOTAS / DEDICATORIA:*\n"${notes.value.trim()}"\n\n`
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `Hola! Acabo de armar mi pedido en la web. Me gustaría coordinar el pago y envío. ¡Muchas gracias!`

  return msg
}

const handleFinalOrder = async () => {
  isSubmitting.value = true

  const orderNumber = `GIC-${Math.floor(100000 + Math.random() * 900000)}`
  const messageText = buildWhatsAppMessage(orderNumber)
  const encodedText = encodeURIComponent(messageText)
  const whatsappUrl = `https://wa.me/5493564622055?text=${encodedText}`

  // Build order payload for backend database
  const orderData = {
    orderNumber,
    customer: {
      firstName: firstName.value,
      lastName: lastName.value,
      phone: phone.value,
      email: email.value,
      dni: dni.value,
      address: address.value,
      apartment: apartment.value,
      city: city.value,
      province: province.value,
      postalCode: postalCode.value
    },
    items: cartStore.items.map(i => ({
      id: i.id,
      name: i.name,
      brand: i.brand,
      size: i.size,
      quantity: i.quantity,
      price: i.price,
      costPrice: Math.round(i.price * 0.45)
    })),
    subtotal: cartStore.subtotal,
    shippingCost: shippingCost.value,
    discountAmount: cartStore.discountAmount,
    total: finalTotal.value,
    totalCost: cartStore.items.reduce((acc, i) => acc + (Math.round(i.price * 0.45) * i.quantity), 0),
    shippingMethod: shippingStore.selectedOption?.name || 'Andreani Estándar a Domicilio',
    paymentMethod: paymentMethod.value,
    paymentStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    notes: notes.value || '',
    source: 'web'
  }

  // Register in backend database
  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
  } catch (err) {
    console.warn('Could not persist order to backend:', err)
  }

  orderResult.value = {
    orderNumber,
    date: new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }),
    items: [...cartStore.items],
    shippingService: shippingStore.selectedOption?.name || 'Andreani Estándar a Domicilio',
    shippingEstimatedDays: shippingStore.selectedOption?.estimatedDays || '24 a 48 hs',
    total: finalTotal.value,
    paymentMethod: paymentMethod.value,
    customer: { ...values },
    whatsappUrl
  }

  // Open WhatsApp in new tab
  window.open(whatsappUrl, '_blank')

  setTimeout(() => {
    isSubmitting.value = false
    cartStore.clearCart()
    currentStep.value = 3
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toastStore.show(`¡Pedido ${orderNumber} enviado por WhatsApp!`, 'success')
  }, 500)
}
</script>

<template>
  <div class="bg-surface-container py-12">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Checkout Stepper Progress (Círculos & Píldoras) -->
      <div class="max-w-xl mx-auto mb-10">
        <div class="flex items-center justify-between relative">
          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-outline-variant z-0"></div>

          <!-- Step 1 Indicator -->
          <div class="relative z-10 flex flex-col items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-label text-xs font-bold border transition-colors shadow-2xs"
              :class="currentStep >= 1 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              1
            </div>
            <span class="font-label text-[10px] uppercase tracking-wider text-primary mt-1.5 font-bold">Envío</span>
          </div>

          <!-- Step 2 Indicator -->
          <div class="relative z-10 flex flex-col items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-label text-xs font-bold border transition-colors shadow-2xs"
              :class="currentStep >= 2 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              2
            </div>
            <span class="font-label text-[10px] uppercase tracking-wider text-primary mt-1.5 font-bold">WhatsApp & Pago</span>
          </div>

          <!-- Step 3 Indicator -->
          <div class="relative z-10 flex flex-col items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-label text-xs font-bold border transition-colors shadow-2xs"
              :class="currentStep === 3 ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline'"
            >
              3
            </div>
            <span class="font-label text-[10px] uppercase tracking-wider text-primary mt-1.5 font-bold">Confirmación</span>
          </div>
        </div>
      </div>

      <!-- SUCCESS CONFIRMATION SCREEN (Step 3) -->
      <div v-if="currentStep === 3 && orderResult" class="max-w-2xl mx-auto bg-surface border border-outline-variant rounded-xs p-8 sm:p-12 text-center shadow-lg space-y-6">
        <div class="w-20 h-20 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
          <span class="material-symbols-outlined text-4xl">check_circle</span>
        </div>

        <div>
          <span class="font-label text-xs uppercase tracking-[0.2em] text-emerald-800 font-bold">¡Pedido Generado con Éxito!</span>
          <h1 class="font-sans text-3xl sm:text-4xl text-primary font-normal mt-1 mb-2">
            Gracias por tu pedido, {{ orderResult.customer.firstName }}
          </h1>
          <p class="font-sans text-secondary text-sm max-w-md mx-auto leading-relaxed">
            Hemos preparado tu orden <strong>#{{ orderResult.orderNumber }}</strong> y abierto WhatsApp para coordinar el pago y despacho inmediato de tu pedido.
          </p>
        </div>

        <div class="bg-surface-container rounded-xs p-6 text-left space-y-4 border border-outline-variant text-sm font-sans shadow-2xs">
          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <span class="font-label text-xs uppercase text-secondary">Número de Pedido:</span>
            <span class="font-mono font-bold text-primary text-base">{{ orderResult.orderNumber }}</span>
          </div>

          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <span class="font-label text-xs uppercase text-secondary">Destinatario:</span>
            <span class="font-medium text-primary">{{ orderResult.customer.firstName }} {{ orderResult.customer.lastName }} ({{ orderResult.customer.phone }})</span>
          </div>

          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <span class="font-label text-xs uppercase text-secondary">Logística & Envío:</span>
            <div class="text-right">
              <span class="font-medium text-primary block">{{ orderResult.shippingService }}</span>
              <span class="text-xs text-secondary">{{ orderResult.shippingEstimatedDays }}</span>
            </div>
          </div>

          <div class="flex justify-between items-center border-b border-outline-variant pb-3">
            <span class="font-label text-xs uppercase text-secondary">Preferencia de Pago:</span>
            <span class="font-medium text-primary capitalize">
              {{ orderResult.paymentMethod === 'transfer' ? 'Transferencia Bancaria' : (orderResult.paymentMethod === 'credit_card' ? 'Tarjeta en Cuotas' : 'Mercado Pago') }}
            </span>
          </div>

          <div class="flex justify-between items-center pt-1 text-base">
            <span class="font-sans font-bold text-primary">Monto Total a Abonar:</span>
            <span class="font-sans font-bold text-primary text-xl">${{ orderResult.total.toLocaleString('es-AR') }}</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <a 
            v-if="orderResult.whatsappUrl"
            :href="orderResult.whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="bg-[#25D366] hover:bg-[#20ba5a] text-white font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span class="material-symbols-outlined text-base">chat</span>
            <span>Reabrir Chat de WhatsApp</span>
          </a>
          <RouterLink 
            to="/"
            class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline hover:bg-surface-container transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <span>Volver a la Tienda</span>
          </RouterLink>
        </div>
      </div>

      <!-- MAIN CHECKOUT WORKFLOW (Steps 1 & 2) -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- FORM COLUMN (7 cols) -->
        <div class="lg:col-span-7 bg-surface border border-outline-variant rounded-xs p-6 sm:p-10 shadow-xs space-y-8">
          
          <!-- STEP 1: Delivery Details (Vee-Validate Validated) -->
          <div v-if="currentStep === 1" class="space-y-6">
            <div class="border-b border-outline-variant pb-4">
              <h2 class="font-sans text-2xl text-primary font-normal">1. Datos de Contacto & Entrega</h2>
              <p class="font-sans text-xs text-secondary mt-1">Ingresá los datos del destinatario para cotizar el envío con Andreani y armar tu orden.</p>
            </div>

            <form @submit.prevent="handleStep1Submit" class="space-y-4" novalidate>
              <!-- Name & Lastname -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Nombre *</label>
                  <input 
                    v-model="firstName"
                    type="text" 
                    placeholder="Ej. Juan"
                    class="w-full bg-surface-container border rounded-xs p-3 text-sm font-sans focus:outline-none transition-colors"
                    :class="firstNameError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                  />
                  <p v-if="firstNameError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">error</span>
                    {{ firstNameError }}
                  </p>
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Apellido *</label>
                  <input 
                    v-model="lastName"
                    type="text" 
                    placeholder="Ej. Pérez"
                    class="w-full bg-surface-container border rounded-xs p-3 text-sm font-sans focus:outline-none transition-colors"
                    :class="lastNameError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                  />
                  <p v-if="lastNameError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">error</span>
                    {{ lastNameError }}
                  </p>
                </div>
              </div>

              <!-- Phone & DNI -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">WhatsApp / Teléfono *</label>
                  <input 
                    v-model="phone"
                    type="tel" 
                    placeholder="Ej. +54 9 11 1234 5678"
                    class="w-full bg-surface-container border rounded-xs p-3 text-sm font-sans focus:outline-none transition-colors"
                    :class="phoneError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                  />
                  <p v-if="phoneError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">error</span>
                    {{ phoneError }}
                  </p>
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">DNI o CUIT (Opcional)</label>
                  <input 
                    v-model="dni"
                    type="text" 
                    placeholder="Para factura y despacho"
                    class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <!-- Email -->
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Email (Opcional para recibo)</label>
                <input 
                  v-model="email"
                  type="email" 
                  placeholder="juan@ejemplo.com"
                  class="w-full bg-surface-container border rounded-xs p-3 text-sm font-sans focus:outline-none transition-colors"
                  :class="emailError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                />
                <p v-if="emailError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">error</span>
                  {{ emailError }}
                </p>
              </div>

              <!-- Address & Floor -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Dirección y Número *</label>
                  <input 
                    v-model="address"
                    type="text" 
                    placeholder="Av. Alvear 1850"
                    class="w-full bg-surface-container border rounded-xs p-3 text-sm font-sans focus:outline-none transition-colors"
                    :class="addressError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                  />
                  <p v-if="addressError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">error</span>
                    {{ addressError }}
                  </p>
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Piso / Depto</label>
                  <input 
                    v-model="apartment"
                    type="text" 
                    placeholder="Piso 4B"
                    class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <!-- City, Province, Zip -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Ciudad *</label>
                  <input 
                    v-model="city"
                    type="text" 
                    placeholder="Ciudad"
                    class="w-full bg-surface-container border rounded-xs p-3 text-sm font-sans focus:outline-none transition-colors"
                    :class="cityError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                  />
                  <p v-if="cityError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">error</span>
                    {{ cityError }}
                  </p>
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Provincia *</label>
                  <select 
                    v-model="province"
                    class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  >
                    <option value="CABA">CABA</option>
                    <option value="Buenos Aires">Buenos Aires (GBA / Interior)</option>
                    <option value="Córdoba">Córdoba</option>
                    <option value="Santa Fe">Santa Fe</option>
                    <option value="Mendoza">Mendoza</option>
                    <option value="Entre Ríos">Entre Ríos</option>
                    <option value="Tucumán">Tucumán</option>
                    <option value="Salta">Salta</option>
                    <option value="Neuquén">Neuquén</option>
                    <option value="Río Negro">Río Negro</option>
                    <option value="Otra">Otra Provincia</option>
                  </select>
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1.5">
                    <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Código Postal *</label>
                    <span v-if="isFetchingAndreani" class="text-[10px] text-primary flex items-center gap-1 font-bold animate-pulse">
                      <span class="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                      Cotizando...
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <input 
                      v-model="postalCode"
                      type="text" 
                      placeholder="Ej. 1414"
                      maxlength="8"
                      class="w-full bg-surface-container border rounded-xs p-3 text-sm font-sans focus:outline-none transition-colors"
                      :class="postalCodeError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                      @blur="fetchAndreaniQuotes"
                      @keyup.enter="fetchAndreaniQuotes"
                    />
                    <button 
                      type="button" 
                      @click="fetchAndreaniQuotes"
                      class="bg-surface text-primary border border-outline font-label text-xs uppercase px-4 rounded-xs hover:bg-surface-container flex-shrink-0"
                    >
                      Calcular
                    </button>
                  </div>
                  <p v-if="postalCodeError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">error</span>
                    {{ postalCodeError }}
                  </p>
                </div>
              </div>

              <!-- Shipping Method Selector (Andreani Integration) -->
              <div class="pt-4 border-t border-outline-variant space-y-3">
                <div class="flex justify-between items-center">
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">
                    Opciones de Entrega Andreani
                  </label>
                  <span v-if="shippingStore.destination" class="text-xs text-secondary font-medium">
                    Destino: {{ shippingStore.destination.zone }}
                  </span>
                </div>

                <div v-if="shippingStore.options.length > 0" class="space-y-3">
                  <div 
                    v-for="opt in shippingStore.options" 
                    :key="opt.id"
                    @click="selectShippingOption(opt.id)"
                    class="p-4 rounded-xs border cursor-pointer flex justify-between items-center transition-all shadow-2xs"
                    :class="shippingOptionId === opt.id ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant hover:border-outline'"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                        <span class="material-symbols-outlined text-lg">
                          {{ opt.type === 'sucursal' ? 'store' : (opt.type === 'urgente' ? 'bolt' : 'local_shipping') }}
                        </span>
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="font-sans text-sm text-primary font-medium">{{ opt.name }}</p>
                          <span v-if="opt.badge" class="text-[9px] font-label font-bold uppercase px-2 py-0.5 rounded-full" :class="opt.isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container-high text-secondary'">
                            {{ opt.badge }}
                          </span>
                        </div>
                        <p class="text-xs text-secondary">{{ opt.description }} • <strong>{{ opt.estimatedDays }}</strong></p>
                      </div>
                    </div>
                    <div class="text-right">
                      <span class="font-sans font-bold text-sm" :class="opt.isFree ? 'text-emerald-700' : 'text-primary'">
                        {{ opt.price === 0 ? '¡GRATIS!' : `$${opt.price.toLocaleString('es-AR')}` }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-else class="p-4 bg-surface-container rounded-xs border border-outline-variant text-center text-xs text-secondary">
                  Ingresá tu código postal para calcular las tarifas de Andreani.
                </div>
              </div>

              <!-- Submit Step 1: Píldora -->
              <div class="pt-4">
                <button 
                  type="submit"
                  class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Continuar al Pedido por WhatsApp</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>

          <!-- STEP 2: WhatsApp Confirmation & Payment Preference -->
          <div v-if="currentStep === 2" class="space-y-6">
            <div class="flex justify-between items-center border-b border-outline-variant pb-4">
              <div>
                <h2 class="font-sans text-2xl text-primary font-normal">2. Confirmar Pedido por WhatsApp</h2>
                <p class="font-sans text-xs text-secondary mt-1">Revisá tu pedido antes de enviarlo directamente a nuestro equipo por WhatsApp.</p>
              </div>
              <button 
                @click="currentStep = 1"
                class="font-label text-xs uppercase tracking-widest text-primary underline"
              >
                Editar datos
              </button>
            </div>

            <!-- WhatsApp Info Callout Banner -->
            <div class="bg-emerald-50 border border-emerald-200 rounded-xs p-4 sm:p-5 text-emerald-950 space-y-2">
              <div class="flex items-center gap-2 font-semibold font-sans text-sm text-emerald-900">
                <span class="material-symbols-outlined text-emerald-700">chat</span>
                <span>Atención Personalizada 1 a 1</span>
              </div>
              <p class="text-xs leading-relaxed text-emerald-800">
                Al hacer click en el botón, se abrirá WhatsApp con el <strong>mensaje listo</strong> con todos tus productos y datos de envío para confirmar tu orden y brindarte el link de pago o datos para transferencia.
              </p>
            </div>

            <!-- Order Recipient Summary Card -->
            <div class="bg-surface-container rounded-xs p-4 border border-outline-variant space-y-2 text-xs font-sans text-secondary">
              <div class="flex justify-between">
                <span class="font-semibold text-primary">Destinatario:</span>
                <span>{{ firstName }} {{ lastName }} ({{ phone }})</span>
              </div>
              <div class="flex justify-between">
                <span class="font-semibold text-primary">Entrega:</span>
                <span>{{ address }}{{ apartment ? `, ${apartment}` : '' }} (CP {{ postalCode }})</span>
              </div>
              <div class="flex justify-between">
                <span class="font-semibold text-primary">Logística:</span>
                <span class="text-primary font-medium">{{ shippingStore.selectedOption?.name || 'Andreani' }} ({{ shippingStore.selectedOption?.estimatedDays || '24 a 48 hs' }})</span>
              </div>
            </div>

            <!-- Payment Method Preference Selection -->
            <div class="space-y-3 pt-2">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">
                ¿Cómo preferís abonar? (Se coordinará por WhatsApp)
              </label>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <!-- Transfer -->
                <div 
                  @click="paymentMethod = 'transfer'"
                  class="p-3.5 rounded-xs border cursor-pointer transition-all text-center space-y-1 shadow-2xs"
                  :class="paymentMethod === 'transfer' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant hover:border-outline'"
                >
                  <span class="material-symbols-outlined text-xl text-primary">account_balance</span>
                  <p class="font-sans text-xs text-primary font-medium">Transferencia</p>
                  <p class="text-[10px] text-secondary">CBU / Alias inmediato</p>
                </div>

                <!-- Credit Card -->
                <div 
                  @click="paymentMethod = 'credit_card'"
                  class="p-3.5 rounded-xs border cursor-pointer transition-all text-center space-y-1 shadow-2xs"
                  :class="paymentMethod === 'credit_card' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant hover:border-outline'"
                >
                  <span class="material-symbols-outlined text-xl text-primary">credit_card</span>
                  <p class="font-sans text-xs text-primary font-medium">Tarjeta en Cuotas</p>
                  <p class="text-[10px] text-secondary">Hasta 3 y 6 cuotas</p>
                </div>

                <!-- Mercado Pago -->
                <div 
                  @click="paymentMethod = 'mercado_pago'"
                  class="p-3.5 rounded-xs border cursor-pointer transition-all text-center space-y-1 shadow-2xs"
                  :class="paymentMethod === 'mercado_pago' ? 'bg-surface-container border-primary ring-1 ring-primary' : 'bg-surface border-outline-variant hover:border-outline'"
                >
                  <span class="material-symbols-outlined text-xl text-primary">payments</span>
                  <p class="font-sans text-xs text-primary font-medium">Mercado Pago</p>
                  <p class="text-[10px] text-secondary">Dinero en cuenta o QR</p>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                Notas especiales o dedicatoria para regalo (Opcional):
              </label>
              <textarea 
                v-model="notes"
                rows="2" 
                placeholder="Ej. Por favor incluir tarjeta con dedicatoria: 'Para Sofía con mucho cariño'"
                class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none"
              ></textarea>
            </div>

            <!-- Send WhatsApp Order Button: Botón Verde WhatsApp & Píldora -->
            <div class="pt-4 space-y-2">
              <button 
                @click="handleFinalOrder"
                :disabled="isSubmitting"
                class="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-label text-xs uppercase tracking-widest py-4 rounded-full transition-all flex items-center justify-center gap-2.5 shadow-md disabled:opacity-50 font-bold"
              >
                <span class="material-symbols-outlined text-lg">chat</span>
                <span v-if="isSubmitting">Abriendo WhatsApp...</span>
                <span v-else>Enviar Pedido por WhatsApp (${{ finalTotal.toLocaleString('es-AR') }})</span>
              </button>
              <p class="text-center text-[11px] text-secondary">
                🔒 Tu pedido queda registrado automáticamente y te redirigimos al chat de la boutique.
              </p>
            </div>
          </div>

        </div>

        <!-- ORDER SUMMARY COLUMN (5 cols) -->
        <div class="lg:col-span-5 sticky top-28 bg-surface border border-outline-variant rounded-xs p-6 sm:p-8 space-y-6 shadow-md">
          <h3 class="font-sans text-xl text-primary font-normal border-b border-outline-variant pb-3">
            Detalle de tu Pedido
          </h3>

          <!-- Items Mini List -->
          <div class="divide-y divide-outline-variant max-h-64 overflow-y-auto pr-2 scrollbar-thin">
            <div 
              v-for="item in cartStore.items" 
              :key="`${item.id}-${item.size}`"
              class="py-3 flex items-center gap-3"
            >
              <img 
                :src="item.image" 
                :alt="item.name"
                class="w-12 h-14 object-cover bg-surface-container rounded-xs border border-outline-variant flex-shrink-0"
              />
              <div class="flex-grow min-w-0">
                <h4 class="font-sans text-sm text-primary truncate">{{ item.name }}</h4>
                <p class="font-sans text-xs text-secondary">{{ item.quantity }}x {{ item.size }}</p>
              </div>
              <span class="font-sans font-semibold text-sm text-primary">
                ${{ (item.price * item.quantity).toLocaleString('es-AR') }}
              </span>
            </div>
          </div>

          <!-- Price Math -->
          <div class="space-y-2 text-xs font-sans border-t border-b border-outline-variant py-4">
            <div class="flex justify-between text-secondary">
              <span>Subtotal</span>
              <span>${{ cartStore.subtotal.toLocaleString('es-AR') }}</span>
            </div>
            <div v-if="cartStore.discountAmount > 0" class="flex justify-between text-tertiary font-medium">
              <span>Descuento cupón</span>
              <span>-${{ cartStore.discountAmount.toLocaleString('es-AR') }}</span>
            </div>
            <div class="flex justify-between text-secondary">
              <span>Envío ({{ shippingStore.selectedOption?.carrier || 'Andreani' }})</span>
              <span class="font-medium" :class="shippingCost === 0 ? 'text-emerald-700' : 'text-primary'">
                {{ shippingCost === 0 ? '¡GRATIS!' : `$${shippingCost.toLocaleString('es-AR')}` }}
              </span>
            </div>
          </div>

          <!-- Total Final -->
          <div class="flex justify-between items-baseline">
            <span class="font-sans text-lg text-primary">Total a Pagar</span>
            <span class="font-sans text-2xl font-bold text-primary">
              ${{ finalTotal.toLocaleString('es-AR') }}
            </span>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
