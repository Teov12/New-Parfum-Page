<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const info = ref({ name: 'Perfumerías Online', trialDays: 14, plans: [], supportEmail: '', demoStores: [] })
const openingPanel = ref('')

// Entorno demo: abre el panel de una tienda de ejemplo sin contraseña
const openDemoPanel = async (store) => {
  openingPanel.value = store.tenantId
  try {
    const res = await fetch('/api/platform/demo-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: store.tenantId })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo abrir el panel')
    window.open(data.adminUrl, '_blank', 'noopener')
  } catch (err) {
    alert(err.message)
  } finally {
    openingPanel.value = ''
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/platform/info')
    if (res.ok) {
      info.value = await res.json()
      document.title = `${info.value.name} | Creá la tienda online de tu perfumería`
    }
  } catch {
    // La landing funciona con los textos por defecto
  }
})

const formatPrice = (value) => `$${Number(value || 0).toLocaleString('es-AR')}`

const features = [
  { icon: 'local_florist', title: 'Pirámides olfativas', text: 'Notas de salida, corazón y fondo, familias olfativas y buscador por notas. Tu catálogo se ve como el de una casa de alta perfumería.' },
  { icon: 'quiz', title: 'Test de perfume ideal', text: 'Un quiz que recomienda fragancias según gustos y ocasión. Convierte curiosos en compradores.' },
  { icon: 'credit_card', title: 'Mercado Pago y transferencia', text: 'Cobrá con tarjeta en cuotas o con descuento por transferencia. Conectás tu cuenta en un clic.' },
  { icon: 'local_shipping', title: 'Envíos con Andreani', text: 'Cotización por código postal, retiro en sucursal, envío gratis desde el monto que elijas y métodos propios.' },
  { icon: 'monitoring', title: 'Finanzas y márgenes', text: 'Costo, ganancia y margen por venta. Ajustes masivos de precios cuando sube el dólar.' },
  { icon: 'inventory_2', title: 'Stock y decants', text: 'Inventario por presentación (100 ml, 50 ml, decants) con reserva automática al vender.' },
  { icon: 'language', title: 'Tu marca, tu dominio', text: 'Colores, logo y dominio propio con certificado SSL incluido. Tus clientes ven solo tu tienda.' },
  { icon: 'receipt', title: 'Facturación ARCA', text: 'Emití facturas electrónicas de tus ventas desde el panel (planes Profesional y superiores).' }
]

const faqs = [
  { q: '¿Necesito saber programar?', a: 'No. Elegís el nombre, cargás tus perfumes (o arrancás con un catálogo sugerido) y conectás Mercado Pago desde el panel.' },
  { q: '¿Cobran comisión por venta?', a: 'El plan es un abono mensual fijo. Mercado Pago cobra sus comisiones habituales directamente a tu cuenta.' },
  { q: '¿Puedo usar mi propio dominio?', a: 'Sí, desde el plan Profesional. Mientras tanto tu tienda funciona en un subdominio de la plataforma.' },
  { q: '¿Qué pasa cuando termina la prueba?', a: 'Elegís un plan y lo pagás con Mercado Pago. Si no, la tienda se pausa (no se borra nada) hasta que lo actives.' }
]
</script>

