<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useSiteContentStore } from '@/stores/siteContent'
import ProductCard from '@/components/product/ProductCard.vue'

const productStore = useProductStore()
const siteContentStore = useSiteContentStore()

// Hero Image Carousel Slides (from dynamic siteContentStore)
const heroSlides = computed(() => siteContentStore.heroSlides)
const slidesCount = computed(() => (heroSlides.value && Array.isArray(heroSlides.value)) ? heroSlides.value.length : 0)

const currentSlide = ref(0)
const slideDirection = ref('next') // 'next' (right-to-left) | 'prev' (left-to-right)
const isAnimating = ref(false)
const isAutoplayPaused = ref(false)
let autoplayInterval = null

const currentSlideData = computed(() => {
  if (!heroSlides.value || !heroSlides.value.length) return null
  const idx = (typeof currentSlide.value === 'number' && !isNaN(currentSlide.value)) ? currentSlide.value : 0
  return heroSlides.value[idx] || heroSlides.value[0] || null
})

// Keep currentSlide within valid bounds if slides change or load dynamically
watch(heroSlides, (newSlides) => {
  if (!newSlides || !newSlides.length) {
    currentSlide.value = 0
    return
  }
  if (typeof currentSlide.value !== 'number' || isNaN(currentSlide.value) || currentSlide.value >= newSlides.length || currentSlide.value < 0) {
    currentSlide.value = 0
  }
}, { immediate: true })

const nextSlide = () => {
  if (isAnimating.value) return
  const total = slidesCount.value
  if (total <= 1) return
  slideDirection.value = 'next'
  isAnimating.value = true
  const current = (typeof currentSlide.value === 'number' && !isNaN(currentSlide.value)) ? currentSlide.value : 0
  currentSlide.value = (current + 1) % total
  setTimeout(() => {
    isAnimating.value = false
  }, 540)
}

const prevSlide = () => {
  if (isAnimating.value) return
  const total = slidesCount.value
  if (total <= 1) return
  slideDirection.value = 'prev'
  isAnimating.value = true
  const current = (typeof currentSlide.value === 'number' && !isNaN(currentSlide.value)) ? currentSlide.value : 0
  currentSlide.value = (current - 1 + total) % total
  setTimeout(() => {
    isAnimating.value = false
  }, 540)
}

const goToSlide = (index) => {
  if (isAnimating.value || index === currentSlide.value) return
  const total = slidesCount.value
  if (total <= 0) return
  slideDirection.value = index > currentSlide.value ? 'next' : 'prev'
  isAnimating.value = true
  currentSlide.value = Math.max(0, Math.min(index, total - 1))
  resetAutoplay()
  setTimeout(() => {
    isAnimating.value = false
  }, 540)
}

// Touch swipe support for mobile
let touchStartX = 0
let touchEndX = 0

const onTouchStart = (e) => {
  if (e.touches && e.touches.length > 0) {
    touchStartX = e.touches[0].clientX
  }
  stopAutoplay()
}

const onTouchEnd = (e) => {
  if (e.changedTouches && e.changedTouches.length > 0) {
    touchEndX = e.changedTouches[0].clientX
    const diff = touchEndX - touchStartX
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        nextSlide()
        resetAutoplay()
      } else {
        prevSlide()
        resetAutoplay()
      }
    }
  }
  startAutoplay()
}

const startAutoplay = () => {
  isAutoplayPaused.value = false
  if (autoplayInterval) clearInterval(autoplayInterval)
  if (slidesCount.value <= 1) return
  autoplayInterval = setInterval(() => {
    nextSlide()
  }, 6000)
}

const stopAutoplay = () => {
  isAutoplayPaused.value = true
  if (autoplayInterval) {
    clearInterval(autoplayInterval)
    autoplayInterval = null
  }
}

const resetAutoplay = () => {
  stopAutoplay()
  startAutoplay()
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopAutoplay()
  } else {
    startAutoplay()
  }
}

// Preload all carousel slide images in advance for stutter-free 60fps transitions
const preloadSlideAssets = () => {
  if (heroSlides.value && heroSlides.value.length) {
    heroSlides.value.forEach(slide => {
      if (slide.image) {
        const img = new Image()
        img.src = slide.image
      }
      if (slide.bottleImage) {
        const bImg = new Image()
        bImg.src = slide.bottleImage
      }
    })
  }
}

