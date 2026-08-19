<script setup>
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  subject: 'Asesoramiento Personalizado',
  message: ''
})

const isSending = ref(false)
const openFaq = ref(null)

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
    q: '¿Cómo funciona la muestra de cortesía gratis?',
    a: 'En el carrito de compras podrás seleccionar 1 muestra exclusiva de cortesía (de 1.5ml a 2ml con atomizador) sin ningún costo adicional. Es ideal para conocer nuevas creaciones antes de adquirirlas en formato grande.'
  },
  {
    id: 4,
    q: '¿Qué medios de pago aceptan y cómo aplico el descuento por transferencia?',
    a: 'Aceptamos todas las tarjetas de crédito bancarias con 3 y 6 cuotas fijas a través de Mercado Pago. Si elegís abonar por Transferencia Bancaria, obtenés un 10% de descuento automático en el checkout.'
  },
  {
    id: 5,
    q: '¿Puedo realizar cambios si el perfume no es de mi agrado?',
    a: 'Por normas sanitarias y de autenticidad de fragancias de lujo, los perfumes cerrados con celofán original pueden cambiarse dentro de los 30 días posteriores a la compra. Recomendamos siempre probar primero la muestra de cortesía incluida antes de abrir el empaque principal.'
  }
]

const toggleFaq = (id) => {
  openFaq.value = openFaq.value === id ? null : id
}

const handleSubmitContact = () => {
  isSending.value = true
  setTimeout(() => {
    isSending.value = false
    toastStore.show('¡Mensaje enviado con éxito! Un sommelier de Gicca se comunicará a la brevedad.', 'success')
    contactForm.value = {
      name: '',
      email: '',
      phone: '',
      subject: 'Asesoramiento Personalizado',
      message: ''
    }
  }, 1000)
}
</script>

<template>
  <div class="bg-surface py-12">
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Header -->
      <div class="text-center max-w-2xl mx-auto mb-16">
        <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary mb-2 block">Concierge & Soporte</span>
        <h1 class="font-serif text-4xl sm:text-5xl text-primary font-normal tracking-tight mb-4">
          Estamos a tu Disposición
        </h1>
        <p class="font-sans text-secondary text-sm sm:text-base leading-relaxed">
          Ya sea que busques asesoramiento para una ocasión especial, un regalo inolvidable o tengas consultas sobre tu orden, nuestro equipo sommelier te responderá con dedicación.
        </p>
      </div>

      <!-- Main Layout: Contact Info & Form -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-24">
        
        <!-- Contact Channels (5 cols - Rounded 3xl) -->
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-surface-container border border-outline-variant rounded-3xl p-8 space-y-6 shadow-xs">
            <h3 class="font-serif text-2xl text-primary font-normal">Canales de Atención VIP</h3>

            <div class="space-y-4 font-sans text-sm text-secondary">
              <div class="flex items-start gap-3 p-3 bg-surface rounded-2xl border border-outline-variant shadow-2xs">
                <span class="material-symbols-outlined text-primary text-xl mt-0.5">chat</span>
                <div>
                  <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold">WhatsApp Concierge</h4>
                  <p class="mt-0.5">+54 9 11 5824-9910</p>
                  <p class="text-xs text-outline">Lunes a Sábados de 09:00 a 20:00 hs.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3 bg-surface rounded-2xl border border-outline-variant shadow-2xs">
                <span class="material-symbols-outlined text-primary text-xl mt-0.5">mail</span>
                <div>
                  <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold">Correo Electrónico</h4>
                  <p class="mt-0.5">concierge@giccaperfumes.com</p>
                  <p class="text-xs text-outline">Respuesta garantizada en menos de 4 horas.</p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3 bg-surface rounded-2xl border border-outline-variant shadow-2xs">
                <span class="material-symbols-outlined text-primary text-xl mt-0.5">location_on</span>
                <div>
                  <h4 class="font-label text-xs uppercase tracking-widest text-primary font-bold">Atelier Privado</h4>
                  <p class="mt-0.5">Recoleta, Ciudad Autónoma de Buenos Aires</p>
                  <p class="text-xs text-outline">Visitas exclusivas con cita previa.</p>
                </div>
              </div>
            </div>

            <!-- WhatsApp Direct Action Button (Pill) -->
            <a 
              href="https://wa.me/5491158249910?text=Hola%20Gicca%20Perfumes!%20Me%20gustar%C3%ADa%20recibir%20asesoramiento%20sobre%20sus%20fragancias."
              target="_blank"
              class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 px-6 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 text-center block shadow-xs"
            >
              <span>Abrir WhatsApp con Asesor</span>
              <span class="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </div>
        </div>

        <!-- Form (7 cols - Rounded 3xl) -->
        <div class="lg:col-span-7 bg-surface-container border border-outline-variant rounded-3xl p-8 md:p-10 shadow-xs">
          <h3 class="font-serif text-2xl text-primary font-normal mb-1">Envíanos un Mensaje</h3>
          <p class="font-sans text-xs text-secondary mb-6">Completá tus datos y te responderemos a la brevedad.</p>

          <form @submit.prevent="handleSubmitContact" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Nombre Completo *
                </label>
                <input 
                  v-model="contactForm.name"
                  type="text" 
                  required
                  placeholder="Tu nombre"
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Email *
                </label>
                <input 
                  v-model="contactForm.email"
                  type="email" 
                  required
                  placeholder="tu@email.com"
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Teléfono / WhatsApp
                </label>
                <input 
                  v-model="contactForm.phone"
                  type="tel" 
                  placeholder="+54 9 11 ..."
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">
                  Motivo de Consulta
                </label>
                <select 
                  v-model="contactForm.subject"
                  class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
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
                v-model="contactForm.message"
                rows="5" 
                required
                placeholder="Escribí aquí tus dudas, preferencias de aromas o detalles de tu pedido..."
                class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-sm font-sans text-primary focus:border-primary focus:outline-none"
              ></textarea>
            </div>

            <button 
              type="submit"
              :disabled="isSending"
              class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 font-bold shadow-md disabled:opacity-50"
            >
              <span v-if="isSending">Enviando mensaje...</span>
              <span v-else>Enviar Consulta</span>
              <span class="material-symbols-outlined text-sm">send</span>
            </button>
          </form>
        </div>

      </div>

      <!-- FAQ ACCORDION SECTION (Rounded 2xl items) -->
      <div id="faq" class="max-w-3xl mx-auto border-t border-outline-variant pt-16">
        <div class="text-center mb-12">
          <span class="font-label text-xs uppercase tracking-widest text-secondary mb-2 block">Dudas Comunes</span>
          <h2 class="font-serif text-3xl sm:text-4xl text-primary font-normal">Preguntas Frecuentes</h2>
        </div>

        <div class="space-y-4">
          <div 
            v-for="faq in faqs" 
            :key="faq.id"
            class="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden transition-colors shadow-2xs"
          >
            <button 
              @click="toggleFaq(faq.id)"
              class="w-full text-left p-5 sm:p-6 flex justify-between items-center gap-4 font-serif text-lg text-primary font-medium"
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
