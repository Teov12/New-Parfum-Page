<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { products } from '@/data/products'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const cartStore = useCartStore()
const toastStore = useToastStore()

const currentQuestion = ref(0)

const answers = ref({
  gender: null,
  vibe: null,
  occasion: null,
  intensity: null
})

const isCompleted = ref(false)

const questions = [
  {
    title: '¿Para quién buscas la fragancia?',
    subtitle: 'Elige el universo que mejor represente al destinatario.',
    field: 'gender',
    options: [
      { label: 'Para Mujer', value: 'woman', icon: 'favorite', desc: 'Aromas florales, avainillados y luminosos.' },
      { label: 'Para Hombre', value: 'man', icon: 'military_tech', desc: 'Acordes amaderados, cítricos y aromáticos.' },
      { label: 'Unisex / Sin Género', value: 'unisex', icon: 'all_inclusive', desc: 'Creaciones de autor, azafrán y maderas raras.' }
    ]
  },
  {
    title: '¿Qué acordes aromáticos te cautivan más?',
    subtitle: 'Elige la familia sensorial que despierte tu curiosidad.',
    field: 'vibe',
    options: [
      { label: 'Flores Blancas & Lavanda', value: 'Floral', icon: 'spa', desc: 'Jazmín, flor de azahar, rosa de Grasse y lavanda.' },
      { label: 'Maderas Nobles & Cuero', value: 'Amaderada', icon: 'nature', desc: 'Sándalo, cedro, vetiver y humo dulce.' },
      { label: 'Azafrán, Ámbar & Vainilla', value: 'Oriental', icon: 'hotel_class', desc: 'Resinas orientales, especias y dulzor gourmand.' },
      { label: 'Cítricos Italianos & Acuáticos', value: 'Cítrica', icon: 'waves', desc: 'Mandarina verde, bergamota y brisa marina.' }
    ]
  },
  {
    title: '¿En qué ocasión imaginas llevar esta fragancia?',
    subtitle: 'Cada escenario tiene una proyección olfativa ideal.',
    field: 'occasion',
    options: [
      { label: 'Uso Diario & Oficina', value: 'daily', icon: 'wb_sunny', desc: 'Elegancia sutil y limpia que acompaña todo el día.' },
      { label: 'Citas & Momentos Íntimos', value: 'intimate', icon: 'nightlight', desc: 'Estela envolvente, sensual y memorable de cerca.' },
      { label: 'Eventos Nocturnos & Gala', value: 'gala', icon: 'celebration', desc: 'Presencia magnética que deja una huella inconfundible.' }
    ]
  },
  {
    title: '¿Qué intensidad de proyección prefieres?',
    subtitle: 'Determina la fuerza y longevidad en tu piel.',
    field: 'intensity',
    options: [
      { label: 'Moderada y Sofisticada', value: 'moderate', icon: 'filter_vintage', desc: 'Aura distinguida que se percibe a distancia conversacional.' },
      { label: 'Intensa & Monumental', value: 'intense', icon: 'bolt', desc: 'Máxima concentración (Parfum / Extrait) con estela expansiva.' }
    ]
  }
]

