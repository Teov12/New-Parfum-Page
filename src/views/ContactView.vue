<script setup>
import { ref } from 'vue'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
const isSending = ref(false)
const openFaq = ref(null)

const validationSchema = yup.object({
  name: yup.string().trim().required('El nombre completo es obligatorio').min(3, 'Mínimo 3 letras'),
  email: yup.string().trim().required('El correo electrónico es obligatorio').email('Ingresá un email válido'),
  phone: yup.string().trim().nullable(),
  subject: yup.string().required('Seleccioná un motivo'),
  message: yup.string().trim().required('El mensaje no puede estar vacío').min(10, 'Por favor escribí al menos 10 caracteres')
})

const { handleSubmit, resetForm } = useForm({
  validationSchema,
  initialValues: {
    name: '',
    email: '',
    phone: '',
    subject: 'Asesoramiento Personalizado',
    message: ''
  }
})

const { value: name, errorMessage: nameError } = useField('name')
const { value: email, errorMessage: emailError } = useField('email')
const { value: phone } = useField('phone')
const { value: subject } = useField('subject')
const { value: message, errorMessage: messageError } = useField('message')

const faqs = [
  {
    id: 1,
    q: '¿Cómo garantizan que todos los perfumes son 100% originales?',
    a: 'Todas nuestras fragancias provienen de importadores oficiales autorizados. Cada frasco cuenta con su batch code original grabable y verificable en bases de datos mundiales (como CheckFresh), estampillas de importación y celofán de fábrica inalterado.'
  },
  {
    id: 2,
    q: '¿Cuáles son los tiempos y costos de entrega?',
    a: 'En CABA y GBA entregamos en 24 a 48 hs hábiles (con opción de Envío Express en el día). Al resto del país enviamos vía Correo Argentino / Andreani asegurado con plazos de 3 a 5 días hábiles. Las compras superiores a $200.000 tienen Envío Gratis automático.'
  },
  {
    id: 3,
    q: '¿Cómo garantizan la originalidad de las fragancias?',
    a: 'Todas nuestras piezas provienen directamente de distribuidores e importadores oficiales, con estampillado fiscal de importación y códigos de lote (Batch Code) verificables en bases de datos internacionales.'
  },
  {
    id: 4,
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos tarjetas de crédito bancarias con 3 y 6 cuotas fijas a través de Mercado Pago, tarjetas de débito y Transferencia Bancaria directa con confirmación inmediata.'
  },
  {
    id: 5,
    q: '¿Puedo realizar cambios si el perfume no es de mi agrado?',
    a: 'Por razones sanitarias y de autenticidad, los perfumes cerrados con celofán original intacto pueden cambiarse dentro de los 30 días posteriores a la compra.'
  }
]

const toggleFaq = (id) => {
  openFaq.value = openFaq.value === id ? null : id
}

const handleSubmitContact = handleSubmit(async (formValues) => {
  isSending.value = true
  setTimeout(() => {
    isSending.value = false
    toastStore.show('¡Mensaje enviado con éxito! Nos comunicaremos con vos a la brevedad.', 'success')
    resetForm()
  }, 1000)
})
</script>

