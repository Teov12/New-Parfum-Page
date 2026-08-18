<script setup>
defineProps({
  pyramid: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="bg-surface-container border border-outline-variant p-6 sm:p-8 space-y-6">
    <div class="border-b border-outline-variant pb-3 flex justify-between items-baseline">
      <h3 class="font-serif text-xl text-primary font-medium">Pirámide Olfativa</h3>
      <span class="font-label text-[11px] uppercase tracking-widest text-secondary">Evolución en Piel</span>
    </div>

    <div class="space-y-6">
      
      <!-- Top Notes (Salida) -->
      <div class="flex items-start gap-4 p-4 bg-surface border border-outline-variant">
        <div class="w-10 h-10 bg-surface-container flex items-center justify-center flex-shrink-0 text-primary border border-outline-variant">
          <span class="material-symbols-outlined text-xl">air</span>
        </div>
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Salida (Top Notes)</span>
            <span class="text-[11px] text-secondary">• Primeros 15-30 min</span>
          </div>
          <p class="font-sans text-xs text-secondary mb-2">La primera impresión chispeante e inmediata al vaporizar.</p>
          <div class="flex flex-wrap gap-1.5">
            <span 
              v-for="note in pyramid.topNotes" 
              :key="note"
              class="font-label text-xs uppercase bg-surface-container px-2.5 py-1 border border-outline-variant text-primary"
            >
              {{ note }}
            </span>
          </div>
        </div>
      </div>

      <!-- Heart Notes (Corazón) -->
      <div class="flex items-start gap-4 p-4 bg-surface border border-outline-variant">
        <div class="w-10 h-10 bg-surface-container flex items-center justify-center flex-shrink-0 text-primary border border-outline-variant">
          <span class="material-symbols-outlined text-xl">spa</span>
        </div>
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Corazón (Heart Notes)</span>
            <span class="text-[11px] text-secondary">• 2 a 6 horas</span>
          </div>
          <p class="font-sans text-xs text-secondary mb-2">El alma y personalidad central que define el carácter de la fragancia.</p>
          <div class="flex flex-wrap gap-1.5">
            <span 
              v-for="note in pyramid.heartNotes" 
              :key="note"
              class="font-label text-xs uppercase bg-secondary-container px-2.5 py-1 border border-outline-variant text-primary font-medium"
            >
              {{ note }}
            </span>
          </div>
        </div>
      </div>

      <!-- Base Notes (Fondo) -->
      <div class="flex items-start gap-4 p-4 bg-surface border border-outline-variant">
        <div class="w-10 h-10 bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 border border-primary-container">
          <span class="material-symbols-outlined text-xl">nature</span>
        </div>
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Fondo (Base Notes)</span>
            <span class="text-[11px] text-secondary">• 6 a 12+ horas</span>
          </div>
          <p class="font-sans text-xs text-secondary mb-2">La estela profunda, sensual y duradera que permanece en la memoria y las prendas.</p>
          <div class="flex flex-wrap gap-1.5">
            <span 
              v-for="note in pyramid.baseNotes" 
              :key="note"
              class="font-label text-xs uppercase bg-surface-container-high px-2.5 py-1 border border-outline-variant text-primary font-semibold"
            >
              {{ note }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
