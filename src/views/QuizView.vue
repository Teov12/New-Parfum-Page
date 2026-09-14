<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const productStore = useProductStore()
const cartStore = useCartStore()
const toastStore = useToastStore()

onMounted(() => {
  if (productStore.items.length === 0) {
    productStore.fetchProducts()
  }
})

const currentStep = ref(0)
const answers = ref({
  gender: '',
  intensity: '',
  family: '',
  occasion: ''
})

const questions = [
  {
    key: 'gender',
    title: '¿Para quién estás buscando esta fragancia?',
    subtitle: 'El punto de partida para una recomendación precisa.',
    options: [
      { label: 'Para Mujer', value: 'woman', icon: 'female' },
      { label: 'Para Hombre', value: 'man', icon: 'male' },
      { label: 'Unisex / Sin Género', value: 'unisex', icon: 'all_inclusive' },
      { label: 'Para un Regalo', value: 'unisex', icon: 'card_giftcard' }
    ]
  },
  {
    key: 'family',
    title: '¿Qué tipo de aromas te gustan más?',
    subtitle: 'Elegí el estilo de aroma con el que más te identificás.',
    options: [
      { label: 'Florales & Dulces (Jazmín, Azahar, Rosa)', value: 'Floral', icon: 'spa' },
      { label: 'Maderas (Cedro, Sándalo, Vetiver)', value: 'Amaderada', icon: 'forest' },
      { label: 'Orientales & Cálidos (Vainilla, Ámbar, Canela)', value: 'Oriental', icon: 'local_fire_department' },
      { label: 'Cítricos & Frescos (Bergamota, Mandarina)', value: 'Cítrica', icon: 'wb_sunny' }
    ]
  },
  {
    key: 'intensity',
    title: '¿Qué intensidad preferís?',
    subtitle: '¿Buscás algo sutil para trabajar o que se note bastante?',
    options: [
      { label: 'Suave & Discreta (A ras de piel)', value: 'Discreta', icon: 'bubble_chart' },
      { label: 'Moderada (Perfecta para todo el día)', value: 'Moderada', icon: 'auto_awesome' },
      { label: 'Intensa & Marcada (Para que se sienta todo el día)', value: 'Enorme', icon: 'offline_bolt' }
    ]
  },
  {
    key: 'occasion',
    title: '¿En qué momento lo vas a usar más?',
    subtitle: 'Así te recomendamos una opción que se adapte a tu rutina.',
    options: [
      { label: 'Uso Diario & Trabajo', value: 'Diario', icon: 'work' },
      { label: 'Citas & Salidas de Noche', value: 'Noche', icon: 'nightlife' },
      { label: 'Fiestas & Eventos', value: 'Eventos', icon: 'diamond' },
      { label: 'Versátil (Para todo momento)', value: 'Versatil', icon: 'star' }
    ]
  }
]

const selectOption = (key, val) => {
  answers.value[key] = val
  if (currentStep.value < questions.length - 1) {
    currentStep.value++
  } else {
    // Finish
    currentStep.value = questions.length
  }
}

const matchResult = computed(() => {
  if (!productStore.items || productStore.items.length === 0) return null
  // Return matching product
  let matched = productStore.items.find(p => p.gender === answers.value.gender && p.fragranceFamily === answers.value.family)
  if (!matched) {
    matched = productStore.items.find(p => p.fragranceFamily === answers.value.family)
  }
  if (!matched) {
    matched = productStore.items.find(p => p.gender === answers.value.gender)
  }
  return matched || productStore.items[0] || null
})

const restart = () => {
  currentStep.value = 0
  answers.value = { gender: '', intensity: '', family: '', occasion: '' }
}

const handleAddRecommended = () => {
  if (!matchResult.value) return
  const defaultSize = matchResult.value.sizes?.find(s => s.default) || matchResult.value.sizes?.[0]
  cartStore.addItem(matchResult.value, defaultSize, 1)
  toastStore.show(`¡${matchResult.value.name} agregado a tu bolsa!`, 'success')
}
</script>

