<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { products, olfactiveFamilies } from '@/data/products'
import ProductCard from '@/components/product/ProductCard.vue'

const selectedCategoryTab = ref('all')

const filteredProducts = computed(() => {
  if (selectedCategoryTab.value === 'all') {
    return products.slice(0, 4)
  }
  return products.filter(p => p.gender === selectedCategoryTab.value).slice(0, 4)
})

const trustBadges = [
  { icon: 'verified_user', title: '100% Originales', desc: 'Garantía de procedencia directa de casas oficiales.' },
  { icon: 'local_shipping', title: 'Envíos Asegurados', desc: 'Entregas a todo el país con seguimiento en tiempo real.' },
  { icon: 'card_giftcard', title: 'Muestras de Cortesía', desc: 'Elegí 1 muestra de autor gratis en cada pedido.' },
  { icon: 'credit_card', title: 'Cuotas Sin Interés', desc: '3 y 6 cuotas con todas las tarjetas bancarias.' }
]

const testimonials = [
  {
    quote: "La curaduría de Gicca es inigualable. Compré YSL Libre y la experiencia desde el packaging hasta la muestra de regalo superó mis expectativas.",
    author: "Florencia Casares",
    location: "Recoleta, Buenos Aires",
    rating: 5
  },
  {
    quote: "Encontrar Baccarat Rouge 540 original en Argentina era casi imposible hasta que descubrí esta boutique. Asesoramiento impecable por WhatsApp.",
    author: "Ignacio De la Serna",
    location: "Córdoba Capital",
    rating: 5
  },
  {
    quote: "Presentación digna de una perfumería de París. Llegó en 24 horas a Rosario. Se nota el amor por el detalle y el lujo silencioso.",
    author: "María Eugenia Ramos",
    location: "Rosario, Santa Fe",
    rating: 5
  }
]
</script>

