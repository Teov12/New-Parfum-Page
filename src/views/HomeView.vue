<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { olfactiveFamilies } from '@/data/products'
import ProductCard from '@/components/product/ProductCard.vue'

const productStore = useProductStore()

// Hero Image Carousel Slides
const heroSlides = [
  {
    id: 1,
    tag: 'Alta Perfumería de Autor',
    title: 'Encontrá tu nueva',
    highlight: 'fragancia favorita.',
    description: 'Una curaduría exclusiva de elixires, esencias de autor y clásicos atemporales seleccionados para acompañar tus momentos más memorables.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2000&q=85',
    primaryCtaText: 'Explorar Catálogo',
    primaryCtaLink: '/catalogo',
    secondaryCtaText: 'Test de Fragancia',
    secondaryCtaLink: '/quiz',
    secondaryCtaIcon: 'auto_awesome'
  },
  {
    id: 2,
    tag: 'Colección de Oriente Medio',
    title: 'Lujo Árabe &',
    highlight: 'estelas infinitas.',
    description: 'Composiciones opulentas de Dubai: acordes de oud real, canela tostada, praliné y azafrán con duración excepcional en piel.',
    image: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=2000&q=85',
    primaryCtaText: 'Ver Perfumería Árabe',
    primaryCtaLink: '/catalogo?category=arabes',
    secondaryCtaText: 'Explorar Todo',
    secondaryCtaLink: '/catalogo'
  },
  {
    id: 3,
    tag: 'Sommelier Olfativo Virtual',
    title: 'Descubrí tu firma',
    highlight: 'sensorial única.',
    description: 'Respondé 4 preguntas clave sobre tus gustos y estilo para que nuestro algoritmo sommelier te recomiende la esencia perfecta.',
    image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=2000&q=85',
    primaryCtaText: 'Hacer el Quiz Olfativo',
    primaryCtaLink: '/quiz',
    secondaryCtaText: 'Colección Mujer',
    secondaryCtaLink: '/catalogo?gender=woman'
  }
]

const currentSlide = ref(0)
let autoplayInterval = null

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % heroSlides.length
}

const prevSlide = () => {
  currentSlide.value = (currentSlide.value - 1 + heroSlides.length) % heroSlides.length
}

const goToSlide = (index) => {
  currentSlide.value = index
  resetAutoplay()
}

const startAutoplay = () => {
  autoplayInterval = setInterval(() => {
    nextSlide()
  }, 6000)
}

const stopAutoplay = () => {
  if (autoplayInterval) clearInterval(autoplayInterval)
}

const resetAutoplay = () => {
  stopAutoplay()
  startAutoplay()
}

onMounted(() => {
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})

// Carousel / Scroll for Featured Best Sellers
const carouselRef = ref(null)

const featuredProducts = computed(() => {
  const featured = productStore.items.filter(p => p.isFeatured || p.isBestSeller)
  return featured.length > 0 ? featured : productStore.items.slice(0, 6)
})

const scrollCarousel = (direction) => {
  if (!carouselRef.value) return
  const scrollAmount = carouselRef.value.clientWidth * 0.75
  carouselRef.value.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
}

const trustBadges = [
  { icon: 'verified_user', title: '100% Originales', desc: 'Garantía de procedencia directa de casas oficiales.' },
  { icon: 'local_shipping', title: 'Envíos Asegurados', desc: 'Entregas a todo el país con seguimiento en tiempo real.' },
  { icon: 'credit_card', title: 'Cuotas Sin Interés', desc: '3 y 6 cuotas con todas las tarjetas bancarias.' },
  { icon: 'support_agent', title: 'Asesoría Sommelier', desc: 'Orientación personalizada para elegir tu fragancia.' }
]
</script>

