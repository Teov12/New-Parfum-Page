<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="bg-primary-container text-on-primary font-label text-label-sm py-2 px-margin-mobile md:px-margin-desktop text-center flex justify-between items-center text-xs tracking-wider uppercase border-b border-primary">
    <div class="hidden lg:flex items-center gap-2">
      <span class="material-symbols-outlined text-sm text-on-primary-container">local_shipping</span>
      <span>Envíos sin cargo en compras mayores a $200.000</span>
    </div>
    
    <div class="w-full lg:w-auto flex justify-center items-center gap-3">
      <span>Envíos a todo el país</span>
      <span class="text-on-primary-container">•</span>
      <span class="font-medium">3 y 6 Cuotas Sin Interés</span>
      <span class="hidden sm:inline text-on-primary-container">•</span>
      <span class="hidden sm:inline">Muestras de regalo con cada pedido</span>
    </div>

    <div class="hidden lg:flex items-center gap-4">
      <RouterLink to="/quiz" class="hover:text-on-primary-container transition-colors duration-200 flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">auto_awesome</span>
        <span>Fragrance Finder</span>
      </RouterLink>
    </div>
  </div>
</template>
