<script setup>
import { RouterLink } from 'vue-router'
import { useSiteContentStore } from '@/stores/siteContent'

const siteContentStore = useSiteContentStore()
</script>

<template>
  <div class="bg-surface">
    
    <!-- Hero Banner -->
    <section class="relative bg-surface-container py-20 lg:py-28 border-b border-outline-variant">
      <div v-reveal class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center max-w-3xl">
        <span class="font-label text-xs uppercase tracking-[0.25em] text-secondary mb-3 block">Sobre Nosotros</span>
        <h1 class="font-sans text-4xl sm:text-5xl lg:text-6xl text-primary font-normal leading-tight mb-6">
          Perfumes Originales <br /><span class="italic">al Mejor Precio</span>
        </h1>
        <p class="font-sans text-base sm:text-lg text-secondary leading-relaxed">
          Nos dedicamos a la reventa de fragancias 100% originales, perfumes importados de diseñador y las últimas tendencias de perfumería árabe que son furor.
        </p>
      </div>
    </section>

    <!-- Main Story Grid -->
    <section class="py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
        <div v-reveal="{ direction: 'right' }" class="lg:col-span-6 space-y-6">
          <span class="font-label text-xs uppercase tracking-widest text-secondary block">Quiénes Somos</span>
          <h2 class="font-sans text-3xl sm:text-4xl text-primary font-normal leading-tight">
            Pasión por los perfumes y atención directa, de persona a persona.
          </h2>
          <div class="space-y-4 font-sans text-secondary text-base leading-relaxed">
            <p>
              En <strong>Gicca Perfumes</strong> nacimos con una propuesta clara: que puedas comprar tus perfumes favoritos de manera fácil, segura y con precios justos.
            </p>
            <p>
              Trabajamos con importadores y distribuidores directos para garantizar que cada perfume sea 100% legítimo, nuevo, sellado de fábrica y con su código de lote (batch code) verificable.
            </p>
            <p>
              Ya sea que busques tu perfume de todos los días, un clásico importado o quieras probar una fragancia árabe de moda, te ayudamos a elegir por WhatsApp de forma rápida y honesta.
            </p>
          </div>
        </div>

        <div v-reveal="{ direction: 'left', delay: 150 }" class="lg:col-span-6">
          <div class="aspect-[4/5] bg-surface-container border border-outline-variant rounded-xs overflow-hidden shadow-md">
            <img 
              :src="siteContentStore.editorial?.aboutImage || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85'" 
              alt="Fragancias originales en Gicca Perfumes"
              class="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>
        </div>
      </div>

      <!-- Pillars Section -->
      <div class="border-t border-b border-outline-variant py-16">
        <div v-reveal class="text-center max-w-xl mx-auto mb-14">
          <p class="font-label text-xs uppercase tracking-widest text-secondary mb-2">Nuestras Garantías</p>
          <h3 class="font-sans text-3xl text-primary font-normal">Por Qué Comprar con Nosotros</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-reveal="{ delay: 100 }" class="bg-surface-container p-8 border border-outline-variant rounded-xs space-y-4 shadow-xs hover:border-primary transition-all duration-300">
            <div class="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-outline-variant text-primary font-sans text-xl font-bold shadow-2xs">
              ✓
            </div>
            <h4 class="font-sans text-2xl text-primary font-normal">100% Originales</h4>
            <p class="font-sans text-sm text-secondary leading-relaxed">
              Todos nuestros perfumes vienen en su caja cerrada de origen con celofán sellado y estampilla fiscal. Cero réplicas ni imitaciones.
            </p>
          </div>

          <div v-reveal="{ delay: 200 }" class="bg-surface-container p-8 border border-outline-variant rounded-xs space-y-4 shadow-xs hover:border-primary transition-all duration-300">
            <div class="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-outline-variant text-primary font-sans text-xl font-bold shadow-2xs">
              💬
            </div>
            <h4 class="font-sans text-2xl text-primary font-normal">Asesoramiento Directo</h4>
            <p class="font-sans text-sm text-secondary leading-relaxed">
              ¿No sabés cuál elegir? Te respondemos por WhatsApp con opiniones reales sobre fijación, duración y similitudes para que no te equivoques.
            </p>
          </div>

          <div v-reveal="{ delay: 300 }" class="bg-surface-container p-8 border border-outline-variant rounded-xs space-y-4 shadow-xs hover:border-primary transition-all duration-300">
            <div class="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-outline-variant text-primary font-sans text-xl font-bold shadow-2xs">
              📦
            </div>
            <h4 class="font-sans text-2xl text-primary font-normal">Envíos Cuidados</h4>
            <p class="font-sans text-sm text-secondary leading-relaxed">
              Embalamos cada frasco con plástico burbuja reforzado para que tu pedido llegue en perfecto estado a tu domicilio o sucursal Andreani.
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Box -->
      <div v-reveal="{ direction: 'zoom' }" class="mt-20 bg-surface-container-high border border-outline-variant rounded-xs p-10 md:p-16 text-center max-w-3xl mx-auto space-y-6 shadow-md">
        <h3 class="font-sans text-3xl sm:text-4xl text-primary font-normal">
          ¿Buscás tu próximo perfume?
        </h3>
        <p class="font-sans text-secondary text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Explorá nuestro catálogo con stock actualizado o consultanos cualquier duda por WhatsApp.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink 
            to="/catalogo"
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-primary-container hover:bg-inverse-surface transition-all shadow-xs"
          >
            Ver Catálogo
          </RouterLink>
          <RouterLink 
            to="/quiz"
            class="bg-surface text-primary font-label text-xs uppercase tracking-widest px-8 py-3.5 rounded-full border border-outline hover:bg-surface-container transition-all shadow-2xs"
          >
            Hacer Test Rápido
          </RouterLink>
        </div>
      </div>

    </section>

  </div>
</template>