<template>
  <div>
    <!-- HERO SECTION: INTERACTIVE IMAGE CAROUSEL -->
    <header 
      class="relative w-full min-h-[85vh] flex items-center bg-surface-container-low border-b border-outline-variant overflow-hidden group/hero select-none"
      @mouseenter="stopAutoplay"
      @mouseleave="startAutoplay"
    >
      <!-- Slides Container -->
      <div 
        v-for="(slide, idx) in heroSlides" 
        :key="slide.id"
        class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        :class="currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'"
      >
        <!-- Slide Background Image with Smooth Scaling Effect -->
        <div class="absolute inset-0 z-0 overflow-hidden">
          <img 
            :src="slide.image" 
            :alt="slide.tag"
            class="w-full h-full object-cover object-center filter saturate-75 transition-transform duration-[7000ms] ease-out scale-105"
            :class="currentSlide === idx ? 'scale-100 opacity-40' : 'scale-110 opacity-0'"
          />
          <div class="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/20"></div>
        </div>

        <!-- Slide Content -->
        <div class="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full items-center">
          <div class="lg:col-span-8 flex flex-col justify-center">
            
            <div class="inline-flex items-center gap-2 mb-4">
              <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary font-bold bg-surface-container px-3 py-1 rounded-full border border-outline-variant/60">
                {{ slide.tag }}
              </span>
            </div>

            <h1 class="font-sans text-4xl sm:text-5xl lg:text-display-lg text-primary mb-6 leading-[1.08] tracking-tight font-normal">
              {{ slide.title }} <br />
              <span class="italic font-serif">{{ slide.highlight }}</span>
            </h1>

            <p class="font-sans text-base sm:text-body-lg text-secondary mb-10 max-w-xl leading-relaxed">
              {{ slide.description }}
            </p>

            <!-- CTAs: Píldoras Ergonómicas Elegantes -->
            <div class="flex flex-col sm:flex-row gap-4">
              <RouterLink 
                :to="slide.primaryCtaLink"
                class="inline-flex items-center justify-center bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 px-9 rounded-full border border-primary-container hover:bg-inverse-surface transition-all duration-300 shadow-md text-center"
              >
                {{ slide.primaryCtaText }}
              </RouterLink>

              <RouterLink 
                :to="slide.secondaryCtaLink"
                class="inline-flex items-center justify-center bg-surface/80 backdrop-blur-md text-primary font-label text-xs uppercase tracking-widest py-4 px-9 rounded-full border border-outline hover:bg-surface-container transition-all duration-300 gap-2 shadow-xs text-center"
              >
                <span v-if="slide.secondaryCtaIcon" class="material-symbols-outlined text-sm">{{ slide.secondaryCtaIcon }}</span>
                <span>{{ slide.secondaryCtaText }}</span>
              </RouterLink>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-outline-variant max-w-md">
              <div>
                <p class="font-sans text-2xl text-primary font-normal">100%</p>
                <p class="font-label text-[10px] text-secondary uppercase tracking-wider">Originales</p>
              </div>
              <div>
                <p class="font-sans text-2xl text-primary font-normal">Envíos</p>
                <p class="font-label text-[10px] text-secondary uppercase tracking-wider">País Entero</p>
              </div>
              <div>
                <p class="font-sans text-2xl text-primary font-normal">3 y 6</p>
                <p class="font-label text-[10px] text-secondary uppercase tracking-wider">Cuotas Fijas</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Carousel Navigation Arrows -->
      <button 
        @click="prevSlide(); resetAutoplay()"
        class="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-surface/80 backdrop-blur-md border border-outline-variant hover:border-primary text-primary flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="Diapositiva anterior"
      >
        <span class="material-symbols-outlined text-xl">chevron_left</span>
      </button>

      <button 
        @click="nextSlide(); resetAutoplay()"
        class="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-surface/80 backdrop-blur-md border border-outline-variant hover:border-primary text-primary flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="Siguiente diapositiva"
      >
        <span class="material-symbols-outlined text-xl">chevron_right</span>
      </button>

      <!-- Carousel Bottom Dot Indicators -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant shadow-xs">
        <button 
          v-for="(slide, idx) in heroSlides" 
          :key="slide.id"
          @click="goToSlide(idx)"
          class="h-2 rounded-full transition-all duration-300"
          :class="currentSlide === idx ? 'w-6 bg-primary-container' : 'w-2 bg-outline hover:bg-primary'"
          :aria-label="`Ir a diapositiva ${idx + 1}`"
        ></button>
      </div>
    </header>

    <!-- TRUST PERKS BAR -->
    <section class="border-b border-outline-variant bg-surface">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          v-for="badge in trustBadges" 
          :key="badge.title"
          class="flex items-start gap-4 p-4 rounded-md bg-surface-container/60 hover:bg-surface-container border border-outline-variant/60 hover:border-outline-variant hover:shadow-[0_4px_16px_rgba(38,17,11,0.04)] transition-all duration-300"
        >
          <div class="w-11 h-11 bg-surface rounded-md flex items-center justify-center flex-shrink-0 text-primary shadow-xs border border-outline-variant/60">
            <span class="material-symbols-outlined text-xl">{{ badge.icon }}</span>
          </div>
          <div>
            <h4 class="font-sans text-sm font-bold text-primary mb-0.5">{{ badge.title }}</h4>
            <p class="font-sans text-xs text-secondary leading-relaxed">{{ badge.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURED & BEST SELLERS CAROUSEL SECTION -->
    <section v-if="featuredProducts.length > 0" class="py-16 md:py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <p class="font-label text-xs font-semibold text-secondary uppercase tracking-widest mb-1.5">Curaduría Exclusiva</p>
          <h2 class="font-serif text-3xl md:text-4xl font-normal text-primary">Fragancias Destacadas</h2>
        </div>

        <!-- Carousel Left/Right Buttons -->
        <div class="flex items-center gap-2">
          <button 
            @click="scrollCarousel('left')"
            class="w-10 h-10 rounded-md bg-surface border border-outline-variant hover:border-primary text-primary flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
            aria-label="Desplazar a la izquierda"
          >
            <span class="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button 
            @click="scrollCarousel('right')"
            class="w-10 h-10 rounded-md bg-surface border border-outline-variant hover:border-primary text-primary flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
            aria-label="Desplazar a la derecha"
          >
            <span class="material-symbols-outlined text-lg">chevron_right</span>
          </button>
          <RouterLink 
            to="/catalogo" 
            class="font-label text-xs uppercase tracking-widest text-primary hover:underline ml-3 hidden sm:inline"
          >
            Ver Todo →
          </RouterLink>
        </div>
      </div>

      <!-- Horizontal Scrollable Cards List -->
      <div 
        ref="carouselRef"
        class="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth"
      >
        <div 
          v-for="prod in featuredProducts" 
          :key="prod.id"
          class="w-72 sm:w-80 flex-shrink-0 snap-start"
        >
          <ProductCard :product="prod" />
        </div>
      </div>
    </section>

    <!-- BENTO GRID CATEGORIES -->
    <section class="py-16 md:py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop border-t border-outline-variant">
      <div class="text-center max-w-xl mx-auto mb-14">
        <p class="font-label text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Explorá por Universo</p>
        <h2 class="font-serif text-3xl md:text-4xl font-normal text-primary">Colecciones Curadas</h2>
        <div class="w-12 h-0.5 bg-primary rounded-full mx-auto mt-3"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        <!-- Category 1: Mujer (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=woman"
          class="group relative md:col-span-6 aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-primary rounded-md border border-outline-variant hover:border-primary transition-all duration-500 flex flex-col justify-end p-8 shadow-[0_4px_16px_rgba(38,17,11,0.06)] hover:shadow-[0_16px_35px_rgba(38,17,11,0.14)] hover:-translate-y-1"
        >
          <img 
            src="https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85" 
            alt="Colección Mujer"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-85"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent"></div>
          
          <div class="relative z-10 text-white">
            <span class="font-label text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-1.5 block">Alta Costura Femenina</span>
            <h3 class="font-serif text-2xl sm:text-3xl font-normal mb-2 text-white">Colección Mujer</h3>
            <p class="font-sans text-xs sm:text-sm text-white/80 max-w-sm mb-4 leading-relaxed">
              Bouquets florales radiantes, notas envolventes de vainilla y composiciones de elegancia absoluta.
            </p>
            <span class="font-label text-xs font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 group-hover:bg-white group-hover:text-primary transition-all">
              <span>Explorar Fragancias</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </RouterLink>

        <!-- Category 2: Hombre (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=man"
          class="group relative md:col-span-6 aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-primary rounded-md border border-outline-variant hover:border-primary transition-all duration-500 flex flex-col justify-end p-8 shadow-[0_4px_16px_rgba(38,17,11,0.06)] hover:shadow-[0_16px_35px_rgba(38,17,11,0.14)] hover:-translate-y-1"
        >
          <img 
            src="https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85" 
            alt="Colección Hombre"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-85"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent"></div>
          
          <div class="relative z-10 text-white">
            <span class="font-label text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-1.5 block">Carácter & Distinción</span>
            <h3 class="font-serif text-2xl sm:text-3xl font-normal mb-2 text-white">Colección Hombre</h3>
            <p class="font-sans text-xs sm:text-sm text-white/80 max-w-sm mb-4 leading-relaxed">
              Maderas profundas de cedro y sándalo, cítricos italianos y resinas ambarinas de presencia imponente.
            </p>
            <span class="font-label text-xs font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 group-hover:bg-white group-hover:text-primary transition-all">
              <span>Explorar Fragancias</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </RouterLink>

        <!-- Category 3: Unisex (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=unisex"
          class="group relative md:col-span-6 bg-surface rounded-md border border-outline-variant hover:border-primary p-8 md:p-10 flex flex-col justify-between hover:shadow-[0_16px_35px_rgba(38,17,11,0.12)] hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_16px_rgba(38,17,11,0.05)]"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="w-12 h-12 rounded-md bg-surface-container flex items-center justify-center text-primary mb-4 shadow-xs border border-outline-variant/60">
                <span class="material-symbols-outlined text-2xl">all_inclusive</span>
              </div>
              <span class="font-label text-[11px] font-semibold uppercase tracking-widest text-secondary block">Sin Género • Pura Expresión</span>
              <h3 class="font-serif text-2xl md:text-3xl font-normal text-primary mb-2">Colección Unisex</h3>
            </div>
            <span class="font-label text-xs font-bold bg-surface-container px-3.5 py-1.5 rounded-full text-primary uppercase border border-outline-variant/60">
              Variedad
            </span>
          </div>
          <p class="font-sans text-sm text-secondary max-w-md my-4 leading-relaxed">
            Aromas versátiles y vanguardistas donde las maderas, cítricos y resinas componen esencias envolventes para todos.
          </p>
          <span class="font-label text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
            <span>Ver Selección Unisex</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </RouterLink>

        <!-- Category 4: Perfumería Árabe (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?category=arabes"
          class="group relative md:col-span-6 bg-surface rounded-md border border-outline-variant hover:border-primary p-8 md:p-10 flex flex-col justify-between hover:shadow-[0_16px_35px_rgba(38,17,11,0.12)] hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_16px_rgba(38,17,11,0.05)]"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="w-12 h-12 rounded-md bg-surface-container text-primary flex items-center justify-center mb-4 shadow-xs border border-outline-variant/60">
                <span class="material-symbols-outlined text-2xl">diamond</span>
              </div>
              <span class="font-label text-[11px] font-semibold uppercase tracking-widest text-secondary block">Lujo de Oriente Medio</span>
              <h3 class="font-serif text-2xl md:text-3xl font-normal text-primary mb-2">Perfumería Árabe</h3>
            </div>
            <span class="font-label text-xs font-bold bg-primary-container text-on-primary px-3.5 py-1.5 rounded-full uppercase shadow-xs">
              Exclusivos
            </span>
          </div>
          <p class="font-sans text-sm text-secondary max-w-md my-4 leading-relaxed">
            Creaciones opulentas de Dubai, maderas de agar, azafrán, praliné y estelas magnéticas de altísima duración.
          </p>
          <span class="font-label text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
            <span>Explorar Colección Árabe</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </RouterLink>

      </div>
    </section>

    <!-- OLFACTIVE FAMILIES EXPLORER -->
    <section class="py-16 md:py-24 bg-surface-container-low border-t border-outline-variant">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div class="text-center max-w-xl mx-auto mb-14">
          <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Guía Olfativa</p>
          <h2 class="font-serif text-3xl md:text-headline-lg text-primary font-normal">Familias Aromáticas</h2>
          <p class="font-sans text-sm text-secondary mt-2">
            Comprender las notas es el primer paso para descubrir la firma olfativa que resuena con tu esencia.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <RouterLink 
            v-for="family in olfactiveFamilies" 
            :key="family.name"
            :to="`/catalogo?family=${family.name}`"
            class="group bg-surface border border-outline-variant hover:border-primary rounded-md p-6 transition-all duration-300 flex flex-col justify-between shadow-[0_4px_16px_rgba(38,17,11,0.04)] hover:shadow-[0_12px_28px_rgba(38,17,11,0.10)] hover:-translate-y-1"
          >
            <div>
              <div class="aspect-square bg-surface-container rounded-md mb-4 overflow-hidden border border-outline-variant">
                <img 
                  :src="family.image" 
                  :alt="family.name"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div class="mb-2">
                <h3 class="font-serif text-2xl text-primary font-normal group-hover:text-primary-container transition-colors">
                  {{ family.name }}
                </h3>
              </div>
              <p class="font-sans text-xs text-secondary leading-relaxed mb-4">
                {{ family.description }}
              </p>
            </div>

            <span class="font-label text-xs uppercase tracking-widest text-primary underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Ver Familia</span>
              <span class="material-symbols-outlined text-xs">arrow_forward</span>
            </span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- FRAGRANCE FINDER QUIZ BANNER -->
    <section class="py-16 md:py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="bg-primary-container text-on-primary rounded-md p-10 md:p-16 text-center shadow-xl border border-primary">
        <span class="material-symbols-outlined text-4xl text-on-primary-container mb-3">auto_awesome</span>
        <p class="font-label text-xs uppercase tracking-[0.25em] text-on-primary-container mb-2">¿Indeciso sobre qué fragancia elegir?</p>
        <h2 class="font-serif text-3xl sm:text-4xl md:text-5xl font-normal max-w-2xl mx-auto mb-6 leading-tight">
          Hacé nuestro Quiz Olfativo en 60 segundos
        </h2>
        <p class="font-sans text-sm sm:text-base text-surface/85 max-w-xl mx-auto mb-8 leading-relaxed">
          Respondé 4 breves preguntas sobre tus notas predilectas, ocasiones de uso y personalidad para recibir una recomendación personalizada con 100% de afinidad.
        </p>
        <RouterLink 
          to="/quiz"
          class="inline-flex items-center gap-2 bg-surface text-primary font-label text-xs uppercase tracking-widest px-9 py-4 rounded-full hover:bg-surface-container transition-all shadow-md"
        >
          <span>Comenzar el Test Ahora</span>
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </RouterLink>
      </div>
    </section>

  </div>
</template>
