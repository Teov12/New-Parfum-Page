<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="bg-surface">
    
    <!-- Hero Banner -->
    <section class="relative bg-surface-container py-20 lg:py-28 border-b border-outline-variant">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center max-w-3xl">
        <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary mb-3 block">El Atelier de Autor</span>
        <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl text-primary font-normal leading-tight mb-6">
          La Filosofía del <br /><span class="italic">Lujo Silencioso</span>
        </h1>
        <p class="font-sans text-base sm:text-lg text-secondary leading-relaxed">
          Nacimos con una convicción clara: las mejores fragancias no necesitan gritar para ser inolvidables. Su magnetismo reside en la nobleza de las materias primas y la maestría artesanal.
        </p>
      </div>
    </section>

    <!-- Main Story Grid -->
    <section class="py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
        <div class="lg:col-span-6 space-y-6">
          <span class="font-label text-xs uppercase tracking-widest text-secondary block">Nuestra Historia</span>
          <h2 class="font-serif text-3xl sm:text-4xl text-primary font-normal leading-tight">
            Una búsqueda incansable por las esencias más puras del mundo.
          </h2>
          <div class="space-y-4 font-sans text-secondary text-base leading-relaxed">
            <p>
              Fundada en Buenos Aires como un espacio de curaduría selecta, <strong>Gicca Perfumes</strong> surgió ante la necesidad de ofrecer a los amantes de la alta perfumería un catálogo sin concesiones.
            </p>
            <p>
              Viajamos directamente a las fuentes de producción en Grasse (Francia), Florencia (Italia) y los talleres más distinguidos de Medio Oriente para seleccionar lotes de producción auténticos y ediciones limitadas.
            </p>
            <p>
              Cada botella que sale de nuestro atelier es examinada minuciosamente, asegurando su código de lote (batch code), su frescura de maceración y un embalaje térmico protector que preserva intactas las moléculas olfativas.
            </p>
          </div>
        </div>

        <div class="lg:col-span-6">
          <div class="aspect-[4/5] bg-surface-container border border-outline-variant rounded-xs overflow-hidden shadow-md">
            <img 
              src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85" 
              alt="Frascos de autor en Gicca Atelier"
              class="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <!-- Pillars Section -->
      <div class="border-t border-b border-outline-variant py-16">
        <div class="text-center max-w-xl mx-auto mb-14">
          <p class="font-label text-xs uppercase tracking-widest text-secondary mb-2">Los Tres Pilares</p>
          <h3 class="font-serif text-3xl text-primary font-normal">Nuestros Compromisos Sagrados</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-surface-container p-8 border border-outline-variant rounded-xs space-y-4 shadow-xs">
            <div class="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-outline-variant text-primary font-serif text-xl font-bold shadow-2xs">
              I
            </div>
            <h4 class="font-serif text-2xl text-primary font-normal">Autenticidad Absoluta</h4>
            <p class="font-sans text-sm text-secondary leading-relaxed">
              Trabajamos únicamente con importaciones oficiales y sellos holográficos de garantía. Cero réplicas o testers fraccionados.
            </p>
          </div>

          <div class="bg-surface-container p-8 border border-outline-variant rounded-xs space-y-4 shadow-xs">
            <div class="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-outline-variant text-primary font-serif text-xl font-bold shadow-2xs">
              II
            </div>
            <h4 class="font-serif text-2xl text-primary font-normal">Curaduría Experta</h4>
            <p class="font-sans text-sm text-secondary leading-relaxed">
              No listamos miles de productos indiscriminados; cada fragancia en nuestro catálogo ha superado rigurosas pruebas de estela, balance y duración.
            </p>
          </div>

          <div class="bg-surface-container p-8 border border-outline-variant rounded-xs space-y-4 shadow-xs">
            <div class="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-outline-variant text-primary font-serif text-xl font-bold shadow-2xs">
              III
            </div>
            <h4 class="font-serif text-2xl text-primary font-normal">Experiencia Sensorial VIP</h4>
            <p class="font-sans text-sm text-secondary leading-relaxed">
              Desde la elección de muestras de cortesía hasta el desempacado perfumado con lazos de seda, comprar en Gicca es un ritual de deleite.
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Box -->
      <div class="mt-20 bg-surface-container-high border border-outline-variant rounded-xs p-10 md:p-16 text-center max-w-3xl mx-auto space-y-6 shadow-md">
        <h3 class="font-serif text-3xl sm:text-4xl text-primary font-normal">
          ¿Listo para descubrir tu fragancia insignia?
        </h3>
        <p class="font-sans text-secondary text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Nuestros asesores sommelier están listos para guiarte en cada paso.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink 
            to="/catalogo"
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-primary-container hover:bg-inverse-surface transition-all shadow-xs"
          >
            Explorar Catálogo
          </RouterLink>
          <RouterLink 
            to="/quiz"
            class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline hover:bg-surface-container transition-all shadow-2xs"
          >
            Hacer Test de Fragancia
          </RouterLink>
        </div>
      </div>

    </section>

  </div>
</template>