onMounted(() => {
  startAutoplay()
  preloadSlideAssets()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopAutoplay()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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
  { icon: 'verified_user', title: '100% Originales', desc: 'Garantía de autenticidad en caja cerrada y sellada.' },
  { icon: 'local_shipping', title: 'Envíos Asegurados', desc: 'Entregas a todo el país con seguimiento en tiempo real.' },
  { icon: 'credit_card', title: 'Cuotas Sin Interés', desc: '3 y 6 cuotas con todas las tarjetas bancarias.' },
  { icon: 'support_agent', title: 'Atención por WhatsApp', desc: 'Te asesoramos para que elijas tu perfume ideal.' }
]
</script>

<template>
  <div>
    <!-- HERO SECTION: INTERACTIVE IMAGE CAROUSEL -->
    <header 
      class="relative w-full min-h-[85vh] flex items-center bg-surface-container-low border-b border-outline-variant overflow-hidden group/hero select-none"
      @mouseenter="stopAutoplay"
      @mouseleave="startAutoplay"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <!-- Directional Animated Slide Transition Container -->
      <Transition 
        :name="slideDirection === 'next' ? 'hero-slide-next' : 'hero-slide-prev'"
        @after-enter="isAnimating = false"
      >
        <div 
          v-if="currentSlideData"
          :key="currentSlideData.id || `slide-${currentSlide}`"
          class="absolute inset-0 w-full h-full flex items-center overflow-hidden"
        >
          <!-- Slide Background Image with GPU accelerated composition -->
          <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img 
              :src="currentSlideData.image" 
              :alt="currentSlideData.tag"
              class="w-full h-full object-cover object-center opacity-70 will-change-transform"
              :class="currentSlide % 2 === 0 ? 'animate-ken-burns' : 'animate-ken-burns-alt'"
              decoding="async"
              @error="(e) => e.target.src = 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2000&q=85'"
            />
            <!-- Luxury Warm Gradient Overlays -->
            <div class="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/40"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
          </div>

          <!-- Slide Content -->
          <div class="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-gutter h-full items-center">
            
            <!-- Text Column (8 cols) -->
            <div class="lg:col-span-8 flex flex-col justify-center">
              
              <div class="inline-flex items-center gap-2 mb-4">
                <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary font-bold bg-surface-container/95 px-3.5 py-1.5 rounded-full border border-outline-variant/80 shadow-xs flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                  <span>{{ currentSlideData.tag }}</span>
                </span>
              </div>

              <h1 class="font-sans text-4xl sm:text-5xl lg:text-display-lg text-primary mb-6 leading-[1.08] tracking-tight font-normal">
                {{ currentSlideData.title }} <br />
                <span class="italic font-serif">{{ currentSlideData.highlight }}</span>
              </h1>

              <p class="font-sans text-base sm:text-body-lg text-secondary mb-10 max-w-xl leading-relaxed">
                {{ currentSlideData.description }}
              </p>

              <!-- CTAs: Píldoras Ergonómicas Elegantes -->
              <div class="flex flex-col sm:flex-row gap-4">
                <RouterLink 
                  :to="currentSlideData.primaryCtaLink"
                  class="group relative inline-flex items-center justify-center bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-4 px-9 rounded-full border border-primary-container hover:bg-inverse-surface transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 text-center overflow-hidden"
                >
                  <span class="relative z-10">{{ currentSlideData.primaryCtaText }}</span>
                  <div class="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 transition-transform bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </RouterLink>

                <RouterLink 
                  :to="currentSlideData.secondaryCtaLink"
                  class="inline-flex items-center justify-center bg-surface text-primary font-label text-xs uppercase tracking-widest py-4 px-9 rounded-full border border-outline hover:border-primary hover:bg-surface-container transition-all duration-300 gap-2 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center"
                >
                  <span v-if="currentSlideData.secondaryCtaIcon" class="material-symbols-outlined text-sm">{{ currentSlideData.secondaryCtaIcon }}</span>
                  <span>{{ currentSlideData.secondaryCtaText }}</span>
                </RouterLink>
              </div>

              <!-- Quick Stats -->
              <div class="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-outline-variant max-w-md">
                <div class="group/stat cursor-default">
                  <p class="font-sans text-2xl text-primary font-normal group-hover/stat:text-primary-container transition-colors">100%</p>
                  <p class="font-label text-[10px] text-secondary uppercase tracking-wider">Originales</p>
                </div>
                <div class="group/stat cursor-default">
                  <p class="font-sans text-2xl text-primary font-normal group-hover/stat:text-primary-container transition-colors">Envíos</p>
                  <p class="font-label text-[10px] text-secondary uppercase tracking-wider">País Entero</p>
                </div>
                <div class="group/stat cursor-default">
                  <p class="font-sans text-2xl text-primary font-normal group-hover/stat:text-primary-container transition-colors">3 y 6</p>
                  <p class="font-label text-[10px] text-secondary uppercase tracking-wider">Cuotas Fijas</p>
                </div>
              </div>

            </div>

            <!-- Featured Showcase Bottle Column (4 cols) - Floating Editorial Card -->
            <div class="hidden lg:flex lg:col-span-4 justify-center items-center relative">
              <!-- Subtle ambient glow circle behind -->
              <div class="absolute w-72 h-72 bg-primary-container/15 rounded-full blur-3xl pointer-events-none"></div>

              <div class="relative w-72 rounded-2xl bg-surface/95 p-4 border border-outline-variant shadow-[0_20px_45px_-12px_rgba(46,25,17,0.12)] hover:shadow-[0_25px_50px_-10px_rgba(46,25,17,0.18)] transition-all duration-500 hover:scale-102 animate-float-slow">
                <div class="relative aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-surface-container group">
                  <img 
                    :src="currentSlideData.bottleImage" 
                    :alt="currentSlideData.featuredTitle" 
                    class="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    decoding="async"
                    @error="(e) => e.target.src = 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=85'"
                  />
                  <div class="absolute top-3 left-3 bg-surface font-label text-[10px] font-bold px-2.5 py-1 rounded-full text-primary border border-outline-variant shadow-xs">
                    {{ currentSlideData.featuredRating }}
                  </div>
                </div>
                <div class="space-y-1">
                  <span class="font-label text-[10px] font-semibold uppercase tracking-wider text-secondary">
                    Selección de la Boutique
                  </span>
                  <h4 class="font-serif text-lg text-primary font-normal line-clamp-1">
                    {{ currentSlideData.featuredTitle }}
                  </h4>
                  <p class="font-sans text-xs text-secondary line-clamp-1">
                    {{ currentSlideData.featuredSub }}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </Transition>

      <!-- Carousel Navigation Arrows with Directional Tactile Response -->
      <button 
        @click="prevSlide(); resetAutoplay()"
        class="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-surface/90 backdrop-blur-md border border-outline-variant hover:border-primary text-primary flex items-center justify-center shadow-md hover:shadow-xl hover:scale-110 active:-translate-x-1 active:scale-95 transition-all duration-300 group"
        aria-label="Diapositiva anterior"
      >
        <span class="material-symbols-outlined text-xl transition-transform duration-300 group-hover:-translate-x-0.5">chevron_left</span>
      </button>

      <button 
        @click="nextSlide(); resetAutoplay()"
        class="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-surface/90 backdrop-blur-md border border-outline-variant hover:border-primary text-primary flex items-center justify-center shadow-md hover:shadow-xl hover:scale-110 active:translate-x-1 active:scale-95 transition-all duration-300 group"
        aria-label="Siguiente diapositiva"
      >
        <span class="material-symbols-outlined text-xl transition-transform duration-300 group-hover:translate-x-0.5">chevron_right</span>
      </button>

      <!-- Carousel Bottom Dot Indicators with Animated Autoplay Progress Bar -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-surface/85 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant shadow-md">
        <button 
          v-for="(slide, idx) in heroSlides" 
          :key="slide.id"
          @click="goToSlide(idx)"
          class="relative h-2 rounded-full transition-all duration-500 overflow-hidden"
          :class="currentSlide === idx ? 'w-10 bg-primary/20' : 'w-2.5 bg-outline-variant hover:bg-primary/50'"
          :aria-label="`Ir a diapositiva ${idx + 1}`"
        >
          <!-- Active Progress fill bar -->
          <div 
            v-if="currentSlide === idx"
            :key="`prog-${currentSlide}`"
            class="h-full bg-primary-container rounded-full"
            :style="{ 
              animation: isAutoplayPaused ? 'none' : 'autoplayProgress 6s linear forwards' 
            }"
          ></div>
        </button>
      </div>
    </header>

    <!-- TRUST PERKS BAR -->
    <section class="border-b border-outline-variant bg-surface overflow-hidden">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          v-for="(badge, idx) in trustBadges" 
          :key="badge.title"
          v-reveal="{ delay: idx * 100, direction: 'up' }"
          class="group flex items-start gap-4 p-4 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-outline-variant/60 hover:border-outline-variant hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default"
        >
          <div class="w-11 h-11 bg-surface rounded-xl flex items-center justify-center flex-shrink-0 text-primary shadow-xs border border-outline-variant/60 group-hover:scale-110 group-hover:rotate-3 group-hover:border-primary transition-all duration-300">
            <span class="material-symbols-outlined text-xl">{{ badge.icon }}</span>
          </div>
          <div>
            <h4 class="font-sans text-sm font-bold text-primary mb-0.5 group-hover:text-primary-container transition-colors">{{ badge.title }}</h4>
            <p class="font-sans text-xs text-secondary leading-relaxed">{{ badge.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURED & BEST SELLERS CAROUSEL SECTION -->
    <section v-if="featuredProducts.length > 0" class="py-16 md:py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div v-reveal="{ direction: 'up' }" class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <p class="font-label text-xs font-semibold text-secondary uppercase tracking-widest mb-1.5">Los Más Vendidos</p>
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
        v-reveal="{ delay: 150, direction: 'up' }"
        class="flex gap-6 overflow-x-auto pt-4 pb-8 px-4 -mx-4 no-scrollbar scrollbar-none snap-x snap-mandatory scroll-smooth"
      >
        <div 
          v-for="prod in featuredProducts" 
          :key="prod.id"
          class="w-72 sm:w-80 flex-shrink-0 snap-start h-auto flex flex-col relative group/wrap isolate"
        >
          <ProductCard :product="prod" />
          <!-- Sombra difusa redonda/ovalada centrada debajo de la card -->
          <div class="absolute -bottom-2 inset-x-8 h-10 bg-primary/20 rounded-full blur-xl opacity-25 group-hover/wrap:opacity-80 group-hover/wrap:scale-105 group-hover/wrap:h-12 group-hover/wrap:-bottom-3 transition-all duration-300 pointer-events-none -z-10"></div>
        </div>
      </div>
    </section>

    <!-- BENTO GRID CATEGORIES -->
    <section class="py-16 md:py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop border-t border-outline-variant">
      <div v-reveal="{ direction: 'up' }" class="text-center max-w-xl mx-auto mb-14">
        <p class="font-label text-xs font-semibold text-secondary uppercase tracking-widest mb-2">Explorá por Categoría</p>
        <h2 class="font-serif text-3xl md:text-4xl font-normal text-primary">Categorías Principales</h2>
        <div class="w-12 h-0.5 bg-primary rounded-full mx-auto mt-3"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        <RouterLink 
          v-for="(cat, idx) in siteContentStore.mainCategories"
          :key="cat.id"
          :to="cat.link || '/catalogo'"
          v-reveal="{ delay: (idx % 4 + 1) * 100, direction: 'up' }"
          :class="[
            'group relative overflow-hidden bg-primary rounded-xl border border-outline-variant hover:border-primary transition-all duration-500 flex flex-col justify-end p-8 shadow-md hover:shadow-2xl hover:-translate-y-1.5',
            cat.span === 12 ? 'col-span-12 aspect-[21/9] min-h-[300px]' : 'col-span-12 md:col-span-6 aspect-[4/3] md:aspect-[16/11]'
          ]"
        >
          <img 
            v-if="cat.image"
            :src="cat.image" 
            :alt="cat.title"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110 opacity-85"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent"></div>
          
          <div class="relative z-10 text-white">
            <span v-if="cat.subtitle || cat.badge" class="font-label text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-1.5 block">
              {{ cat.subtitle || cat.badge }}
            </span>
            <h3 class="font-serif text-2xl sm:text-3xl font-normal mb-2 text-white group-hover:translate-x-1 transition-transform duration-300">
              {{ cat.title }}
            </h3>
            <p v-if="cat.description" class="font-sans text-xs sm:text-sm text-white/80 max-w-sm mb-4 leading-relaxed">
              {{ cat.description }}
            </p>
            <span class="font-label text-xs font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 group-hover:bg-white group-hover:text-primary transition-all duration-300 shadow-xs group-hover:shadow-md">
              <span>{{ cat.buttonText || 'Ver Colección' }}</span>
              <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
            </span>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- OLFACTIVE FAMILIES EXPLORER -->
    <section class="py-16 md:py-24 bg-surface-container-low border-t border-outline-variant">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div v-reveal="{ direction: 'up' }" class="text-center max-w-xl mx-auto mb-14">
          <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Guía de Aromas</p>
          <h2 class="font-serif text-3xl md:text-headline-lg text-primary font-normal">Familias Olfativas</h2>
          <p class="font-sans text-sm text-secondary mt-2">
            Conocé las notas principales para encontrar el perfume que mejor va con lo que buscás.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <RouterLink 
            v-for="(family, idx) in siteContentStore.olfactiveFamilies" 
            :key="family.id || family.name"
            :to="`/catalogo?family=${encodeURIComponent(family.name)}`"
            v-reveal="{ delay: idx * 100, direction: 'up' }"
            class="group bg-surface border border-outline-variant hover:border-primary rounded-xl p-6 transition-all duration-300 flex flex-col justify-between shadow-2xs hover:shadow-xl hover:-translate-y-1.5"
          >
            <div>
              <div class="aspect-square bg-surface-container rounded-lg mb-4 overflow-hidden border border-outline-variant">
                <img 
                  :src="family.image" 
                  :alt="family.name"
                  class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
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

            <span class="font-label text-xs uppercase tracking-widest text-primary underline flex items-center gap-1 group-hover:translate-x-1.5 transition-transform duration-300">
              <span>Ver Familia</span>
              <span class="material-symbols-outlined text-xs">arrow_forward</span>
            </span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- FRAGRANCE FINDER QUIZ BANNER -->
    <section class="py-16 md:py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div v-reveal="{ direction: 'zoom' }" class="relative bg-primary-container text-on-primary rounded-2xl p-10 md:p-16 text-center shadow-xl border border-primary overflow-hidden group">
        <!-- Floating decorative sparkles/lights -->
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-1000"></div>
        <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-1000"></div>

        <span class="material-symbols-outlined text-4xl text-on-primary-container mb-3 inline-block animate-float-gentle">auto_awesome</span>
        <p class="font-label text-xs uppercase tracking-[0.25em] text-on-primary-container mb-2">¿No sabés cuál elegir?</p>
        <h2 class="font-serif text-3xl sm:text-4xl md:text-5xl font-normal max-w-2xl mx-auto mb-6 leading-tight">
          Hacé nuestro test rápido en 60 segundos
        </h2>
        <p class="font-sans text-sm sm:text-base text-surface/85 max-w-xl mx-auto mb-8 leading-relaxed">
          Respondé 4 preguntas simples sobre tus gustos, ocasiones de uso y presupuesto para ver las opciones que mejor van con vos.
        </p>
        <RouterLink 
          to="/quiz"
          class="inline-flex items-center gap-2 bg-surface text-primary font-label text-xs uppercase tracking-widest px-9 py-4 rounded-full hover:bg-surface-container transition-all duration-300 shadow-md hover:shadow-2xl hover:scale-105 active:scale-95"
        >
          <span>Hacer el Test Ahora</span>
          <span class="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
        </RouterLink>
      </div>
    </section>

  </div>
</template>
