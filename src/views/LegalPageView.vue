<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useTenantStore } from '@/stores/tenant'
import { legalTemplates, LEGAL_TITLES, LEGAL_FIELDS } from '@/utils/legalTemplates'

const route = useRoute()
const tenantStore = useTenantStore()

const doc = computed(() => route.meta.legalDoc)
const title = computed(() => LEGAL_TITLES[doc.value])

// Texto propio de la tienda o, si no lo cargó, la plantilla base con sus datos
const text = computed(() => {
  const own = tenantStore.legal?.[LEGAL_FIELDS[doc.value]]
  if (own && own.trim()) return own
  return legalTemplates[doc.value]({ storeName: tenantStore.storeName, legal: tenantStore.legal || {} })
})
</script>

<template>
  <div class="bg-surface-container py-12 min-h-[70vh]">
    <article class="max-w-3xl mx-auto px-4">
      <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-10 space-y-6">
        <h1 class="font-serif text-3xl text-primary">{{ title }}</h1>
        <div class="text-sm text-on-surface leading-relaxed whitespace-pre-line">{{ text }}</div>
        <div v-if="doc === 'devoluciones'" class="pt-2">
          <RouterLink to="/arrepentimiento" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-label text-xs uppercase tracking-widest">
            Botón de arrepentimiento
          </RouterLink>
        </div>
      </div>
    </article>
  </div>
</template>
