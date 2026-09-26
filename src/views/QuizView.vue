<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'
import { useTenantStore } from '@/stores/tenant'
import { normalizeGender } from '@/utils/normalize'

const productStore = useProductStore()
const cartStore = useCartStore()
const toastStore = useToastStore()
const tenantStore = useTenantStore()

onMounted(async () => {
  if (productStore.items.length === 0) {
    await productStore.fetchProducts()
  }
  if (!tenantStore.name) {
    tenantStore.fetchCurrentTenant()
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
    subtitle: 'El punto de partida para una recomendación precisa y personalizada.',
    options: [
      { label: 'Para Mujer', value: 'woman', icon: 'female', desc: 'Aromas florales, gourmand y seductores' },
      { label: 'Para Hombre', value: 'man', icon: 'male', desc: 'Aromas amaderados, especiados y frescos' },
      { label: 'Unisex / Sin Género', value: 'unisex', icon: 'all_inclusive', desc: 'Fragancias compartidas de alta perfumería' },
      { label: 'Para un Regalo', value: 'unisex', icon: 'card_giftcard', desc: 'Aciertos seguros y fragancias elogiadas' }
    ]
  },
  {
    key: 'family',
    title: '¿Qué tipo de aromas te gustan más?',
    subtitle: 'Elegí el estilo o vibra olfativa con la que más te identificás.',
    options: [
      { label: 'Florales & Dulces', value: 'Floral', icon: 'spa', desc: 'Jazmín, Azahar, Rosa, Vainilla suave' },
      { label: 'Maderas Nobles', value: 'Amaderada', icon: 'forest', desc: 'Cedro, Sándalo, Vetiver, Pachulí' },
      { label: 'Orientales & Cálidos', value: 'Oriental', icon: 'local_fire_department', desc: 'Vainilla, Ámbar, Canela, Especias' },
      { label: 'Cítricos & Frescos', value: 'Cítrica', icon: 'wb_sunny', desc: 'Bergamota, Mandarina, Notas acuáticas' }
    ]
  },
  {
    key: 'intensity',
    title: '¿Qué intensidad y estela preferís?',
    subtitle: '¿Buscás algo sutil e íntimo o un perfume que marque presencia?',
    options: [
      { label: 'Suave & Discreta', value: 'Discreta', icon: 'bubble_chart', desc: 'A ras de piel, para oficinas o cercanía' },
      { label: 'Moderada & Versátil', value: 'Moderada', icon: 'auto_awesome', desc: 'Elegancia equilibrada para todo el día' },
      { label: 'Intensa & Con Carácter', value: 'Enorme', icon: 'offline_bolt', desc: 'Gran proyección y estela duradera' }
    ]
  },
  {
    key: 'occasion',
    title: '¿En qué momento lo vas a usar más?',
    subtitle: 'Así te recomendamos una opción que se adapte perfectamente a tu rutina.',
    options: [
      { label: 'Uso Diario & Oficina', value: 'Diario', icon: 'work', desc: 'Aroma fresco, limpio y profesional' },
      { label: 'Citas & Salidas de Noche', value: 'Noche', icon: 'nightlife', desc: 'Misterioso, seductor y envolvente' },
      { label: 'Fiestas & Eventos Especiales', value: 'Eventos', icon: 'diamond', desc: 'Para recibir elogios y destacar' },
      { label: 'Versátil (Para Todo Momento)', value: 'Versatil', icon: 'star', desc: 'El comodín infalible en cualquier ocasión' }
    ]
  }
]

const selectOption = (key, val) => {
  answers.value[key] = val
  if (currentStep.value < questions.length - 1) {
    currentStep.value++
  } else {
    currentStep.value = questions.length
  }
}

// Multi-criteria scoring algorithm
const scoredResults = computed(() => {
  const items = productStore.items || []
  if (items.length === 0) return []

  const ansGender = normalizeGender(answers.value.gender)
  const ansFamily = answers.value.family?.toLowerCase().trim()
  const ansIntensity = answers.value.intensity?.toLowerCase().trim()
  const ansOccasion = answers.value.occasion?.toLowerCase().trim()

  const scored = items.map(p => {
    let score = 0
    const pGender = normalizeGender(p.gender)
    const pFamily = (p.fragranceFamily || '').toLowerCase()
    const pNotes = [
      ...(p.olfactoryPyramid?.topNotes || []),
      ...(p.olfactoryPyramid?.heartNotes || []),
      ...(p.olfactoryPyramid?.baseNotes || [])
    ].join(' ').toLowerCase()
    const pDesc = (p.description || '').toLowerCase()
    const pOccasion = (p.characteristics?.occasion || '').toLowerCase()
    const pSillage = (p.characteristics?.sillage || '').toLowerCase()
    const pLongevity = (p.characteristics?.longevity || '').toLowerCase()

    // 1. Gender Match (0 - 40 pts)
    if (ansGender) {
      if (pGender === ansGender) {
        score += 40
      } else if (pGender === 'unisex' || ansGender === 'unisex') {
        score += 35
      }
    } else {
      score += 20
    }

    // 2. Family Match (0 - 30 pts)
    if (ansFamily) {
      if (pFamily.includes(ansFamily)) {
        score += 30
      } else if (pNotes.includes(ansFamily) || pDesc.includes(ansFamily)) {
        score += 20
      } else if (ansFamily === 'amaderada' && (pNotes.includes('cedro') || pNotes.includes('sándalo') || pNotes.includes('vetiver'))) {
        score += 25
      } else if (ansFamily === 'oriental' && (pNotes.includes('vainilla') || pNotes.includes('ámbar') || pNotes.includes('canela'))) {
        score += 25
      } else if (ansFamily === 'cítrica' && (pNotes.includes('bergamota') || pNotes.includes('limón') || pNotes.includes('mandarina') || pNotes.includes('naranja') || pNotes.includes('toronja'))) {
        score += 25
      } else if (ansFamily === 'floral' && (pNotes.includes('jazmín') || pNotes.includes('rosa') || pNotes.includes('azahar') || pNotes.includes('lavanda'))) {
        score += 25
      }
    } else {
      score += 15
    }

    // 3. Intensity / Sillage (0 - 15 pts)
    if (ansIntensity) {
      if (ansIntensity === 'enorme' && (pSillage.includes('pesada') || pSillage.includes('gran') || pLongevity.includes('muy duradera') || p.concentration === 'Eau de Parfum' || p.concentration === 'Extrait')) {
        score += 15
      } else if (ansIntensity === 'moderada' && (pSillage.includes('moderada') || p.concentration === 'Eau de Parfum' || p.concentration === 'Eau de Toilette')) {
        score += 15
      } else if (ansIntensity === 'discreta') {
        score += 12
      } else {
        score += 8
      }
    }

    // 4. Occasion & Situations (0 - 15 pts)
    const pSituations = (p.characteristics?.situations || []).map(s => s.toLowerCase())
    const pTimeOfDay = (p.characteristics?.timeOfDay || '').toLowerCase()

    if (ansOccasion) {
      if (ansOccasion === 'diario') {
        if (pTimeOfDay.includes('diurno') || pSituations.some(s => s.includes('oficina') || s.includes('trabajo') || s.includes('casual') || s.includes('diario'))) {
          score += 15
        } else if (pOccasion.includes('diario') || pTimeOfDay.includes('versátil')) {
          score += 12
        } else {
          score += 6
        }
      } else if (ansOccasion === 'noche') {
        if (pTimeOfDay.includes('nocturno') || pSituations.some(s => s.includes('citas') || s.includes('romántico') || s.includes('noche'))) {
          score += 15
        } else if (pOccasion.includes('noche') || pTimeOfDay.includes('versátil')) {
          score += 12
        } else {
          score += 6
        }
      } else if (ansOccasion === 'eventos') {
        if (pSituations.some(s => s.includes('fiestas') || s.includes('eventos') || s.includes('salidas') || s.includes('boliche'))) {
          score += 15
        } else if (pTimeOfDay.includes('nocturno') || pTimeOfDay.includes('versátil')) {
          score += 12
        } else {
          score += 6
        }
      } else if (ansOccasion === 'versatil') {
        if (pTimeOfDay.includes('versátil') || pOccasion.includes('diario y ocasiones especiales')) {
          score += 15
        } else {
          score += 10
        }
      }
    }

    // Affinity percentage (75% to 99%)
    const matchPercentage = Math.min(99, Math.max(76, score))

    return {
      product: p,
      score,
      matchPercentage
    }
  })

  return scored.sort((a, b) => b.score - a.score)
})

const matchResult = computed(() => {
  return scoredResults.value[0]?.product || productStore.items?.[0] || null
})

const matchPercentage = computed(() => {
  return scoredResults.value[0]?.matchPercentage || 98
})

const alternativeMatches = computed(() => {
  return scoredResults.value.slice(1, 3).map(r => r.product)
})

const restart = () => {
  currentStep.value = 0
  answers.value = { gender: '', intensity: '', family: '', occasion: '' }
}

const handleAddRecommended = (product = matchResult.value) => {
  if (!product) return
  const defaultSize = product.sizes?.find(s => s.default) || product.sizes?.[0]
  cartStore.addItem(product, defaultSize, 1)
  toastStore.show(`¡${product.name} agregado a tu bolsa!`, 'success')
}

// WhatsApp Sommelier Consultation
const whatsappSommelierUrl = computed(() => {
  const phone = tenantStore.branding?.whatsappNumber || '5493564622055'
  const recName = matchResult.value ? matchResult.value.name : 'una fragancia'
  const text = `Hola, realicé el test olfativo en su boutique web y me recomendó *${recName}* (${matchPercentage.value}% de afinidad).\n\nMis preferencias fueron:\n• Búsqueda: ${answers.value.gender}\n• Familia: ${answers.value.family}\n• Intensidad: ${answers.value.intensity}\n• Ocasión: ${answers.value.occasion}\n\n¿Tienen stock disponible o decants para probarlo? Muchas gracias.`
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
})
</script>

<template>
  <div class="bg-surface-container-low min-h-[85vh] py-12 sm:py-16">
    <div class="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop">
      
      <!-- Quiz Progress Bar -->
      <div v-if="currentStep < questions.length" class="mb-8 sm:mb-12 text-center">
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface border border-outline-variant text-[11px] font-label uppercase tracking-widest text-secondary shadow-2xs mb-3 font-semibold">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
          <span>Paso {{ currentStep + 1 }} de {{ questions.length }} • Sommelier Olfativo</span>
        </div>
        <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden max-w-md mx-auto border border-outline-variant/60 shadow-inner">
          <div 
            class="bg-gradient-to-r from-primary to-primary-container h-full rounded-full transition-all duration-500 ease-out"
            :style="{ width: `${((currentStep + 1) / questions.length) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- QUESTION STEPS WITH FLUID TRANSITION -->
      <Transition name="quiz-step" mode="out-in">
        <div 
          v-if="currentStep < questions.length"
          :key="currentStep"
          class="bg-surface border border-outline-variant rounded-3xl p-6 sm:p-12 shadow-[0_12px_40px_-12px_rgba(46,25,17,0.06)] space-y-8"
        >
          <div class="text-center max-w-xl mx-auto">
            <h1 class="font-serif text-2xl sm:text-4xl text-primary font-normal mb-2 leading-tight">
              {{ questions[currentStep].title }}
            </h1>
            <p class="font-sans text-xs sm:text-sm text-secondary leading-relaxed">
              {{ questions[currentStep].subtitle }}
            </p>
          </div>

          <!-- Options Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <button
              v-for="opt in questions[currentStep].options"
              :key="opt.label"
              @click="selectOption(questions[currentStep].key, opt.value)"
              class="p-5 sm:p-6 bg-surface-container/40 hover:bg-surface-container border border-outline-variant hover:border-primary rounded-2xl flex items-start text-left gap-4 transition-all duration-200 group shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <div class="w-12 h-12 rounded-xl bg-surface border border-outline-variant/80 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-amber-200 group-hover:scale-105 transition-all duration-300 shadow-2xs flex-shrink-0">
                <span class="material-symbols-outlined text-2xl">
                  {{ opt.icon }}
                </span>
              </div>
              <div class="min-w-0 flex-grow">
                <span class="font-sans text-sm sm:text-base text-primary font-bold block mb-1 group-hover:text-primary-container transition-colors">
                  {{ opt.label }}
                </span>
                <span v-if="opt.desc" class="font-sans text-xs text-secondary leading-relaxed block">
                  {{ opt.desc }}
                </span>
              </div>
            </button>
          </div>

          <!-- Back Navigation Link -->
          <div v-if="currentStep > 0" class="text-center pt-2">
            <button 
              @click="currentStep--"
              class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              <span>Volver a la pregunta anterior</span>
            </button>
          </div>
        </div>

        <!-- FINAL RESULT SCREEN -->
        <div 
          v-else-if="matchResult" 
          key="result"
          class="space-y-8"
        >
          <!-- Hero Card: Main Recommendation -->
          <div class="bg-surface border border-outline-variant rounded-3xl p-6 sm:p-10 shadow-[0_16px_50px_-12px_rgba(46,25,17,0.08)] space-y-8 text-center relative overflow-hidden">
            
            <!-- Glow background decor -->
            <div class="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

            <div class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 rounded-full text-emerald-900 font-label text-xs uppercase tracking-wider font-bold shadow-2xs">
              <span class="material-symbols-outlined text-sm text-emerald-700">verified</span>
              <span>{{ matchPercentage }}% de Afinidad con tu perfil</span>
            </div>

            <div>
              <span class="font-label text-[11px] uppercase tracking-[0.25em] text-secondary block mb-1">Tu Fragancia Ideal</span>
              <h2 class="font-serif text-3xl sm:text-5xl text-primary font-normal mb-2 leading-tight">
                {{ matchResult.name }}
              </h2>
              <p class="font-sans text-xs sm:text-sm text-secondary">
                Por <strong class="text-primary font-medium">{{ matchResult.brand }}</strong> • {{ matchResult.concentration }} • Familia {{ matchResult.fragranceFamily || 'Amaderada' }}
              </p>
            </div>

            <!-- Product Presentation Box -->
            <div class="bg-surface-container/50 rounded-2xl p-5 sm:p-7 border border-outline-variant flex flex-col sm:flex-row items-center sm:items-start gap-6 text-left max-w-2xl mx-auto shadow-2xs">
              <img 
                :src="matchResult.images?.[0] || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=400&q=80'" 
                :alt="matchResult.name"
                class="w-36 h-44 object-cover bg-surface rounded-xl border border-outline-variant flex-shrink-0 shadow-2xs"
              />
              <div class="space-y-3 flex-grow min-w-0">
                <p class="font-sans text-xs text-secondary leading-relaxed line-clamp-3">
                  {{ matchResult.shortDescription || matchResult.description || 'Fragancia importada original de alta persistencia y notas envolventes.' }}
                </p>

                <!-- Olfactory Notes Pills -->
                <div v-if="matchResult.olfactoryPyramid?.topNotes?.length" class="space-y-1">
                  <span class="text-[10px] font-label uppercase tracking-widest text-secondary block font-semibold">Notas de Salida:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <span 
                      v-for="note in (matchResult.olfactoryPyramid.topNotes || [])" 
                      :key="note"
                      class="font-label text-[10px] uppercase bg-surface px-2.5 py-0.5 rounded-md border border-outline-variant text-primary shadow-2xs"
                    >
                      {{ note }}
                    </span>
                  </div>
                </div>

                <!-- Price Box -->
                <div class="pt-2 border-t border-outline-variant/60 flex flex-wrap items-baseline gap-2.5">
                  <span class="font-sans font-bold text-2xl text-emerald-850">
                    ${{ (matchResult.transferPrice || Math.round((matchResult.price || 0) * 0.8)).toLocaleString('es-AR') }}
                  </span>
                  <span class="font-label text-[10px] uppercase font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    20% OFF Transferencia
                  </span>
                  <span class="text-xs text-secondary w-full block">
                    o ${{ (matchResult.price || 0).toLocaleString('es-AR') }} en 3 cuotas fijas sin interés
                  </span>
                </div>

                <!-- Decant Availability Badge -->
                <div v-if="matchResult.sizes?.some(s => s.size && s.size.toLowerCase().includes('decant'))" class="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] font-sans text-amber-950 flex items-center gap-2">
                  <span class="material-symbols-outlined text-base text-amber-700">science</span>
                  <span><strong>Disponible en Decant (5ml / 10ml):</strong> Podés probarlo en tamaño de muestra fraccionada antes de comprar el frasco grande.</span>
                </div>
              </div>
            </div>

            <!-- Action CTAs -->
            <div class="flex flex-col sm:flex-row gap-3.5 justify-center max-w-xl mx-auto pt-2">
              <button 
                @click="handleAddRecommended(matchResult)"
                class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-xl active:scale-95 cursor-pointer font-bold"
              >
                <span class="material-symbols-outlined text-base text-amber-300">shopping_bag</span>
                <span>Añadir a mi Bolsa de Compras</span>
              </button>

              <RouterLink 
                :to="`/producto/${matchResult.slug}`"
                class="bg-surface hover:bg-surface-container text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline-variant hover:border-primary transition-all text-center shadow-2xs font-bold active:scale-95"
              >
                Ver Ficha Completa
              </RouterLink>
            </div>

            <!-- WhatsApp Sommelier CTA -->
            <div class="pt-4 border-t border-outline-variant">
              <a 
                :href="whatsappSommelierUrl"
                target="_blank" 
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-xs font-label uppercase tracking-wider text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/90 px-4 py-2 rounded-full border border-emerald-200 transition-colors shadow-2xs"
              >
                <span class="material-symbols-outlined text-sm text-emerald-700">chat</span>
                <span>¿Dudas? Consultar con un Asesor por WhatsApp</span>
              </a>
            </div>
          </div>

          <!-- Alternative Matches Section (if catalog has more products) -->
          <div v-if="alternativeMatches.length > 0" class="bg-surface border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_-10px_rgba(46,25,17,0.06)] space-y-5">
            <div class="text-center sm:text-left border-b border-outline-variant pb-3 flex flex-col sm:flex-row justify-between items-center gap-2">
              <div>
                <h3 class="font-serif text-xl sm:text-2xl text-primary">Otras Alternativas para tu Perfil</h3>
                <p class="text-xs text-secondary mt-0.5">Fragancias que también combinan de manera sobresaliente con tus respuestas.</p>
              </div>
              <span class="text-xs font-label uppercase tracking-widest text-secondary font-bold">
                Top Afinidades
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                v-for="alt in alternativeMatches" 
                :key="alt.id"
                class="p-4 rounded-2xl bg-surface-container/40 border border-outline-variant hover:border-primary/50 flex items-center justify-between gap-4 transition-all hover:shadow-md group"
              >
                <div class="flex items-center gap-3.5 min-w-0">
                  <img 
                    :src="alt.images?.[0] || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=200&q=80'" 
                    :alt="alt.name"
                    class="w-14 h-18 object-cover rounded-xl border border-outline-variant bg-surface flex-shrink-0 shadow-2xs"
                  />
                  <div class="min-w-0">
                    <span class="text-[10px] font-label uppercase tracking-wider text-secondary block truncate">{{ alt.brand }}</span>
                    <h4 class="font-serif font-bold text-primary text-sm line-clamp-1 group-hover:text-primary-container transition-colors">{{ alt.name }}</h4>
                    <p class="text-[11px] text-secondary mt-0.5 capitalize">{{ alt.fragranceFamily || 'Amaderada' }} • {{ alt.concentration }}</p>
                    <span class="font-bold text-xs text-emerald-850 block mt-1">
                      ${{ (alt.transferPrice || Math.round((alt.price || 0) * 0.8)).toLocaleString('es-AR') }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-col gap-1.5 flex-shrink-0">
                  <button 
                    @click="handleAddRecommended(alt)"
                    class="p-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-2xs cursor-pointer"
                    title="Añadir a la bolsa"
                  >
                    <span class="material-symbols-outlined text-base">add_shopping_cart</span>
                  </button>
                  <RouterLink 
                    :to="`/producto/${alt.slug}`"
                    class="p-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant text-primary transition-colors shadow-2xs text-center"
                    title="Ver perfume"
                  >
                    <span class="material-symbols-outlined text-base">visibility</span>
                  </RouterLink>
                </div>
              </div>
            </div>
          </div>

          <!-- Restart Quiz Button -->
          <div class="text-center pt-2">
            <button 
              @click="restart"
              class="font-label text-xs uppercase tracking-widest text-secondary hover:text-primary underline transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span class="material-symbols-outlined text-sm">restart_alt</span>
              <span>Reiniciar Quiz Olfativo</span>
            </button>
          </div>
        </div>

        <!-- EMPTY PRODUCTS FALLBACK -->
        <div 
          v-else 
          key="fallback"
          class="bg-surface border border-outline-variant rounded-3xl p-8 sm:p-12 shadow-lg space-y-6 text-center"
        >
          <span class="material-symbols-outlined text-6xl text-neutral-300 animate-float-gentle">auto_awesome</span>
          <h2 class="font-serif text-3xl text-primary font-normal">¡Test completado con éxito!</h2>
          <p class="font-sans text-sm text-secondary max-w-md mx-auto leading-relaxed">
            Hemos registrado tus preferencias olfativas. Estamos sincronizando las fragancias con nuestro catálogo en vivo.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <RouterLink 
              to="/catalogo"
              class="bg-primary text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-primary-container transition-all shadow-xs"
            >
              Ir al Catálogo
            </RouterLink>
            <button 
              @click="restart"
              class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline-variant hover:bg-surface-container transition-all shadow-2xs"
            >
              Reiniciar Test
            </button>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>