<template>
  <div class="bg-surface py-12">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Header -->
      <div class="text-center max-w-2xl mx-auto mb-16">
        <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary mb-2 block">Contacto & Atención</span>
        <h1 class="font-sans text-4xl sm:text-5xl text-primary font-normal tracking-tight mb-4">
          Estamos a tu Disposición
        </h1>
        <p class="font-sans text-secondary text-sm sm:text-base leading-relaxed">
          Escribinos si tenés dudas sobre alguna fragancia, querés asesoramiento para elegir un perfume o tenés consultas sobre tu envío.
        </p>
      </div>

      <!-- Main Layout: Contact Info & Form -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-24">
        
        <!-- Contact Channels (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-surface-container border border-outline-variant rounded-xs p-8 space-y-6 shadow-xs">
            <h3 class="font-sans text-2xl text-primary font-normal">Canales de Contacto</h3>

            <div class="space-y-4 font-sans text-sm text-secondary">
              <div class="flex items-start gap-3 p-3 bg-surface rounded-xs border border-outline-variant shadow-2xs">
                <span class="material-symbols-outlined text-primary text-xl mt-0.5">chat</span>
                <div>
                  <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold">WhatsApp de Ventas & Consultas</h4>
                  <p class="mt-0.5">+54 9 3564 62-2055</p>
                  <p class="text-xs text-outline">Lunes a Sábados de 09:00 a 20:00 hs.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3 bg-surface rounded-xs border border-outline-variant shadow-2xs">
                <span class="material-symbols-outlined text-primary text-xl mt-0.5">mail</span>
                <div>
                  <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold">Correo Electrónico</h4>
                  <p class="mt-0.5">contacto@giccaperfumes.com</p>
                  <p class="text-xs text-outline">Te respondemos en el día.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3 bg-surface rounded-xs border border-outline-variant shadow-2xs">
                <span class="material-symbols-outlined text-primary text-xl mt-0.5">location_on</span>
                <div>
                  <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold">Punto de Retiro</h4>
                  <p class="mt-0.5">Buenos Aires, Argentina</p>
                  <p class="text-xs text-outline">Coordinar previamente por WhatsApp.</p>
                </div>
              </div>
            </div>

            <!-- WhatsApp Direct Action Button (Píldora) -->
            <a 
              href="https://wa.me/5493564622055?text=Hola%20Gicca%20Perfumes!%20Me%20gustar%C3%ADa%20recibir%20asesoramiento%20sobre%20sus%20fragancias."
              target="_blank"
              class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 px-6 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 text-center block shadow-xs"
            >
              <span>Escribir por WhatsApp</span>
              <span class="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </div>
        </div>

        <!-- Form (7 cols) -->
        <div class="lg:col-span-7 bg-surface-container border border-outline-variant rounded-xs p-8 md:p-10 shadow-xs">
          <h3 class="font-sans text-2xl text-primary font-normal mb-1">Envíanos un Mensaje</h3>
          <p class="font-sans text-xs text-secondary mb-6">Completá tus datos y te responderemos a la brevedad.</p>

          <form @submit.prevent="handleSubmitContact" class="space-y-4" novalidate>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Nombre Completo *
                </label>
                <input 
                  v-model="name"
                  type="text" 
                  placeholder="Tu nombre"
                  class="w-full bg-surface border rounded-xs p-3 text-sm font-sans text-primary focus:outline-none transition-colors"
                  :class="nameError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                />
                <p v-if="nameError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">error</span>
                  {{ nameError }}
                </p>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Email *
                </label>
                <input 
                  v-model="email"
                  type="email" 
                  placeholder="tu@email.com"
                  class="w-full bg-surface border rounded-xs p-3 text-sm font-sans text-primary focus:outline-none transition-colors"
                  :class="emailError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
                />
                <p v-if="emailError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">error</span>
                  {{ emailError }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Teléfono / WhatsApp
                </label>
                <input 
                  v-model="phone"
                  type="tel" 
                  placeholder="+54 9 11 ..."
                  class="w-full bg-surface border border-outline-variant rounded-xs p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Motivo de Consulta
                </label>
                <select 
                  v-model="subject"
                  class="w-full bg-surface border border-outline-variant rounded-xs p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                >
                  <option>Asesoramiento Personalizado</option>
                  <option>Consulta sobre mi Pedido / Envío</option>
                  <option>Recomendación de Perfume para Regalo</option>
                  <option>Ventas Corporativas / Mayoristas</option>
                  <option>Otro Asunto</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                Mensaje *
              </label>
              <textarea 
                v-model="message"
                rows="5" 
                placeholder="Escribí aquí tus dudas, preferencias de aromas o detalles de tu pedido..."
                class="w-full bg-surface border rounded-xs p-3 text-sm font-sans text-primary focus:outline-none transition-colors"
                :class="messageError ? 'border-red-500 bg-red-50/20' : 'border-outline-variant focus:border-primary'"
              ></textarea>
              <p v-if="messageError" class="text-[11px] text-red-600 font-sans mt-1 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">error</span>
                {{ messageError }}
              </p>
            </div>

            <button 
              type="submit"
              :disabled="isSending"
              class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              <span v-if="isSending">Enviando mensaje...</span>
              <span v-else>Enviar Mensaje</span>
              <span v-if="!isSending" class="material-symbols-outlined text-sm">send</span>
            </button>
          </form>
        </div>

      </div>

      <!-- FAQ ACCORDION SECTION -->
      <div id="faq" class="max-w-3xl mx-auto border-t border-outline-variant pt-16">
        <div class="text-center mb-12">
          <span class="font-label text-xs uppercase tracking-widest text-secondary mb-2 block">Dudas Comunes</span>
          <h2 class="font-sans text-3xl sm:text-4xl text-primary font-normal">Preguntas Frecuentes</h2>
        </div>

        <div class="space-y-4">
          <div 
            v-for="faq in faqs" 
            :key="faq.id"
            class="bg-surface-container border border-outline-variant rounded-xs overflow-hidden transition-colors shadow-2xs"
          >
            <button 
              @click="toggleFaq(faq.id)"
              class="w-full text-left p-5 sm:p-6 flex justify-between items-center gap-4 font-sans text-lg text-primary font-medium"
            >
              <span>{{ faq.q }}</span>
              <span class="material-symbols-outlined text-xl transition-transform" :class="openFaq === faq.id ? 'rotate-180' : ''">
                expand_more
              </span>
            </button>
            
            <div 
              v-if="openFaq === faq.id"
              class="px-5 sm:px-6 pb-6 font-sans text-sm text-secondary leading-relaxed border-t border-outline-variant pt-4 bg-surface/50"
            >
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
