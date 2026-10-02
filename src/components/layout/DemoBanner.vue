<script setup>
import { computed } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { previewTenantId } from '@/utils/previewTenant'

const props = defineProps({
  // 'store' (vidriera) o 'admin' (panel)
  context: { type: String, default: 'store' }
})

const tenantStore = useTenantStore()

const visible = computed(() => tenantStore.isDemo || tenantStore.platform?.demoMode)
const text = computed(() => {
  if (!tenantStore.isDemo) return 'Entorno de prueba: los pagos y envíos no son reales.'
  return props.context === 'admin'
    ? 'Panel de demostración: probá todo lo que quieras, los cambios se reinician automáticamente.'
    : 'Tienda de demostración: los pagos y envíos son de prueba.'
})
</script>

<template>
  <div
    v-if="visible"
    class="w-full bg-amber-500 text-[#11100F] text-[11px] sm:text-xs font-label font-bold tracking-wide px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center"
  >
    <span class="inline-flex items-center gap-1.5">
      <span class="material-symbols-outlined text-sm">science</span>
      {{ text }}
    </span>
    <a v-if="previewTenantId" href="/?tenant=" class="underline whitespace-nowrap">Volver a la plataforma</a>
  </div>
</template>
