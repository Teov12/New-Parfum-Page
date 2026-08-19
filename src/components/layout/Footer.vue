<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
const emailInput = ref('')
const isSubscribed = ref(false)

const handleSubscribe = () => {
  if (!emailInput.value || !emailInput.value.includes('@')) {
    toastStore.show('Por favor ingresá un correo electrónico válido.', 'error')
    return
  }
  isSubscribed.value = true
  toastStore.show('¡Gracias por unirte al Club Gicca! Te enviamos tu cupón del 10% OFF.', 'success')
  emailInput.value = ''
}
</script>

<template>
  <footer class="bg-surface-container border-t border-outline-variant text-on-surface">
    <!-- Main Footer Content -->
    <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
      
      <!-- Brand Story Column (4 cols) -->
      <div class="lg:col-span-4 flex flex-col justify-between">
        <div>
          <h3 class="font-serif text-3xl text-primary font-normal tracking-tight mb-4">
            Gicca Perfumes
          </h3>
          <p class="font-sans text-sm text-secondary leading-relaxed mb-6 max-w-sm">
            Elevando la experiencia sensorial a través de una curaduría inquebrantable de fragancias excepcionales, perfumería nicho y fórmulas de autor importadas de los principales talleres del mundo.
          </p>
          <div class="space-y-1.5 text-xs font-label uppercase tracking-widest text-secondary">
            <p>📍 Buenos Aires, Argentina</p>
            <p>✉️ concierge@giccaperfumes.com</p>
            <p>📞 Asesoría VIP WhatsApp: +54 9 11 5824-9910</p>
          </div>
        </div>

        <div class="flex gap-3 mt-8">
          <a href="#" class="w-10 h-10 rounded-full border border-outline flex items-center justify-center text-primary hover:bg-primary hover:text-surface transition-colors shadow-2xs" aria-label="Instagram">
            <span class="font-label text-xs font-bold">IG</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full border border-outline flex items-center justify-center text-primary hover:bg-primary hover:text-surface transition-colors shadow-2xs" aria-label="TikTok">
            <span class="font-label text-xs font-bold">TT</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full border border-outline flex items-center justify-center text-primary hover:bg-primary hover:text-surface transition-colors shadow-2xs" aria-label="WhatsApp">
            <span class="font-label text-xs font-bold">WA</span>
          </a>
        </div>
      </div>

      <!-- Quick Links (2 cols) -->
      <div class="lg:col-span-2">
        <h4 class="font-label text-label-sm text-primary uppercase tracking-widest mb-6 font-bold border-b border-outline-variant pb-2 inline-block">
          Colecciones
        </h4>
        <ul class="space-y-3 font-sans text-sm text-secondary">
          <li>
            <RouterLink to="/catalogo?gender=woman" class="hover:text-primary transition-colors">
              Perfumes Mujer
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/catalogo?gender=man" class="hover:text-primary transition-colors">
              Perfumes Hombre
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/catalogo?gender=unisex" class="hover:text-primary transition-colors">
              Fragancias Unisex
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/catalogo?family=Oriental" class="hover:text-primary transition-colors">
              Perfumería Nicho
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/catalogo?offers=true" class="hover:text-primary transition-colors font-medium text-primary">
              Ofertas de Temporada
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/quiz" class="hover:text-primary transition-colors flex items-center gap-1 text-primary">
              <span class="material-symbols-outlined text-xs">auto_awesome</span>
              <span>Fragrance Finder</span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <!-- Customer Service (2 cols) -->
      <div class="lg:col-span-2">
        <h4 class="font-label text-label-sm text-primary uppercase tracking-widest mb-6 font-bold border-b border-outline-variant pb-2 inline-block">
          Atención VIP
        </h4>
        <ul class="space-y-3 font-sans text-sm text-secondary">
          <li>
            <RouterLink to="/nosotros" class="hover:text-primary transition-colors">
              El Atelier Gicca
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/contacto" class="hover:text-primary transition-colors">
              Asesoría & Contacto
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/contacto#faq" class="hover:text-primary transition-colors">
              Preguntas Frecuentes
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/contacto#envios" class="hover:text-primary transition-colors">
              Tiempos de Entrega
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/contacto#garantia" class="hover:text-primary transition-colors">
              Garantía de Originalidad
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/contacto#cambios" class="hover:text-primary transition-colors">
              Política de Cambios
            </RouterLink>
          </li>
        </ul>
      </div>

      <!-- Newsletter Column (4 cols) -->
      <div class="lg:col-span-4">
        <h4 class="font-label text-label-sm text-primary uppercase tracking-widest mb-6 font-bold border-b border-outline-variant pb-2 inline-block">
          El Círculo Olfativo
        </h4>
        <p class="font-sans text-sm text-secondary mb-4 leading-relaxed">
          Unite a nuestra comunidad exclusiva. Recibí invitaciones a lanzamientos privados, notas de cata y <strong>10% OFF</strong> en tu primera orden.
        </p>

        <form @submit.prevent="handleSubscribe" class="space-y-3">
          <div class="flex flex-col sm:flex-row gap-2 bg-surface p-1.5 rounded-full border border-outline-variant focus-within:border-primary shadow-xs">
            <input 
              v-model="emailInput"
              type="email" 
              placeholder="Tu correo electrónico..."
              required
              class="w-full bg-transparent px-4 py-2.5 text-sm font-sans text-primary placeholder:text-secondary focus:outline-none"
            />
            <button 
              type="submit"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-full hover:bg-inverse-surface transition-all flex-shrink-0 shadow-xs"
            >
              Unirme
            </button>
          </div>
          <p class="text-[11px] text-secondary">
            Respetamos tu privacidad. Podés desuscribirte cuando gustes.
          </p>
        </form>

        <div class="mt-6 pt-6 border-t border-outline-variant grid grid-cols-3 gap-3 text-center">
          <div class="p-3 bg-surface rounded-2xl border border-outline-variant shadow-2xs">
            <span class="material-symbols-outlined text-lg text-primary mb-1">verified_user</span>
            <p class="font-label text-[10px] uppercase text-secondary">100% Original</p>
          </div>
          <div class="p-3 bg-surface rounded-2xl border border-outline-variant shadow-2xs">
            <span class="material-symbols-outlined text-lg text-primary mb-1">local_shipping</span>
            <p class="font-label text-[10px] uppercase text-secondary">Envíos País</p>
          </div>
          <div class="p-3 bg-surface rounded-2xl border border-outline-variant shadow-2xs">
            <span class="material-symbols-outlined text-lg text-primary mb-1">credit_card</span>
            <p class="font-label text-[10px] uppercase text-secondary">Cuotas Sin Interés</p>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom Copyright Subfooter -->
    <div class="border-t border-outline-variant bg-surface py-6">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-label text-secondary uppercase tracking-wider">
        <p>© 2026 Gicca Perfumes Boutique. Todos los derechos reservados.</p>
        <div class="flex gap-6">
          <a href="#" class="hover:text-primary transition-colors">Términos y Condiciones</a>
          <a href="#" class="hover:text-primary transition-colors">Privacidad</a>
          <a href="#" class="hover:text-primary transition-colors">Defensa del Consumidor</a>
        </div>
      </div>
    </div>
  </footer>
</template>
