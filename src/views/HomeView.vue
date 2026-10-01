<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useSiteContentStore } from '@/stores/siteContent'
import ProductCard from '@/components/product/ProductCard.vue'
import { useTenantStore } from '@/stores/tenant'

const tenantStore = useTenantStore()

const productStore = useProductStore()
const siteContentStore = useSiteContentStore()

// Hero Image Carousel Slides (from dynamic siteContentStore)
const heroSlides = computed(() => siteContentStore.heroSlides)
const slidesCount = computed(() => (heroSlides.value && Array.isArray(heroSlides.value)) ? heroSlides.value.length : 0)

const currentSlide = ref(0)
const slideDirection = ref('next') // 'next' (right-to-left) | 'prev' (left-to-right)
const isAnimating = ref(false)
const isAutoplayPaused = ref(false)
const AUTOPLAY_TIME = 6000
let autoplayTimeout = null
let slideStartTime = Date.now()
let remainingAutoplayTime = AUTOPLAY_TIME

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
  pauseAutoplay()
}

const onTouchEnd = (e) => {
  if (e.changedTouches && e.changedTouches.length > 0) {
    touchEndX = e.changedTouches[0].clientX
    const diff = touchEndX - touchStartX
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
  }
  resumeAutoplay()
}

const startSlideTimer = () => {
  if (autoplayTimeout) {
    clearTimeout(autoplayTimeout)
    autoplayTimeout = null
  }
  if (slidesCount.value <= 1) return

  slideStartTime = Date.now()
  autoplayTimeout = setTimeout(() => {
    nextSlide()
  }, remainingAutoplayTime)
}

const pauseAutoplay = () => {
  if (isAutoplayPaused.value) return
  isAutoplayPaused.value = true
  if (autoplayTimeout) {
    clearTimeout(autoplayTimeout)
    autoplayTimeout = null
  }
  const elapsed = Date.now() - slideStartTime
  remainingAutoplayTime = Math.max(250, remainingAutoplayTime - elapsed)
}

const resumeAutoplay = () => {
  if (!isAutoplayPaused.value) return
  isAutoplayPaused.value = false
  if (slidesCount.value <= 1) return
  startSlideTimer()
}

const resetAutoplay = () => {
  if (autoplayTimeout) {
    clearTimeout(autoplayTimeout)
    autoplayTimeout = null
  }
  remainingAutoplayTime = AUTOPLAY_TIME
  if (!isAutoplayPaused.value) {
    startSlideTimer()
  }
}

// Watch currentSlide so any slide change resets the timer to a full 6 seconds
watch(currentSlide, () => {
  remainingAutoplayTime = AUTOPLAY_TIME
  if (!isAutoplayPaused.value) {
    startSlideTimer()
  }
})

