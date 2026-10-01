<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'

const tenantStore = useTenantStore()

const copy = computed(() => tenantStore.isNotFound
  ? {
      icon: 'storefront',
      title: 'Esta tienda no existe',
      text: 'Revisá la dirección. Si querés crear tu propia tienda de perfumes, podés hacerlo en minutos.'
    }
  : {
      icon: 'pause_circle',
      title: `${tenantStore.storeName} está en pausa`,
      text: 'La tienda no está tomando pedidos en este momento. Volvé a visitarnos pronto.'
    })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-surface-container-low">
    <div class="max-w-md w-full text-center bg-surface border border-outline-variant rounded-2xl p-10 shadow-sm space-y-4">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-surface-container border border-outline-variant flex items-center justify-center text-primary">
        <span class="material-symbols-outlined text-2xl">{{ copy.icon }}</span>
      </div>
      <h1 class="font-serif text-2xl text-primary">{{ copy.title }}</h1>
      <p class="text-sm text-secondary leading-relaxed">{{ copy.text }}</p>

      <a
        v-if="!tenantStore.isNotFound && tenantStore.whatsappUrl"
        :href="tenantStore.whatsappUrl"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest"
      >
        <span class="material-symbols-outlined text-base">chat</span>
        Escribinos por WhatsApp
      </a>
      <RouterLink
        v-if="tenantStore.isNotFound"
        to="/crear-tienda"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest"
      >
        Crear mi tienda
      </RouterLink>
      <div class="pt-2">
        <RouterLink to="/admin/login" class="text-[11px] text-secondary hover:text-primary underline">¿Sos el dueño? Ingresá al panel</RouterLink>
      </div>
    </div>
  </div>
</template>