<template>
  <div>
    <!-- HERO SECTION (Editorial Atmosphere) -->
    <header class="relative w-full min-h-[85vh] flex items-center bg-surface-container-low border-b border-outline-variant overflow-hidden">
      <!-- Background Luxury Photography with Overlay -->
      <div class="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2000&q=85" 
          alt="Gicca Perfumes Atmosphere"
          class="w-full h-full object-cover object-center opacity-35 filter saturate-75"
        />
        <div class="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-transparent"></div>
      </div>

      <!-- Hero Content -->
      <div class="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div class="lg:col-span-7 flex flex-col justify-center">
          
          <div class="inline-flex items-center gap-2 mb-6">
            <span class="w-8 h-[1px] bg-primary"></span>
            <p class="font-label text-label-sm text-primary uppercase tracking-[0.25em]">
              Colección Alta Perfumería 2026
            </p>
          </div>

          <h1 class="font-serif text-4xl sm:text-5xl lg:text-display-lg text-primary mb-6 leading-[1.08] tracking-tight font-normal">
            Encontrá tu nueva <br />
            <span class="italic">fragancia favorita.</span>
          </h1>

          <p class="font-sans text-base sm:text-body-lg text-on-surface-variant mb-10 max-w-lg leading-relaxed">
            Una curaduría exclusiva de elixires, esencias de autor y clásicos atemporales seleccionados para acompañar tus momentos más memorables.
          </p>

          <!-- CTAs (Rounded-full Pill Buttons) -->
          <div class="flex flex-col sm:flex-row gap-4">
            <RouterLink 
              to="/catalogo"
              class="inline-flex items-center justify-center bg-primary-container text-on-primary font-label text-label-sm py-4 px-9 rounded-full border border-primary-container hover:bg-surface hover:text-primary-container transition-all duration-300 uppercase tracking-widest text-center shadow-sm"
            >
              Explorar Catálogo
            </RouterLink>

            <RouterLink 
              to="/quiz"
              class="inline-flex items-center justify-center bg-surface/80 backdrop-blur-xs text-primary font-label text-label-sm py-4 px-9 rounded-full border border-outline hover:bg-surface-container transition-all duration-300 uppercase tracking-widest text-center gap-2 shadow-2xs"
            >
              <span class="material-symbols-outlined text-sm">auto_awesome</span>
              <span>Test de Fragancia</span>
            </RouterLink>
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-outline-variant max-w-md">
            <div>
              <p class="font-serif text-2xl text-primary font-normal">100%</p>
              <p class="font-label text-[11px] text-secondary uppercase tracking-wider">Originales Certificados</p>
            </div>
            <div>
              <p class="font-serif text-2xl text-primary font-normal">48hs</p>
              <p class="font-label text-[11px] text-secondary uppercase tracking-wider">Envío Express País</p>
            </div>
            <div>
              <p class="font-serif text-2xl text-primary font-normal">4.9 ★</p>
              <p class="font-label text-[11px] text-secondary uppercase tracking-wider">+5.000 Clientes Felices</p>
            </div>
          </div>

        </div>
      </div>
    </header>

    <!-- TRUST PERKS BAR -->
    <section class="border-b border-outline-variant bg-surface">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          v-for="badge in trustBadges" 
          :key="badge.title"
          class="flex items-start gap-4 p-4 rounded-2xl bg-surface-container-low/50 hover:bg-surface-container border border-outline-variant/60 hover:border-outline-variant transition-all shadow-2xs"
        >
          <div class="w-12 h-12 bg-surface rounded-2xl border border-outline-variant flex items-center justify-center flex-shrink-0 text-primary shadow-2xs">
            <span class="material-symbols-outlined text-xl">{{ badge.icon }}</span>
          </div>
          <div>
            <h4 class="font-serif text-base text-primary font-medium mb-0.5">{{ badge.title }}</h4>
            <p class="font-sans text-xs text-secondary leading-relaxed">{{ badge.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- BENTO GRID CATEGORIES (Rounded-3xl Cards) -->
    <section class="py-16 md:py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="text-center max-w-xl mx-auto mb-14">
        <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Explorá por Universo</p>
        <h2 class="font-serif text-3xl md:text-headline-lg text-primary font-normal">Colecciones Curadas</h2>
        <div class="w-12 h-[1px] bg-primary mx-auto mt-4"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        <!-- Category 1: Mujer (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=woman"
          class="group relative md:col-span-6 aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-surface-container border border-outline-variant hover:border-primary rounded-3xl transition-all duration-300 flex flex-col justify-end p-8 shadow-xs hover:shadow-md"
        >
          <img 
            src="https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85" 
            alt="Colección Mujer"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent"></div>
          
          <div class="relative z-10 text-on-primary">
            <span class="font-label text-xs uppercase tracking-widest text-on-primary-container mb-1 block">Alta Costura Femenina</span>
            <h3 class="font-serif text-3xl md:text-4xl font-normal mb-2">Colección Mujer</h3>
            <p class="font-sans text-sm text-surface/90 max-w-sm mb-4">
              Bouquets florales radiantes, notas envolventes de vainilla y composiciones de elegancia absoluta.
            </p>
            <span class="font-label text-xs uppercase tracking-widest underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explorar Fragancias</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </RouterLink>

        <!-- Category 2: Hombre (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=man"
          class="group relative md:col-span-6 aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-surface-container border border-outline-variant hover:border-primary rounded-3xl transition-all duration-300 flex flex-col justify-end p-8 shadow-xs hover:shadow-md"
        >
          <img 
            src="https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85" 
            alt="Colección Hombre"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent"></div>
          
          <div class="relative z-10 text-on-primary">
            <span class="font-label text-xs uppercase tracking-widest text-on-primary-container mb-1 block">Carácter & Distinción</span>
            <h3 class="font-serif text-3xl md:text-4xl font-normal mb-2">Colección Hombre</h3>
            <p class="font-sans text-sm text-surface/90 max-w-sm mb-4">
              Maderas profundas de cedro y sándalo, cítricos italianos y resinas ambarinas de presencia imponente.
            </p>
            <span class="font-label text-xs uppercase tracking-widest underline flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explorar Fragancias</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </RouterLink>

        <!-- Category 3: Unisex & Nicho (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=unisex"
          class="group relative md:col-span-6 bg-surface-container-high border border-outline-variant rounded-3xl p-8 md:p-10 flex flex-col justify-between hover:border-primary transition-all duration-300 shadow-xs hover:shadow-md"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="material-symbols-outlined text-3xl text-primary-container mb-3">all_inclusive</span>
              <span class="font-label text-xs uppercase tracking-widest text-secondary block">Sin Género • Pura Expresión</span>
              <h3 class="font-serif text-2xl md:text-3xl text-primary font-normal mb-2">Fragancias Unisex & Nicho</h3>
            </div>
            <span class="font-label text-xs bg-surface px-3.5 py-1.5 rounded-full border border-outline-variant text-primary uppercase shadow-2xs">
              18 Variedades
            </span>
          </div>
          <p class="font-sans text-sm text-secondary max-w-md my-4">
            Aromas vanguardistas donde el azafrán, el ámbar gris y la madera de oud rompen todas las convenciones.
          </p>
          <span class="font-label text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Ver Selección Unisex</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </RouterLink>

        <!-- Category 4: Ofertas & Exclusivos (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?offers=true"
          class="group relative md:col-span-6 bg-secondary-container border border-outline-variant rounded-3xl p-8 md:p-10 flex flex-col justify-between hover:border-primary transition-all duration-300 shadow-xs hover:shadow-md"
        >
          <div class="flex justify-between items-start">
            <div>
              <span class="material-symbols-outlined text-3xl text-primary-container mb-3">sell</span>
              <span class="font-label text-xs uppercase tracking-widest text-secondary block">Oportunidades de Lujo</span>
              <h3 class="font-serif text-2xl md:text-3xl text-primary font-normal mb-2">Ofertas de Temporada</h3>
            </div>
            <span class="font-label text-xs bg-primary-container text-on-primary px-3.5 py-1.5 rounded-full uppercase tracking-widest font-bold shadow-xs">
              Hasta 20% OFF
            </span>
          </div>
          <p class="font-sans text-sm text-secondary max-w-md my-4">
            Unidades limitadas con precios especiales y sets de regalo con estuches de edición coleccionista.
          </p>
          <span class="font-label text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Aprovechar Ofertas</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </RouterLink>

      </div>
    </section>

    <!-- BEST SELLERS SECTION -->
    <section class="py-16 md:py-24 bg-surface-container border-y border-outline-variant">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Curaduría Destacada</p>
            <h2 class="font-serif text-3xl md:text-headline-lg text-primary font-normal">Fragancias Icónicas</h2>
          </div>

          <!-- Category Filter Tabs (Rounded-full Pills) -->
          <div class="flex flex-wrap gap-2 bg-surface p-1.5 rounded-full border border-outline-variant shadow-2xs">
            <button
              @click="selectedCategoryTab = 'all'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="selectedCategoryTab === 'all' 
                ? 'bg-primary-container text-on-primary shadow-xs' 
                : 'text-secondary hover:text-primary'"
            >
              Todos los Íconos
            </button>
            <button
              @click="selectedCategoryTab = 'woman'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="selectedCategoryTab === 'woman' 
                ? 'bg-primary-container text-on-primary shadow-xs' 
                : 'text-secondary hover:text-primary'"
            >
              Mujer
            </button>
            <button
              @click="selectedCategoryTab = 'man'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="selectedCategoryTab === 'man' 
                ? 'bg-primary-container text-on-primary shadow-xs' 
                : 'text-secondary hover:text-primary'"
            >
              Hombre
            </button>
            <button
              @click="selectedCategoryTab = 'unisex'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="selectedCategoryTab === 'unisex' 
                ? 'bg-primary-container text-on-primary shadow-xs' 
                : 'text-secondary hover:text-primary'"
            >
              Unisex
            </button>
          </div>
        </div>

        <!-- Products Grid (4 cols) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProductCard 
            v-for="product in filteredProducts" 
            :key="product.id" 
            :product="product" 
          />
        </div>

        <!-- View All Link -->
        <div class="text-center mt-12">
          <RouterLink 
            to="/catalogo"
            class="inline-flex items-center gap-2 bg-surface text-primary font-label text-label-sm py-3.5 px-9 rounded-full border border-outline hover:border-primary hover:bg-surface-container transition-all uppercase tracking-widest shadow-2xs"
          >
            <span>Ver Todos los 124 Perfumes</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>

      </div>
    </section>

    <!-- EDITORIAL SPOTLIGHT: ATELIER STORY -->
    <section class="py-20 lg:py-28 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <!-- Image Container (5 cols) -->
        <div class="lg:col-span-5 relative">
          <div class="aspect-[4/5] bg-surface-container rounded-3xl border border-outline-variant overflow-hidden shadow-md">
            <img 
              src="https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85" 
              alt="Atelier de Perfumes Gicca"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="absolute -bottom-6 -right-6 bg-surface-container-high border border-outline-variant rounded-2xl p-6 hidden sm:block max-w-xs shadow-lg">
            <p class="font-serif text-lg text-primary italic mb-1">"El perfume es la forma más intensa del recuerdo."</p>
            <p class="font-label text-[10px] text-secondary uppercase tracking-widest">— Jean-Paul Guerlain</p>
          </div>
        </div>

        <!-- Story Text (7 cols) -->
        <div class="lg:col-span-7 lg:pl-8">
          <p class="font-label text-label-sm text-secondary uppercase tracking-[0.2em] mb-3">La Filosofía Gicca</p>
          <h2 class="font-serif text-3xl sm:text-4xl text-primary font-normal leading-tight mb-6">
            El arte de vestir la piel <br />con alta perfumería.
          </h2>
          
          <div class="space-y-4 font-sans text-secondary text-sm sm:text-base leading-relaxed mb-8">
            <p>
              En <strong>Gicca Perfumes</strong> creemos que una fragancia no es un accesorio superficial, sino una extensión de tu identidad invisible. Seleccionamos rigurosamente cada fórmula en colaboración con distribuidores oficiales autorizados en Francia, Italia y Medio Oriente.
            </p>
            <p>
              Nuestro compromiso es brindarte la misma experiencia exquisita de las boutiques más prestigiosas del mundo: asesoramiento experto, embalaje de regalo personalizado y la certeza innegociable de recibir piezas 100% auténticas.
            </p>
          </div>

          <div class="flex flex-wrap gap-4">
            <RouterLink 
              to="/nosotros"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-primary-container hover:bg-surface hover:text-primary-container transition-all shadow-xs"
            >
              Conocé Nuestro Atelier
            </RouterLink>
            <RouterLink 
              to="/contacto"
              class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline hover:border-primary hover:bg-surface-container transition-all shadow-2xs"
            >
              Hablar con un Asesor VIP
            </RouterLink>
          </div>
        </div>

      </div>
    </section>

    <!-- OLFACTIVE FAMILIES EXPLORER (Rounded Cards) -->
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
            class="group bg-surface border border-outline-variant hover:border-primary rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-md"
          >
            <div>
              <div class="aspect-square bg-surface-container rounded-2xl mb-4 overflow-hidden border border-outline-variant">
                <img 
                  :src="family.image" 
                  :alt="family.name"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div class="flex justify-between items-baseline mb-2">
                <h3 class="font-serif text-2xl text-primary font-normal group-hover:text-primary-container transition-colors">
                  {{ family.name }}
                </h3>
                <span class="font-label text-xs text-secondary uppercase bg-surface-container px-2.5 py-0.5 rounded-full">{{ family.count }} aromas</span>
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

    <!-- FRAGRANCE FINDER QUIZ BANNER (Rounded Container) -->
    <section class="py-16 md:py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="bg-primary-container text-on-primary rounded-3xl p-10 md:p-16 text-center shadow-lg border border-primary">
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

    <!-- TESTIMONIALS SECTION -->
    <section class="py-16 md:py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="text-center max-w-xl mx-auto mb-14">
        <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Experiencias Reales</p>
        <h2 class="font-serif text-3xl md:text-headline-lg text-primary font-normal">Lo Que Dicen Nuestros Clientes</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="(item, index) in testimonials" 
          :key="index"
          class="bg-surface-container rounded-3xl border border-outline-variant p-8 flex flex-col justify-between relative shadow-xs hover:shadow-md transition-shadow"
        >
          <span class="font-serif text-5xl text-outline-variant absolute top-4 right-6 pointer-events-none">“</span>
          <div>
            <div class="flex gap-1 text-primary mb-4">
              <span v-for="star in 5" :key="star" class="material-symbols-outlined text-sm fill-icon">star</span>
            </div>
            <p class="font-sans text-sm text-primary leading-relaxed italic mb-6">
              "{{ item.quote }}"
            </p>
          </div>

          <div class="border-t border-outline-variant pt-4">
            <h4 class="font-serif text-base text-primary font-medium">{{ item.author }}</h4>
            <p class="font-label text-[11px] text-secondary uppercase tracking-wider">{{ item.location }}</p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>
