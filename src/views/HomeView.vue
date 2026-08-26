<script setup>
import { RouterLink } from 'vue-router'
import { olfactiveFamilies } from '@/data/products'

const trustBadges = [
  { icon: 'verified_user', title: '100% Originales', desc: 'Garantía de procedencia directa de casas oficiales.' },
  { icon: 'local_shipping', title: 'Envíos Asegurados', desc: 'Entregas a todo el país con seguimiento en tiempo real.' },
  { icon: 'credit_card', title: 'Cuotas Sin Interés', desc: '3 y 6 cuotas con todas las tarjetas bancarias.' }
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
          
          <h1 class="font-sans text-4xl sm:text-5xl lg:text-display-lg text-primary mb-6 leading-[1.08] tracking-tight font-normal">
            Encontrá tu nueva <br />
            <span class="italic">fragancia favorita.</span>
          </h1>

          <p class="font-sans text-base sm:text-body-lg text-on-surface-variant mb-10 max-w-lg leading-relaxed">
            Una curaduría exclusiva de elixires, esencias de autor y clásicos atemporales seleccionados para acompañar tus momentos más memorables.
          </p>

          <!-- CTAs: Píldoras Ergonómicas Elegantes -->
          <div class="flex flex-col sm:flex-row gap-4">
            <RouterLink 
              to="/catalogo"
              class="inline-flex items-center justify-center bg-primary-container text-on-primary font-label text-label-sm py-4 px-9 rounded-full border border-primary-container hover:bg-surface hover:text-primary-container transition-all duration-300 uppercase tracking-widest text-center shadow-xs"
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
          <div class="grid grid-cols-2 gap-6 pt-10 mt-10 border-t border-outline-variant max-w-md">
            <div>
              <p class="font-sans text-2xl text-primary font-normal">100%</p>
              <p class="font-label text-[11px] text-secondary uppercase tracking-wider">Originales Certificados</p>
            </div>
            <div>
              <p class="font-sans text-2xl text-primary font-normal">Envíos</p>
              <p class="font-label text-[11px] text-secondary uppercase tracking-wider">A Todo el País</p>
            </div>
          </div>

        </div>
      </div>
    </header>

    <!-- TRUST PERKS BAR -->
    <section class="border-b border-outline-variant/60 bg-surface">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          v-for="badge in trustBadges" 
          :key="badge.title"
          class="flex items-start gap-4 p-4 rounded-2xl bg-white/70 hover:bg-white border border-outline-variant/50 hover:border-outline-variant hover:shadow-md transition-all duration-300"
        >
          <div class="w-11 h-11 bg-surface-container rounded-xl flex items-center justify-center flex-shrink-0 text-primary shadow-xs">
            <span class="material-symbols-outlined text-xl">{{ badge.icon }}</span>
          </div>
          <div>
            <h4 class="font-sans text-sm font-bold text-primary mb-0.5">{{ badge.title }}</h4>
            <p class="font-sans text-xs text-secondary leading-relaxed">{{ badge.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- BENTO GRID CATEGORIES -->
    <section class="py-16 md:py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="text-center max-w-xl mx-auto mb-14">
        <p class="font-sans text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Explorá por Universo</p>
        <h2 class="font-sans text-3xl md:text-4xl font-extrabold text-primary tracking-tight">Colecciones Curadas</h2>
        <div class="w-12 h-1 bg-primary rounded-full mx-auto mt-4"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        <!-- Category 1: Mujer (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=woman"
          class="group relative md:col-span-6 aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-neutral-900 rounded-3xl border border-outline-variant/60 hover:border-primary transition-all duration-500 flex flex-col justify-end p-8 shadow-md hover:shadow-2xl hover:-translate-y-1"
        >
          <img 
            src="https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85" 
            alt="Colección Mujer"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-85"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
          
          <div class="relative z-10 text-white">
            <span class="font-sans text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-1.5 block">Alta Costura Femenina</span>
            <h3 class="font-sans text-2xl sm:text-3xl font-extrabold mb-2 text-white">Colección Mujer</h3>
            <p class="font-sans text-xs sm:text-sm text-white/80 max-w-sm mb-4 leading-relaxed">
              Bouquets florales radiantes, notas envolventes de vainilla y composiciones de elegancia absoluta.
            </p>
            <span class="font-sans text-xs font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all">
              <span>Explorar Fragancias</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </RouterLink>

        <!-- Category 2: Hombre (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=man"
          class="group relative md:col-span-6 aspect-[4/3] md:aspect-[16/11] overflow-hidden bg-neutral-900 rounded-3xl border border-outline-variant/60 hover:border-primary transition-all duration-500 flex flex-col justify-end p-8 shadow-md hover:shadow-2xl hover:-translate-y-1"
        >
          <img 
            src="https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85" 
            alt="Colección Hombre"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 opacity-85"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
          
          <div class="relative z-10 text-white">
            <span class="font-sans text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-1.5 block">Carácter & Distinción</span>
            <h3 class="font-sans text-2xl sm:text-3xl font-extrabold mb-2 text-white">Colección Hombre</h3>
            <p class="font-sans text-xs sm:text-sm text-white/80 max-w-sm mb-4 leading-relaxed">
              Maderas profundas de cedro y sándalo, cítricos italianos y resinas ambarinas de presencia imponente.
            </p>
            <span class="font-sans text-xs font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all">
              <span>Explorar Fragancias</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </RouterLink>

        <!-- Category 3: Unisex (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?gender=unisex"
          class="group relative md:col-span-6 bg-white rounded-3xl border border-outline-variant/60 hover:border-primary p-8 md:p-10 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-sm"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-4 shadow-xs">
                <span class="material-symbols-outlined text-2xl">all_inclusive</span>
              </div>
              <span class="font-sans text-[11px] font-semibold uppercase tracking-widest text-secondary block">Sin Género • Pura Expresión</span>
              <h3 class="font-sans text-2xl md:text-3xl font-extrabold text-primary mb-2">Colección Unisex</h3>
            </div>
            <span class="font-sans text-xs font-bold bg-neutral-100 px-3.5 py-1.5 rounded-full text-primary uppercase">
              Variedad
            </span>
          </div>
          <p class="font-sans text-sm text-secondary max-w-md my-4 leading-relaxed">
            Aromas versátiles y vanguardistas donde las maderas, cítricos y resinas componen esencias envolventes para todos.
          </p>
          <span class="font-sans text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
            <span>Ver Selección Unisex</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </RouterLink>

        <!-- Category 4: Perfumería Árabe (Span 6 cols) -->
        <RouterLink 
          to="/catalogo?category=arabes"
          class="group relative md:col-span-6 bg-white rounded-3xl border border-outline-variant/60 hover:border-primary p-8 md:p-10 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-sm"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 shadow-xs">
                <span class="material-symbols-outlined text-2xl">diamond</span>
              </div>
              <span class="font-sans text-[11px] font-semibold uppercase tracking-widest text-secondary block">Lujo de Oriente Medio</span>
              <h3 class="font-sans text-2xl md:text-3xl font-extrabold text-primary mb-2">Perfumería Árabe</h3>
            </div>
            <span class="font-sans text-xs font-bold bg-neutral-100 text-neutral-800 px-3.5 py-1.5 rounded-full uppercase">
              Exclusivos
            </span>
          </div>
          <p class="font-sans text-sm text-secondary max-w-md my-4 leading-relaxed">
            Creaciones opulentas de Dubai, maderas de agar, azafrán, praliné y estelas magnéticas de altísima duración.
          </p>
          <span class="font-sans text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform">
            <span>Explorar Colección Árabe</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </RouterLink>

      </div>
    </section>

    <!-- OLFACTIVE FAMILIES EXPLORER (Estructura Editorial Recta de 2px con Badges en Píldora) -->
    <section class="py-16 md:py-24 bg-surface-container-low border-t border-outline-variant">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div class="text-center max-w-xl mx-auto mb-14">
          <p class="font-label text-label-sm text-secondary uppercase tracking-widest mb-2">Guía Olfativa</p>
          <h2 class="font-sans text-3xl md:text-headline-lg text-primary font-normal">Familias Aromáticas</h2>
          <p class="font-sans text-sm text-secondary mt-2">
            Comprender las notas es el primer paso para descubrir la firma olfativa que resuena con tu esencia.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <RouterLink 
            v-for="family in olfactiveFamilies" 
            :key="family.name"
            :to="`/catalogo?family=${family.name}`"
            class="group bg-surface border border-outline-variant hover:border-primary rounded-xs p-6 transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-md"
          >
            <div>
              <div class="aspect-square bg-surface-container rounded-xs mb-4 overflow-hidden border border-outline-variant">
                <img 
                  :src="family.image" 
                  :alt="family.name"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div class="mb-2">
                <h3 class="font-sans text-2xl text-primary font-normal group-hover:text-primary-container transition-colors">
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

    <!-- FRAGRANCE FINDER QUIZ BANNER (Estructura con Botón Píldora) -->
    <section class="py-16 md:py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="bg-primary-container text-on-primary rounded-xs p-10 md:p-16 text-center shadow-lg border border-primary">
        <span class="material-symbols-outlined text-4xl text-on-primary-container mb-3">auto_awesome</span>
        <p class="font-label text-xs uppercase tracking-[0.25em] text-on-primary-container mb-2">¿Indeciso sobre qué fragancia elegir?</p>
        <h2 class="font-sans text-3xl sm:text-4xl md:text-5xl font-normal max-w-2xl mx-auto mb-6 leading-tight">
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