<template>
  <div class="min-h-screen bg-[#11100F] text-[#F3EFEA] font-sans selection:bg-amber-600 selection:text-white">
    <!-- Header -->
    <header class="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
          <span class="material-symbols-outlined text-xl">spa</span>
        </span>
        <span class="font-serif text-lg tracking-wide">{{ info.name }}</span>
      </div>
      <nav class="flex items-center gap-2 sm:gap-4 text-xs font-label uppercase tracking-wider">
        <a href="#planes" class="hidden sm:inline text-white/70 hover:text-white">Planes</a>
        <RouterLink to="/admin/login" class="text-white/70 hover:text-white">Ingresar</RouterLink>
        <RouterLink to="/crear-tienda" class="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-[#11100F] font-bold">Crear tienda</RouterLink>
      </nav>
    </header>

    <!-- Hero -->
    <section class="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-28 grid lg:grid-cols-2 gap-12 items-center">
      <div class="space-y-6">
        <span class="inline-block text-[11px] font-label uppercase tracking-[0.25em] text-amber-300/90 border border-amber-500/30 rounded-full px-3 py-1">
          Hecho para perfumerías
        </span>
        <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
          La tienda online que tu perfumería se merece.
        </h1>
        <p class="text-base sm:text-lg text-white/70 leading-relaxed max-w-xl">
          Vendé perfumes de diseñador, árabes y decants con una vidriera de alta perfumería, cobros con Mercado Pago y envíos con Andreani. Lista en minutos.
        </p>
        <div class="flex flex-col sm:flex-row gap-3">
          <RouterLink to="/crear-tienda" class="inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-[#11100F] font-label text-xs uppercase tracking-widest font-bold">
            Probar gratis {{ info.trialDays }} días
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </RouterLink>
          <a :href="info.demoStores?.length ? '#demo' : '#funciones'" class="inline-flex justify-center items-center px-6 py-3.5 rounded-full border border-white/15 hover:border-white/40 font-label text-xs uppercase tracking-widest">
            {{ info.demoStores?.length ? 'Ver tiendas de ejemplo' : 'Ver funciones' }}
          </a>
        </div>
        <p class="text-xs text-white/40">Sin tarjeta para empezar. Cancelás cuando quieras.</p>
      </div>

      <div class="relative">
        <div class="absolute -inset-6 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div class="relative bg-[#1B1917] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
          <div class="flex items-center justify-between text-xs text-white/50">
            <span>Panel de tu tienda</span>
            <span class="inline-flex items-center gap-1.5 text-emerald-400"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>En vivo</span>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white/5 rounded-xl p-3"><p class="text-[10px] uppercase text-white/40">Ventas hoy</p><p class="text-lg font-bold">$412.300</p></div>
            <div class="bg-white/5 rounded-xl p-3"><p class="text-[10px] uppercase text-white/40">Margen</p><p class="text-lg font-bold text-emerald-400">38%</p></div>
            <div class="bg-white/5 rounded-xl p-3"><p class="text-[10px] uppercase text-white/40">Pedidos</p><p class="text-lg font-bold">9</p></div>
          </div>
          <div class="space-y-2">
            <div v-for="row in [['Khamrah EDP 100 ml', 'Pagado'], ['Bleu de Chanel 50 ml', 'Preparando'], ['Decant Yara 10 ml', 'Enviado']]" :key="row[0]" class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 text-xs">
              <span class="text-white/80">{{ row[0] }}</span>
              <span class="text-amber-300">{{ row[1] }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tiendas de ejemplo (entorno demo) -->
    <section v-if="info.demoStores?.length" id="demo" class="border-t border-white/10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 class="font-serif text-3xl sm:text-4xl text-center mb-3">Mirá tiendas funcionando</h2>
        <p class="text-center text-white/60 mb-12 max-w-2xl mx-auto">Recorré la vidriera como un cliente y entrá al panel como si fueras el dueño: cargá perfumes, mirá las ventas y cambiá el diseño. Todo se reinicia solo.</p>
        <div class="grid md:grid-cols-3 gap-5">
          <div v-for="store in info.demoStores" :key="store.tenantId" class="bg-[#1B1917] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div class="h-24 flex items-center justify-center" :style="{ backgroundColor: store.primaryColor }">
              <span class="material-symbols-outlined text-4xl text-amber-200">{{ store.storeIcon }}</span>
            </div>
            <div class="p-5 space-y-1 flex-1">
              <h3 class="font-serif text-xl">{{ store.name }}</h3>
              <p class="text-xs text-white/60">{{ store.tagline }}</p>
            </div>
            <div class="p-5 pt-0 grid grid-cols-2 gap-2">
              <a :href="store.storeUrl" target="_blank" rel="noopener" class="text-center px-3 py-2.5 rounded-full border border-white/20 hover:border-white/50 font-label text-[11px] uppercase tracking-widest">
                Ver tienda
              </a>
              <button type="button" @click="openDemoPanel(store)" :disabled="openingPanel === store.tenantId" class="px-3 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-[#11100F] font-label text-[11px] uppercase tracking-widest font-bold disabled:opacity-50">
                {{ openingPanel === store.tenantId ? 'Abriendo...' : 'Ver el panel' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="funciones" class="border-t border-white/10 bg-[#151311]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 class="font-serif text-3xl sm:text-4xl text-center mb-3">Todo lo que una perfumería necesita</h2>
        <p class="text-center text-white/60 mb-12 max-w-2xl mx-auto">No es una tienda genérica: está pensada para vender fragancias.</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="f in features" :key="f.title" class="bg-[#1B1917] border border-white/10 rounded-2xl p-5 space-y-2">
            <span class="material-symbols-outlined text-amber-300 text-2xl">{{ f.icon }}</span>
            <h3 class="font-bold text-sm">{{ f.title }}</h3>
            <p class="text-xs text-white/60 leading-relaxed">{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="planes" class="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <h2 class="font-serif text-3xl sm:text-4xl text-center mb-3">Planes simples, en pesos</h2>
      <p class="text-center text-white/60 mb-12">Empezá con {{ info.trialDays }} días gratis en cualquier plan.</p>
      <div class="grid md:grid-cols-3 gap-5">
        <div
          v-for="plan in info.plans"
          :key="plan.id"
          class="rounded-2xl p-6 border flex flex-col"
          :class="plan.id === 'pro' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-[#1B1917] border-white/10'"
        >
          <div class="flex items-center justify-between">
            <h3 class="font-serif text-xl">{{ plan.name }}</h3>
            <span v-if="plan.id === 'pro'" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-[#11100F]">Más elegido</span>
          </div>
          <p class="mt-4"><span class="text-3xl font-bold">{{ formatPrice(plan.price) }}</span><span class="text-white/50 text-sm"> /mes</span></p>
          <ul class="mt-5 space-y-2 text-sm text-white/75 flex-1">
            <li v-for="feature in plan.features" :key="feature" class="flex gap-2">
              <span class="material-symbols-outlined text-amber-300 text-base">check</span>{{ feature }}
            </li>
          </ul>
          <RouterLink
            :to="{ path: '/crear-tienda', query: { plan: plan.id } }"
            class="mt-6 text-center px-5 py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold"
            :class="plan.id === 'pro' ? 'bg-amber-500 hover:bg-amber-400 text-[#11100F]' : 'border border-white/20 hover:border-white/50'"
          >
            Empezar prueba gratis
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-white/10 bg-[#151311]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-20 space-y-4">
        <h2 class="font-serif text-3xl text-center mb-8">Preguntas frecuentes</h2>
        <details v-for="item in faqs" :key="item.q" class="bg-[#1B1917] border border-white/10 rounded-xl p-5 group">
          <summary class="cursor-pointer font-bold text-sm list-none flex justify-between items-center">
            {{ item.q }}
            <span class="material-symbols-outlined text-white/50 group-open:rotate-180 transition-transform">expand_more</span>
          </summary>
          <p class="mt-3 text-sm text-white/65 leading-relaxed">{{ item.a }}</p>
        </details>
      </div>
    </section>

    <footer class="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-xs text-white/40 flex flex-col sm:flex-row justify-between gap-3">
      <span>© {{ new Date().getFullYear() }} {{ info.name }}</span>
      <a v-if="info.supportEmail" :href="`mailto:${info.supportEmail}`" class="hover:text-white">{{ info.supportEmail }}</a>
    </footer>
  </div>
</template>