<template>
  <div class="bg-surface-container py-16">
    <div class="max-w-3xl mx-auto px-margin-mobile">
      
      <!-- Quiz Progress Bar (Píldora) -->
      <div v-if="currentStep < questions.length" class="mb-10 text-center">
        <span class="font-label text-xs uppercase tracking-[0.2em] text-secondary mb-2 block">
          Paso {{ currentStep + 1 }} de {{ questions.length }} • Fragrance Finder
        </span>
        <div class="w-full bg-secondary-container h-2 rounded-full overflow-hidden max-w-md mx-auto">
          <div 
            class="bg-primary-container h-full rounded-full transition-all duration-300"
            :style="{ width: `${((currentStep + 1) / questions.length) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- QUESTION STEPS WITH FLUID TRANSITION -->
      <Transition name="quiz-step" mode="out-in">
        <div 
          v-if="currentStep < questions.length"
          :key="currentStep"
          class="bg-surface border border-outline-variant rounded-2xl p-8 sm:p-12 shadow-md space-y-8"
        >
          <div class="text-center">
            <h1 class="font-sans text-3xl sm:text-4xl text-primary font-normal mb-2">
              {{ questions[currentStep].title }}
            </h1>
            <p class="font-sans text-sm text-secondary">
              {{ questions[currentStep].subtitle }}
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              v-for="opt in questions[currentStep].options"
              :key="opt.label"
              @click="selectOption(questions[currentStep].key, opt.value)"
              class="p-6 bg-surface-container-low hover:bg-surface-container border border-outline-variant hover:border-primary rounded-xl flex flex-col items-center text-center gap-3 transition-all duration-300 group shadow-2xs hover:shadow-md hover:-translate-y-1 active:scale-98"
            >
              <span class="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform duration-300">
                {{ opt.icon }}
              </span>
              <span class="font-sans text-base text-primary font-medium">
                {{ opt.label }}
              </span>
            </button>
          </div>

          <div v-if="currentStep > 0" class="text-center pt-2">
            <button 
              @click="currentStep--"
              class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline transition-colors"
            >
              ← Volver a la pregunta anterior
            </button>
          </div>
        </div>

        <!-- FINAL RESULT SCREEN -->
        <div 
          v-else-if="matchResult" 
          key="result"
          class="bg-surface border border-outline-variant rounded-2xl p-8 sm:p-12 shadow-lg space-y-8 text-center"
        >
        <div class="inline-flex items-center gap-1.5 bg-surface-container px-4 py-1.5 rounded-full border border-outline-variant text-tertiary font-label text-xs uppercase tracking-widest font-bold">
          <span class="material-symbols-outlined text-sm">auto_awesome</span>
          <span>Recomendación Especial para Vos</span>
        </div>

        <div>
          <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary block mb-1">Tu Fragancia Ideal es:</span>
          <h2 class="font-sans text-4xl sm:text-5xl text-primary font-normal mb-2">
            {{ matchResult.name }}
          </h2>
          <p class="font-sans text-sm text-secondary">
            Por {{ matchResult.brand }} • {{ matchResult.concentration }} • Familia {{ matchResult.fragranceFamily }}
          </p>
        </div>

        <!-- Product Presentation Box -->
        <div class="bg-surface-container-low rounded-xs p-6 border border-outline-variant flex flex-col sm:flex-row items-center gap-6 text-left max-w-xl mx-auto shadow-2xs">
          <img 
            :src="matchResult.images[0]" 
            :alt="matchResult.name"
            class="w-32 h-40 object-cover bg-surface rounded-xs border border-outline-variant flex-shrink-0"
          />
          <div class="space-y-2">
            <p class="font-sans text-xs text-secondary leading-relaxed">
              {{ matchResult.shortDescription }}
            </p>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span 
                v-for="note in matchResult.olfactoryPyramid.topNotes" 
                :key="note"
                class="font-label text-[10px] uppercase bg-surface px-2.5 py-0.5 rounded-full border border-outline-variant"
              >
                {{ note }}
              </span>
            </div>
            <div class="pt-2">
              <span class="font-sans font-bold text-xl text-primary">
                ${{ matchResult.price.toLocaleString('es-AR') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action CTAs: Píldoras -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button 
            @click="handleAddRecommended"
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-4 rounded-full hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span class="material-symbols-outlined text-sm">shopping_bag</span>
            <span>Añadir a mi Bolsa de Compras</span>
          </button>

          <RouterLink 
            :to="`/producto/${matchResult.slug}`"
            class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-4 rounded-full border border-outline hover:bg-surface-container transition-all text-center shadow-2xs"
          >
            Ver Ficha Completa
          </RouterLink>
        </div>

        <div class="pt-4 border-t border-outline-variant">
          <button 
            @click="restart"
            class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline"
          >
            Reiniciar Quiz Olfativo
          </button>
        </div>
      </div>

      <!-- EMPTY PRODUCTS QUIZ RESULT FALLBACK -->
      <div 
        v-else 
        key="fallback"
        class="bg-surface border border-outline-variant rounded-2xl p-8 sm:p-12 shadow-lg space-y-6 text-center"
      >
        <span class="material-symbols-outlined text-6xl text-neutral-300 animate-float-gentle">auto_awesome</span>
        <h2 class="font-sans text-3xl text-primary font-normal">¡Test completado con éxito!</h2>
        <p class="font-sans text-sm text-secondary max-w-md mx-auto leading-relaxed">
          Hemos registrado tus preferencias olfativas. Próximamente se sincronizarán nuevas fragancias personalizadas para vos en nuestro catálogo.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <RouterLink 
            to="/catalogo"
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-inverse-surface transition-all shadow-xs hover:shadow-md active:scale-95"
          >
            Ir al Catálogo
          </RouterLink>
          <button 
            @click="restart"
            class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline hover:bg-surface-container transition-all shadow-2xs hover:shadow-sm active:scale-95"
          >
            Reiniciar Test
          </button>
        </div>
      </div>
      </Transition>

    </div>
  </div>
</template>