const handleVisibilityChange = () => {
  if (document.hidden) {
    pauseAutoplay()
  } else {
    resumeAutoplay()
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
  startSlideTimer()
  preloadSlideAssets()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (autoplayTimeout) {
    clearTimeout(autoplayTimeout)
    autoplayTimeout = null
  }
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
  { icon: 'credit_card', title: 'Hasta 6 Cuotas', desc: '3 y 6 cuotas fijas sin interés con tarjetas bancarias.' },
  { icon: 'support_agent', title: 'Atención por WhatsApp', desc: 'Te asesoramos para que elijas tu perfume ideal.' }
]

const openHomeFaq = ref(1)
const toggleHomeFaq = (id) => {
  openHomeFaq.value = openHomeFaq.value === id ? null : id
}

const homeFaqs = [
  {
    id: 1,
    q: '¿Cómo garantizan que todos los perfumes son 100% originales?',
    a: 'Importamos únicamente a través de canales oficiales autorizados. Cada frasco incluye estampilla fiscal de importación, celofán de fábrica inalterado y Batch Code verificable en bases de datos mundiales como CheckFresh.'
  },
  {
    id: 2,
    q: '¿Cómo funcionan las 6 cuotas fijas y los medios de pago?',
    a: 'Podés abonar en hasta 6 cuotas fijas sin interés (3 y 6 cuotas) con tarjetas de crédito bancarias mediante Mercado Pago sobre el precio de lista, o acceder a un 28% de descuento directo abonando con Transferencia Bancaria.'
  },
  {
    id: 3,
    q: '¿Qué son los decants o muestras fraccionadas?',
    a: 'Son presentaciones fraccionadas de 5ml o 10ml extraídas minuciosamente de los frascos originales en vaporizadores de vidrio herméticos. Te permiten probar una fragancia de alta gama durante semanas antes de adquirir la botella completa.'
  },
  {
    id: 4,
    q: '¿Cuáles son los tiempos y costos de envío?',
    a: 'Enviamos a todo el país a través de Andreani asegurado con código de seguimiento en tiempo real. En CABA y GBA las entregas demoran entre 24 y 48 hs hábiles, y al interior entre 3 y 5 días. En compras superiores al monto mínimo el envío es 100% bonificado.'
  }
]
</script>

<template>
  <div>
    <!-- HERO SECTION: INTERACTIVE IMAGE CAROUSEL (EDITORIAL SPLIT - BYREDO / LE LABO AESTHETIC) -->
    <header 
      class="relative w-full min-h-[78vh] lg:min-h-[74vh] xl:min-h-[84vh] flex items-center bg-surface border-b border-outline-variant overflow-hidden group/hero select-none"
      @mouseenter="pauseAutoplay"
      @mouseleave="resumeAutoplay"
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
          <!-- Hero Background Image (Full vibrancy with Ken Burns slow zoom) -->
          <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img 
              :src="currentSlideData.image" 
              :alt="`${tenantStore.storeName} - ${currentSlideData.title || ''} ${currentSlideData.highlight || ''}`"
              class="w-full h-full object-cover object-center opacity-80 sm:opacity-85 will-change-transform"
              :class="currentSlide % 2 === 0 ? 'animate-ken-burns' : 'animate-ken-burns-alt'"
              decoding="async"
              @error="(e) => e.target.src = 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2000&q=85'"
            />
            <!-- Luxury Warm Tonal Overlays: legibilidad impecable a la izquierda y foto viva a la derecha -->
            <div class="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 via-45% to-transparent"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent via-20% to-transparent"></div>
          </div>

          <!-- Slide Content: Editorial Split Grid -->
          <div class="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 sm:py-14 lg:py-10 xl:py-16 2xl:py-20 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-12 h-full items-center">
            
            <!-- Left Column: Pure Luxury Typography (7 cols on lg) -->
            <div class="lg:col-span-7 flex flex-col justify-center text-left">
              
              <!-- Editorial Kicker / Eyebrow with 6 Cuotas Badge -->
              <div class="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-3 sm:mb-5 hero-tag-enter">
                <span class="w-8 h-px bg-primary/40 hidden sm:inline-block"></span>
                <span class="font-label text-xs sm:text-[13px] uppercase tracking-[0.25em] text-secondary font-medium">
                  {{ currentSlideData.tag || 'ALTA PERFUMERÍA' }}
                </span>
                <span class="text-secondary/40 hidden sm:inline">•</span>
                <span class="inline-flex items-center gap-1.5 font-label text-[11px] sm:text-xs uppercase tracking-[0.16em] text-amber-950 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-xs border border-amber-800/25">
                  <span class="material-symbols-outlined text-[13px] text-amber-900 leading-none">credit_card</span>
                  <span>Hasta 6 Cuotas Sin Interés</span>
                </span>
              </div>

              <!-- Editorial Headline -->
              <h1 class="font-sans text-3xl sm:text-4xl lg:text-[40px] xl:text-[52px] 2xl:text-[60px] text-primary mb-4 lg:mb-5 xl:mb-6 font-normal hero-title-enter">
                <span class="block tracking-tight leading-[1.18]">{{ currentSlideData.title }}</span>
                <span class="block mt-2.5 sm:mt-3.5 lg:mt-4 italic font-serif text-primary-container tracking-normal leading-[1.22]">
                  {{ currentSlideData.highlight }}
                </span>
              </h1>

              <!-- Editorial Narrative -->
              <p class="font-sans text-sm sm:text-base lg:text-sm xl:text-base 2xl:text-lg text-secondary mb-6 sm:mb-8 lg:mb-6 xl:mb-10 max-w-xl leading-relaxed font-normal hero-desc-enter">
                {{ currentSlideData.description }}
              </p>

              <!-- CTAs: Sobrio y Elegante (Sin iconos de varita mágica ni botones inflados) -->
              <div class="flex flex-wrap items-center gap-4 sm:gap-6 hero-cta-enter">
                <RouterLink 
                  :to="currentSlideData.primaryCtaLink"
                  class="inline-flex items-center justify-center bg-primary text-on-primary font-label text-xs uppercase tracking-[0.18em] py-3.5 sm:py-4 px-7 sm:px-9 rounded-sm border border-primary hover:bg-primary-container hover:border-primary-container transition-all duration-300 text-center shadow-xs hover:shadow-md active:translate-y-0"
                >
                  <span>{{ currentSlideData.primaryCtaText }}</span>
                </RouterLink>

                <RouterLink 
                  v-if="currentSlideData.secondaryCtaText"
                  :to="currentSlideData.secondaryCtaLink"
                  class="inline-flex items-center gap-2 text-primary font-label text-xs uppercase tracking-[0.18em] py-3.5 px-1 hover:text-primary-container transition-colors group/cta"
                >
                  <span>{{ currentSlideData.secondaryCtaText }}</span>
                  <span class="material-symbols-outlined text-base transition-transform duration-300 group-hover/cta:translate-x-1.5">arrow_forward</span>
                </RouterLink>
              </div>

              <!-- Commercial Highlights: 6 Cuotas & Transferencia -->
              <div class="flex flex-wrap items-center gap-3.5 sm:gap-6 mt-6 sm:mt-8 lg:mt-6 xl:mt-10 pt-4 sm:pt-6 border-t border-outline-variant/60 max-w-lg hero-stats-enter">
                <div class="flex items-center gap-2 text-primary text-xs font-sans">
                  <span class="material-symbols-outlined text-base text-primary">credit_card</span>
                  <span>Hasta <strong>6 cuotas fijas sin interés</strong> (3 y 6)</span>
                </div>
                <span class="text-outline-variant hidden sm:inline">•</span>
                <div class="flex items-center gap-2 text-emerald-800 text-xs font-sans font-medium">
                  <span class="material-symbols-outlined text-base text-emerald-700">payments</span>
                  <span>28% OFF por Transferencia</span>
                </div>
              </div>

            </div>

            <!-- Right Column: Integrated Fragrance Showcase (5 cols on lg) - Byredo / Le Labo Editorial Frame -->
            <div class="hidden lg:flex lg:col-span-5 justify-center lg:justify-end items-center">
              <div class="relative w-full max-w-[290px] lg:max-w-[310px] xl:max-w-[380px] 2xl:max-w-[410px] hero-frame-enter">
                
                <!-- Architectural Exhibition Frame -->
                <div class="relative aspect-[4/5] bg-surface rounded-sm overflow-hidden border border-outline-variant/80 shadow-[0_12px_36px_rgba(46,25,17,0.06)] group">
                  <img 
                    :src="currentSlideData.bottleImage || currentSlideData.image" 
                    :alt="`Perfume ${currentSlideData.featuredTitle || 'exclusivo'} original en Argentina`" 
                    class="w-full h-full object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-105"
                    decoding="async"
                    @error="(e) => e.target.src = 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=85'"
                  />
                </div>

                <!-- Curatorial Caption below the frame (Museum Plaque Aesthetic) -->
                <div v-if="currentSlideData.featuredTitle" class="mt-4 pt-3.5 border-t border-outline-variant/60 flex items-start justify-between text-left">
                  <div class="space-y-1 pr-4">
                    <span class="font-label text-[10px] uppercase tracking-[0.2em] text-secondary font-semibold">
                      Selección de la Casa
                    </span>
                    <h3 class="font-serif text-lg text-primary font-normal leading-snug">
                      {{ currentSlideData.featuredTitle }}
                    </h3>
                    <p v-if="currentSlideData.featuredSub" class="font-sans text-xs text-secondary/80 line-clamp-1">
                      {{ currentSlideData.featuredSub }}
                    </p>
                  </div>
                  <span class="font-mono text-xs text-secondary/60 tracking-widest pt-0.5 whitespace-nowrap">
                    0{{ currentSlide + 1 }}/0{{ slidesCount }}
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </Transition>

      <!-- Editorial Slide Controls Dock -->
      <div class="absolute bottom-6 sm:bottom-8 right-margin-mobile sm:right-margin-desktop z-30 flex items-center gap-3 bg-surface/95 backdrop-blur-md px-3.5 py-2 rounded-sm border border-outline-variant/70 shadow-xs">
        <!-- Numeric Counter -->
        <div class="flex items-center gap-1.5 font-mono text-xs text-primary font-medium tracking-wider pl-1">
          <span>0{{ currentSlide + 1 }}</span>
          <span class="text-secondary/40">/</span>
          <span class="text-secondary/60">0{{ slidesCount }}</span>
        </div>

        <span class="w-px h-4 bg-outline-variant/70"></span>

        <!-- Minimalist Directional Navigation -->
        <div class="flex items-center gap-1">
          <button 
            @click="prevSlide(); resetAutoplay()"
            class="w-7 h-7 rounded-sm hover:bg-surface-container flex items-center justify-center text-primary transition-colors active:scale-90"
            aria-label="Diapositiva anterior"
          >
            <span class="material-symbols-outlined text-base">west</span>
          </button>
          <button 
            @click="nextSlide(); resetAutoplay()"
            class="w-7 h-7 rounded-sm hover:bg-surface-container flex items-center justify-center text-primary transition-colors active:scale-90"
            aria-label="Siguiente diapositiva"
          >
            <span class="material-symbols-outlined text-base">east</span>
          </button>
        </div>
      </div>

      <!-- Subtle Editorial Autoplay Progress Line -->
      <div class="absolute bottom-0 left-0 right-0 h-[2px] bg-outline-variant/30 z-20 pointer-events-none">
        <div 
          :key="`progress-${currentSlide}`"
          class="h-full bg-primary-container/80"
          :style="{ 
            animation: 'autoplayProgress 6s linear forwards',
            animationPlayState: isAutoplayPaused ? 'paused' : 'running'
          }"
        ></div>
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
          <div class="w-11 h-11 bg-surface rounded-xl flex items-center justify-center flex-shrink-0 text-primary shadow-xs border border-outline-variant/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
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
            class="w-10 h-10 rounded-md bg-surface border border-outline-variant hover:bg-surface-container text-primary flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
            aria-label="Desplazar a la izquierda"
          >
            <span class="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button 
            @click="scrollCarousel('right')"
            class="w-10 h-10 rounded-md bg-surface border border-outline-variant hover:bg-surface-container text-primary flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all"
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
            'group relative overflow-hidden bg-primary rounded-xl border border-outline-variant transition-all duration-500 flex flex-col justify-end p-8 shadow-md hover:shadow-2xl hover:-translate-y-1.5',
            cat.span === 12 ? 'col-span-12 aspect-[21/9] min-h-[300px]' : 'col-span-12 md:col-span-6 aspect-[4/3] md:aspect-[16/11]'
          ]"
        >
          <img 
            v-if="cat.image"
            :src="cat.image" 
            :alt="`Perfumes originales categoría ${cat.title} - ${tenantStore.storeName}`"
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
            class="group bg-surface border border-outline-variant rounded-xl p-6 transition-all duration-300 flex flex-col justify-between shadow-2xs hover:shadow-xl hover:-translate-y-1.5"
          >
            <div>
              <div class="aspect-square bg-surface-container rounded-lg mb-4 overflow-hidden border border-outline-variant">
                <img 
                  :src="family.image" 
                  :alt="`Familia olfativa ${family.name} - Notas y fragancias`"
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

    <!-- FREQUENTLY ASKED QUESTIONS SECTION -->
    <section class="py-16 md:py-24 max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop border-t border-outline-variant">
      <div v-reveal="{ direction: 'up' }" class="text-center mb-12">
        <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary mb-2 block font-semibold">Dudas Frecuentes</span>
        <h2 class="font-serif text-3xl sm:text-4xl font-normal text-primary">Preguntas Frecuentes</h2>
        <div class="w-12 h-0.5 bg-primary rounded-full mx-auto mt-3"></div>
      </div>

      <div class="space-y-3.5">
        <div 
          v-for="(faq, idx) in homeFaqs" 
          :key="faq.id"
          v-reveal="{ delay: idx * 70, direction: 'up' }"
          class="bg-surface-container border border-outline-variant/80 rounded-xl overflow-hidden transition-all duration-300 shadow-2xs hover:shadow-xs"
          :class="openHomeFaq === faq.id ? 'border-primary/40 bg-surface' : ''"
        >
          <button 
            @click="toggleHomeFaq(faq.id)"
            class="w-full text-left p-5 sm:p-6 flex justify-between items-center gap-4 font-sans text-base sm:text-lg text-primary font-medium cursor-pointer transition-colors"
            :aria-expanded="openHomeFaq === faq.id"
          >
            <span>{{ faq.q }}</span>
            <div 
              class="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 transition-transform duration-300 ease-out"
              :class="openHomeFaq === faq.id ? 'rotate-180 bg-primary/10 text-primary' : 'text-secondary'"
            >
              <span class="material-symbols-outlined text-lg">expand_more</span>
            </div>
          </button>
          
          <div 
            class="faq-accordion-grid"
            :class="{ 'is-open': openHomeFaq === faq.id }"
          >
            <div class="faq-accordion-inner">
              <div class="px-5 sm:px-6 pb-6 font-sans text-sm text-secondary leading-relaxed border-t border-outline-variant/60 pt-4 bg-surface/50">
                {{ faq.a }}
              </div>
            </div>
          </div>
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
