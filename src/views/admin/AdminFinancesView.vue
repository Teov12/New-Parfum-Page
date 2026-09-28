<script setup>
import { computed } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { useProductStore } from '@/stores/products'

const ordersStore = useOrdersStore()
const productStore = useProductStore()

// Ranking of catalog items by unit margin
const highMarginProducts = computed(() => {
  return [...productStore.items]
    .map(p => {
      const price = p.price || 0
      const cost = p.costPrice || Math.round(price * 0.45)
      const profit = Math.max(0, price - cost)
      const margin = price > 0 ? Math.round((profit / price) * 100) : 0
      return {
        ...p,
        computedCost: cost,
        computedProfit: profit,
        computedMargin: margin
      }
    })
    .sort((a, b) => b.computedProfit - a.computedProfit)
    .slice(0, 5)
})
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-300">
    
    <!-- Financial Overview Hero Card -->
    <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-10 shadow-[0_8px_30px_-10px_rgba(46,25,17,0.06)] space-y-8">
      <div class="border-b border-outline-variant pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-1">Auditoría Financiera</span>
          <h2 class="font-serif text-2xl sm:text-3xl text-primary font-normal">Métricas de Rentabilidad y Ganancias</h2>
          <p class="font-sans text-xs text-secondary mt-1">Análisis financiero en tiempo real de costos de adquisición vs ingresos netos por ventas.</p>
        </div>

        <div class="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-label uppercase font-bold text-emerald-800 shadow-2xs">
          Margen Promedio: {{ ordersStore.stats.overallProfitMargin }}%
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 sm:p-7 bg-surface-container/70 rounded-2xl border border-outline-variant space-y-2.5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div class="flex justify-between items-center">
            <span class="font-label text-xs uppercase tracking-widest text-secondary font-semibold">Ingresos Totales Brutos</span>
            <span class="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
          </div>
          <p class="font-sans text-3xl font-bold text-primary tracking-tight">
            ${{ ordersStore.stats.totalRevenue.toLocaleString('es-AR') }}
          </p>
          <p class="text-xs text-secondary">100% de la facturación en órdenes cobradas</p>
        </div>

        <div class="p-6 sm:p-7 bg-surface-container/70 rounded-2xl border border-outline-variant space-y-2.5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div class="flex justify-between items-center">
            <span class="font-label text-xs uppercase tracking-widest text-secondary font-semibold">Costos de Adquisición / Stock</span>
            <span class="material-symbols-outlined text-secondary text-xl">receipt</span>
          </div>
          <p class="font-sans text-3xl font-bold text-secondary tracking-tight">
            ${{ ordersStore.stats.totalCost.toLocaleString('es-AR') }}
          </p>
          <p class="text-xs text-secondary">Costo directo de los frascos vendidos</p>
        </div>

        <div class="p-6 sm:p-7 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-2.5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div class="flex justify-between items-center">
            <span class="font-label text-xs uppercase tracking-widest text-emerald-900 font-bold">Ganancia Neta en Mano</span>
            <span class="material-symbols-outlined text-emerald-800 text-xl">trending_up</span>
          </div>
          <p class="font-sans text-3xl font-bold text-emerald-900 tracking-tight">
            ${{ ordersStore.stats.totalProfit.toLocaleString('es-AR') }}
          </p>
          <p class="text-xs text-emerald-800 font-bold">Margen neto promedio: {{ ordersStore.stats.overallProfitMargin }}%</p>
        </div>
      </div>
    </div>

    <!-- Product Profitability Ranking -->
    <div class="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_-10px_rgba(46,25,17,0.06)] space-y-6">
      <div class="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h3 class="font-serif text-xl sm:text-2xl text-primary font-normal">Perfumes con Mayor Rendimiento Unitario</h3>
          <p class="font-sans text-xs text-secondary mt-0.5">Top fragancias con mayor ganancia neta estimada por cada frasco vendido.</p>
        </div>
        <span class="text-xs font-label uppercase tracking-widest text-secondary font-semibold hidden sm:inline">
          Top 5 del Catálogo
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div 
          v-for="p in highMarginProducts" 
          :key="p.id"
          class="p-4 bg-surface-container/50 border border-outline-variant rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div class="flex items-center gap-3">
            <img 
              :src="p.images?.[0] || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=200&q=80'" 
              :alt="p.name"
              class="w-12 h-14 object-cover rounded-lg border border-outline-variant flex-shrink-0 bg-surface shadow-2xs"
            />
            <div>
              <p class="font-medium text-primary text-xs leading-tight line-clamp-1">{{ p.name }}</p>
              <p class="text-[10px] text-secondary mt-0.5">{{ p.brand }}</p>
              <span class="text-[10px] font-bold text-emerald-850 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mt-1">
                {{ p.computedMargin }}% margen
              </span>
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            <span class="font-bold text-emerald-800 text-sm block">+${{ p.computedProfit.toLocaleString('es-AR') }}</span>
            <span class="text-[10px] text-secondary">Venta: ${{ (p.price || 0).toLocaleString('es-AR') }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