const selectOption = (field, value) => {
  answers.value[field] = value
  if (currentQuestion.value < questions.length - 1) {
    currentQuestion.value++
  } else {
    isCompleted.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const recommendedProducts = computed(() => {
  if (!isCompleted.value) return []

  let matched = products.filter(p => {
    if (answers.value.gender && answers.value.gender !== 'unisex' && p.gender !== answers.value.gender && p.gender !== 'unisex') {
      return false
    }
    return true
  })

  if (answers.value.vibe) {
    const familyMatched = matched.filter(p => p.fragranceFamily === answers.value.vibe)
    if (familyMatched.length > 0) {
      matched = familyMatched
    }
  }

  return matched.slice(0, 3)
})

const restartQuiz = () => {
  answers.value = { gender: null, vibe: null, occasion: null, intensity: null }
  currentQuestion.value = 0
  isCompleted.value = false
}

const addRecommendedToCart = (prod) => {
  cartStore.addItem(prod)
  toastStore.show(`¡${prod.name} añadido a tu bolsa!`, 'success')
}
</script>

<template>
  <div class="bg-surface-container py-16 min-h-screen flex flex-col justify-center">
    <div class="max-w-2xl mx-auto px-margin-mobile md:px-margin-desktop w-full">
      
      <!-- QUIZ ACTIVE QUESTIONS -->
      <div v-if="!isCompleted" class="bg-surface border border-primary p-8 md:p-12 shadow-md animate-in fade-in">
        <!-- Step Progress -->
        <div class="flex justify-between items-center text-xs font-label uppercase tracking-widest text-secondary mb-8 border-b border-outline-variant pb-4">
          <span>Fragrance Finder</span>
          <span>Pregunta {{ currentQuestion + 1 }} de {{ questions.length }}</span>
        </div>

        <!-- Question Header -->
        <div class="mb-8">
          <h2 class="font-serif text-3xl sm:text-4xl text-primary font-normal leading-tight mb-2">
            {{ questions[currentQuestion].title }}
          </h2>
          <p class="font-sans text-sm text-secondary">
            {{ questions[currentQuestion].subtitle }}
          </p>
        </div>

        <!-- Options Grid -->
        <div class="space-y-4">
          <button
            v-for="opt in questions[currentQuestion].options"
            :key="opt.value"
            @click="selectOption(questions[currentQuestion].field, opt.value)"
            class="w-full text-left p-5 border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-all flex items-start gap-4 group"
          >
            <div class="w-10 h-10 bg-surface-container flex items-center justify-center border border-outline-variant flex-shrink-0 group-hover:border-primary text-primary">
              <span class="material-symbols-outlined text-xl">{{ opt.icon }}</span>
            </div>
            <div>
              <h4 class="font-serif text-lg text-primary font-medium group-hover:text-primary-container transition-colors">
                {{ opt.label }}
              </h4>
              <p class="font-sans text-xs text-secondary mt-0.5">
                {{ opt.desc }}
              </p>
            </div>
          </button>
        </div>

        <!-- Back Button -->
        <div v-if="currentQuestion > 0" class="mt-8 pt-4 border-t border-outline-variant flex justify-start">
          <button 
            @click="currentQuestion--"
            class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline"
          >
            ← Volver a la pregunta anterior
          </button>
        </div>
      </div>

      <!-- QUIZ RESULTS -->
      <div v-else class="space-y-8 animate-in fade-in">
        <div class="bg-surface border border-primary p-8 md:p-12 text-center">
          <span class="material-symbols-outlined text-4xl text-primary mb-2">auto_awesome</span>
          <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary block mb-1">Resultados de tu Diagnóstico</span>
          <h2 class="font-serif text-3xl sm:text-4xl text-primary font-normal mb-3">
            Tus Fragancias con Mayor Afinidad
          </h2>
          <p class="font-sans text-sm text-secondary max-w-md mx-auto leading-relaxed mb-8">
            Basándonos en tus preferencias olfativas y ocasión de uso, estas creaciones encajan en un <strong>98%</strong> con tu identidad.
          </p>

          <!-- Recommended List -->
          <div class="space-y-6 text-left">
            <div 
              v-for="(prod, index) in recommendedProducts" 
              :key="prod.id"
              class="bg-surface-container border border-outline-variant p-6 flex flex-col sm:flex-row gap-6 items-center"
            >
              <img 
                :src="prod.images[0]" 
                :alt="prod.name"
                class="w-28 h-36 object-cover bg-surface border border-outline-variant flex-shrink-0"
              />

              <div class="flex-grow min-w-0 space-y-2">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-label text-[10px] uppercase tracking-widest text-secondary">{{ prod.brand }}</span>
                    <h3 class="font-serif text-2xl text-primary font-normal">{{ prod.name }}</h3>
                  </div>
                  <span class="font-label text-xs bg-primary-container text-on-primary px-2.5 py-1 uppercase font-bold">
                    {{ index === 0 ? '99% Match' : '95% Match' }}
                  </span>
                </div>

                <p class="font-sans text-xs text-secondary leading-relaxed">
                  {{ prod.shortDescription }}
                </p>

                <div class="flex flex-wrap gap-1 pt-1">
                  <span 
                    v-for="note in prod.olfactoryPyramid.topNotes.slice(0, 3)"
                    :key="note"
                    class="font-label text-[10px] uppercase bg-surface px-2 py-0.5 border border-outline-variant text-secondary"
                  >
                    {{ note }}
                  </span>
                </div>

                <div class="pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant">
                  <span class="font-sans font-bold text-lg text-primary">
                    ${{ prod.price.toLocaleString('es-AR') }}
                  </span>

                  <div class="flex gap-2">
                    <RouterLink 
                      :to="`/producto/${prod.slug}`"
                      class="bg-transparent text-primary font-label text-xs uppercase tracking-widest px-4 py-2 border border-primary hover:bg-surface transition-colors"
                    >
                      Ver Detalle
                    </RouterLink>
                    <button 
                      @click="addRecommendedToCart(prod)"
                      class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-4 py-2 border border-primary-container hover:bg-inverse-surface transition-colors"
                    >
                      Añadir a la Bolsa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Restart CTA -->
          <div class="mt-10 pt-6 border-t border-outline-variant">
            <button 
              @click="restartQuiz"
              class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline"
            >
              🔄 Volver a hacer el test
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
