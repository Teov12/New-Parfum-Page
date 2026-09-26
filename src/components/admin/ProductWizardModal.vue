<script setup>
import { ref, computed, watch } from 'vue'
import { useProductStore } from '@/stores/products'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const productStore = useProductStore()
const toastStore = useToastStore()

const currentFormStep = ref(1)
const isSubmitting = ref(false)
const isUploadingImage = ref(false)

const steps = [
  { number: 1, title: 'General', subtitle: 'Datos principales' },
  { number: 2, title: 'Costos & Venta', subtitle: 'Precio y Ganancia' },
  { number: 3, title: 'Galería', subtitle: 'Fotos del frasco' },
  { number: 4, title: 'Pirámide', subtitle: 'Notas aromáticas' },
  { number: 5, title: 'Ficha', subtitle: 'Descripción y ritual' }
]

const longevityOptions = [
  '4 a 6 horas (Moderada)',
  '6 a 8 horas (Duradera)',
  '8 a 12 horas (Muy Duradera)',
  'Más de 12 horas (Extrema)'
]

const sillageOptions = [
  'Suave / Íntima (A flor de piel)',
  'Moderada (Radio de 1 metro)',
  'Pesada (De gran estela)',
  'Enorme / Bestial (Llena habitaciones)'
]

const seasonOptions = [
  'Todo el año',
  'Primavera',
  'Verano',
  'Otoño',
  'Invierno'
]

const defaultForm = () => ({
  id: '',
  name: '',
  brand: '',
  concentration: 'Eau de Parfum',
  gender: 'unisex',
  category: 'disenador',
  fragranceFamily: 'Amaderada',
  price: null,
  costPrice: null,
  originalPrice: 0,
  badge: '',
  isFeatured: false,
  isBestSeller: false,
  isNew: false,
  shortDescription: '',
  description: '',
  usageTips: '',
  stock: 10,
  images: [],
  sizes: [
    { size: 100, price: null, costPrice: null, default: true }
  ],
  olfactoryPyramid: {
    topNotes: [],
    heartNotes: [],
    baseNotes: []
  },
  characteristics: {
    longevity: '8 a 12 horas (Muy Duradera)',
    sillage: 'Moderada (Radio de 1 metro)',
    season: ['Todo el año'],
    occasion: ''
  }
})

const formData = ref(defaultForm())
const isEditing = computed(() => !!formData.value.id)

const topNoteInput = ref('')
const heartNoteInput = ref('')
const baseNoteInput = ref('')
const targetTransferPrice = ref(null)

watch(() => props.isOpen, (open) => {
  if (open) {
    currentFormStep.value = 1
    targetTransferPrice.value = null
    topNoteInput.value = ''
    heartNoteInput.value = ''
    baseNoteInput.value = ''

    if (props.product) {
      formData.value = JSON.parse(JSON.stringify(props.product))

      if (!formData.value.sizes || formData.value.sizes.length === 0) {
        formData.value.sizes = [{ size: 100, price: formData.value.price || null, costPrice: formData.value.costPrice || null, default: true }]
      } else {
        formData.value.sizes = formData.value.sizes.map((s, idx) => {
          let num = s.size
          if (typeof num === 'string') {
            const parsed = parseInt(num.replace(/\D/g, ''), 10)
            num = !isNaN(parsed) ? parsed : 100
          }
          return {
            size: num || 100,
            price: s.price || null,
            costPrice: s.costPrice !== undefined ? s.costPrice : Math.round((s.price || 0) * 0.45),
            default: idx === 0 || s.default === true
          }
        })
      }

      if (!formData.value.images) formData.value.images = []
      if (!formData.value.olfactoryPyramid) formData.value.olfactoryPyramid = { topNotes: [], heartNotes: [], baseNotes: [] }
      if (!formData.value.characteristics) {
        formData.value.characteristics = {
          longevity: '8 a 12 horas (Muy Duradera)',
          sillage: 'Moderada (Radio de 1 metro)',
          season: ['Todo el año'],
          occasion: ''
        }
      }
    } else {
      formData.value = defaultForm()
    }
  }
})

// Unit Profit calculations
const productUnitProfit = computed(() => {
  const price = Number(formData.value.sizes[0]?.price) || 0
  const cost = Number(formData.value.sizes[0]?.costPrice) || 0
  return Math.max(0, price - cost)
})

const productProfitMargin = computed(() => {
  const price = Number(formData.value.sizes[0]?.price) || 0
  const cost = Number(formData.value.sizes[0]?.costPrice) || 0
  if (price <= 0) return 0
  return Math.round(((price - cost) / price) * 100)
})

const calculateListPriceFromTransfer = () => {
  const target = Number(targetTransferPrice.value) || 0
  if (target > 0 && formData.value.sizes[0]) {
    const calculatedListPrice = Math.round(target / 0.8)
    formData.value.sizes[0].price = calculatedListPrice
    if (formData.value.price !== undefined) formData.value.price = calculatedListPrice
  }
}

// Navigation Step Controls
const goToNextStep = () => {
  if (currentFormStep.value === 1) {
    if (!formData.value.name || formData.value.name.trim().length < 2) {
      toastStore.show('Por favor ingresá un nombre válido para el perfume.', 'error')
      return
    }
    if (!formData.value.brand || formData.value.brand.trim().length < 2) {
      toastStore.show('Por favor ingresá la casa o marca del perfume.', 'error')
      return
    }
  }

  if (currentFormStep.value === 2) {
    const mainSize = formData.value.sizes[0]
    if (!mainSize || !mainSize.size) {
      toastStore.show('Debes especificar al menos un tamaño en ml.', 'error')
      return
    }
    if (!mainSize.price || Number(mainSize.price) <= 0) {
      toastStore.show('El precio de venta debe ser mayor a $0.', 'error')
      return
    }
    if (mainSize.costPrice === null || mainSize.costPrice === undefined || Number(mainSize.costPrice) < 0) {
      toastStore.show('Por favor ingresá un precio de costo válido (>= $0).', 'error')
      return
    }
  }

  if (currentFormStep.value < steps.length) {
    currentFormStep.value++
  }
}

const goToPrevStep = () => {
  if (currentFormStep.value > 1) {
    currentFormStep.value--
  }
}

const addSize = () => {
  formData.value.sizes.push({ size: 50, price: null, costPrice: null, default: false })
}

const removeSize = (index) => {
  if (formData.value.sizes.length > 1) {
    formData.value.sizes.splice(index, 1)
  }
}

const handleFileUpload = async (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return

  isUploadingImage.value = true
  const uploadData = new FormData()
  for (let i = 0; i < files.length; i++) {
    uploadData.append('images', files[i])
  }

  try {
    const token = localStorage.getItem('gicca_admin_token')
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: uploadData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al subir imágenes')

    if (data.urls && data.urls.length > 0) {
      formData.value.images.push(...data.urls)
      toastStore.show(`¡${data.urls.length} imagen(es) subida(s) con éxito!`, 'success')
    }
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isUploadingImage.value = false
    event.target.value = ''
  }
}

const removeImage = (index) => {
  formData.value.images.splice(index, 1)
}

// Notes helpers
const addTopNote = () => {
  if (topNoteInput.value.trim()) {
    formData.value.olfactoryPyramid.topNotes.push(topNoteInput.value.trim())
    topNoteInput.value = ''
  }
}
const removeTopNote = (idx) => formData.value.olfactoryPyramid.topNotes.splice(idx, 1)

const addHeartNote = () => {
  if (heartNoteInput.value.trim()) {
    formData.value.olfactoryPyramid.heartNotes.push(heartNoteInput.value.trim())
    heartNoteInput.value = ''
  }
}
const removeHeartNote = (idx) => formData.value.olfactoryPyramid.heartNotes.splice(idx, 1)

const addBaseNote = () => {
  if (baseNoteInput.value.trim()) {
    formData.value.olfactoryPyramid.baseNotes.push(baseNoteInput.value.trim())
    baseNoteInput.value = ''
  }
}
const removeBaseNote = (idx) => formData.value.olfactoryPyramid.baseNotes.splice(idx, 1)

const toggleSeason = (seasonName) => {
  if (!Array.isArray(formData.value.characteristics.season)) {
    formData.value.characteristics.season = []
  }
  const idx = formData.value.characteristics.season.indexOf(seasonName)
  if (idx > -1) {
    formData.value.characteristics.season.splice(idx, 1)
  } else {
    formData.value.characteristics.season.push(seasonName)
  }
}

const handleSubmitProduct = async () => {
  isSubmitting.value = true

  try {
    const validSizes = formData.value.sizes.filter(s => s.size && s.price).map((s, idx) => ({
      size: `${s.size} ml`,
      price: Number(s.price),
      costPrice: Number(s.costPrice) || Math.round(Number(s.price) * 0.45),
      default: idx === 0
    }))

    const mainPrice = validSizes[0]?.price || 0
    const mainCost = validSizes[0]?.costPrice || Math.round(mainPrice * 0.45)

    const payload = {
      ...formData.value,
      price: mainPrice,
      costPrice: mainCost,
      sizes: validSizes,
      images: formData.value.images.length > 0 
        ? formData.value.images 
        : ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85']
    }

    let res
    if (isEditing.value) {
      res = await productStore.updateProduct(payload.id, payload)
    } else {
      res = await (productStore.createProduct ? productStore.createProduct(payload) : productStore.addProduct(payload))
    }

    if (res && (res.id || res.success)) {
      toastStore.show(isEditing.value ? '¡Perfume actualizado con éxito!' : '¡Perfume publicado en la tienda!', 'success')
      emit('saved')
      emit('close')
    } else {
      toastStore.show('Error al guardar el perfume en el catálogo', 'error')
    }
  } catch (err) {
    toastStore.show(err.message || 'Error inesperado al publicar', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)] p-6 sm:p-8 space-y-6">
          
          <!-- Header -->
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-0.5">Gestión de Catálogo</span>
              <h2 class="font-serif text-2xl text-primary font-bold">
                {{ isEditing ? 'Editar Fragancia' : 'Crear Nueva Fragancia' }}
              </h2>
              <p class="font-sans text-xs text-secondary mt-0.5">Paso {{ currentFormStep }} de {{ steps.length }}: {{ steps[currentFormStep - 1]?.subtitle }}</p>
            </div>
            <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-all">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- Wizard Stepper Indicators -->
          <div class="grid grid-cols-5 gap-2 py-1">
            <div 
              v-for="st in steps" 
              :key="st.number"
              class="p-2.5 rounded-xl border text-center transition-all cursor-pointer"
              :class="currentFormStep === st.number ? 'bg-primary text-on-primary border-primary font-bold shadow-xs' : (currentFormStep > st.number ? 'bg-surface-container text-primary border-outline-variant font-medium' : 'bg-surface text-secondary/60 border-outline-variant/60')"
              @click="currentFormStep = st.number"
            >
              <span class="text-[10px] font-label uppercase block tracking-wider">{{ st.title }}</span>
            </div>
          </div>

          <!-- STEP 1: General Info -->
          <div v-if="currentFormStep === 1" class="space-y-4 animate-in fade-in">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Nombre de la Fragancia *</label>
                <input v-model="formData.name" type="text" placeholder="Ej. Baccarat Rouge 540" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Marca / Casa Perfumista *</label>
                <input v-model="formData.brand" type="text" placeholder="Ej. Maison Francis Kurkdjian" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Concentración</label>
                <select v-model="formData.concentration" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all">
                  <option>Eau de Parfum</option>
                  <option>Extrait de Parfum</option>
                  <option>Eau de Toilette</option>
                  <option>Elixir</option>
                  <option>Parfum</option>
                </select>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Género</label>
                <select v-model="formData.gender" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all">
                  <option value="unisex">Unisex</option>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                </select>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Categoría</label>
                <select v-model="formData.category" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all">
                  <option value="disenador">Diseñador</option>
                  <option value="nicho">Nicho</option>
                  <option value="arabe">Árabe</option>
                </select>
              </div>
            </div>
          </div>

          <!-- STEP 2: Cost, Price & Sizes (With Profit Widget) -->
          <div v-if="currentFormStep === 2" class="space-y-4 animate-in fade-in">
            <div class="bg-surface-container/40 p-5 rounded-2xl border border-outline-variant space-y-4">
              <div class="flex justify-between items-center">
                <label class="font-label text-xs uppercase tracking-widest text-primary font-bold">Tamaño, Venta y Costo</label>
                <button @click="addSize" type="button" class="text-xs font-label uppercase tracking-wider text-primary hover:text-primary-container underline transition-colors">+ Agregar otra medida</button>
              </div>

              <div 
                v-for="(sizeObj, idx) in formData.sizes" 
                :key="idx"
                class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-surface p-4 rounded-xl border border-outline-variant shadow-2xs"
              >
                <!-- Size input -->
                <div class="sm:col-span-3">
                  <label class="block text-[10px] font-label uppercase tracking-wider text-secondary mb-1">Volumen (ml)</label>
                  <div class="flex items-center gap-1.5">
                    <input v-model.number="sizeObj.size" type="number" placeholder="100" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-2.5 text-xs font-sans text-center focus:border-primary focus:outline-none" />
                    <span class="text-xs text-secondary font-bold">ml</span>
                  </div>
                </div>

                <!-- Sale price -->
                <div class="sm:col-span-4">
                  <label class="block text-[10px] font-label uppercase tracking-wider text-secondary mb-1">Precio Lista / Cuotas ($ ARS) *</label>
                  <input v-model.number="sizeObj.price" type="number" placeholder="87500" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-2.5 text-xs font-sans font-bold text-primary focus:border-primary focus:outline-none" />
                  <div class="mt-1.5 space-y-0.5 text-[10px]">
                    <span class="text-emerald-800 font-semibold block">
                      🏦 Transferencia (-20%): ${{ Math.round((sizeObj.price || 0) * 0.8).toLocaleString('es-AR') }}
                    </span>
                    <span class="text-secondary block">
                      💳 3 cuotas s/int: ${{ Math.round((sizeObj.price || 0) / 3).toLocaleString('es-AR') }}
                    </span>
                  </div>
                </div>

                <!-- Cost price -->
                <div class="sm:col-span-4">
                  <label class="block text-[10px] font-label uppercase tracking-wider text-secondary mb-1">Precio Costo ($ ARS) *</label>
                  <input v-model.number="sizeObj.costPrice" type="number" placeholder="82000" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-2.5 text-xs font-sans text-secondary focus:border-primary focus:outline-none" />
                </div>

                <!-- Remove button -->
                <div class="sm:col-span-1 text-right">
                  <button v-if="formData.sizes.length > 1" @click="removeSize(idx)" type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-red-700 hover:bg-red-50 transition-colors">
                    <span class="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>

              <!-- Calculadora Inversa Transferencia -> Precio Lista Cuotas -->
              <div class="p-4 bg-surface-container/70 rounded-xl border border-outline-variant space-y-2.5 mt-2">
                <div class="flex items-center gap-2 text-xs text-primary font-bold">
                  <span class="material-symbols-outlined text-base text-primary">calculate</span>
                  <span>Asistente de Precios: ¿Cuánto querés cobrar por Transferencia?</span>
                </div>
                <p class="text-[11px] text-secondary leading-relaxed">
                  Ingresá tu precio deseado en transferencia (ej: $70.000). Se calculará automáticamente el precio de lista ($87.500) para ofrecer cuotas sin interés y que en transferencia quede en tu precio objetivo.
                </p>
                <div class="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center pt-1">
                  <div class="relative w-full sm:w-56">
                    <span class="absolute left-3 top-2.5 text-xs text-secondary font-bold">$</span>
                    <input 
                      v-model.number="targetTransferPrice" 
                      type="number" 
                      placeholder="Ej. 70000" 
                      class="w-full bg-surface border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs font-sans text-primary font-bold focus:border-primary focus:outline-none"
                      @keyup.enter="calculateListPriceFromTransfer"
                    />
                  </div>
                  <button 
                    type="button" 
                    @click="calculateListPriceFromTransfer" 
                    class="bg-primary hover:bg-primary-container text-on-primary font-label text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all flex-shrink-0 border border-primary/20 shadow-xs active:scale-95"
                  >
                    Fijar Precio de Lista ({{ targetTransferPrice ? `$${Math.round(targetTransferPrice / 0.8).toLocaleString('es-AR')}` : '...' }})
                  </button>
                </div>
              </div>

              <!-- Live Profit Preview Widget -->
              <div class="bg-emerald-50/90 border border-emerald-200/80 p-4 rounded-xl flex justify-between items-center mt-3 shadow-2xs">
                <div>
                  <span class="font-label text-xs uppercase font-bold text-emerald-900 block">Rentabilidad por Frasco:</span>
                  <span class="text-xs text-emerald-800 font-medium">Ganancia calculada automáticamente por unidad vendida.</span>
                </div>
                <div class="text-right">
                  <span class="font-bold text-lg text-emerald-900 block">+${{ productUnitProfit.toLocaleString('es-AR') }}</span>
                  <span class="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    {{ productProfitMargin }}% Margen
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 3: Gallery -->
          <div v-if="currentFormStep === 3" class="space-y-4 animate-in fade-in">
            <div class="bg-surface-container/40 p-8 rounded-2xl border-2 border-dashed border-outline-variant/80 text-center space-y-3">
              <span class="material-symbols-outlined text-4xl text-secondary">cloud_upload</span>
              <div>
                <p class="font-sans text-sm font-medium text-primary">Cargar Fotos desde tu Computadora</p>
                <p class="text-xs text-secondary mt-1">Formato JPG, PNG o WEBP (Opcional)</p>
              </div>
              <label class="inline-block bg-surface border border-outline-variant hover:border-primary text-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl cursor-pointer hover:bg-surface-container transition-all shadow-2xs">
                <span>Seleccionar Archivos</span>
                <input type="file" multiple accept="image/*" @change="handleFileUpload" class="hidden" />
              </label>
            </div>

            <!-- Uploaded images preview -->
            <div v-if="formData.images.length > 0" class="grid grid-cols-4 gap-3 pt-2">
              <div v-for="(img, idx) in formData.images" :key="idx" class="relative aspect-square rounded-xl border border-outline-variant overflow-hidden group shadow-2xs">
                <img :src="img" class="w-full h-full object-cover" />
                <button @click="removeImage(idx)" type="button" class="absolute top-1.5 right-1.5 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 shadow-xs">
                  <span class="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            </div>
          </div>

          <!-- STEP 4: Pyramid -->
          <div v-if="currentFormStep === 4" class="space-y-4 animate-in fade-in">
            <!-- Top Notes -->
            <div class="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-2.5">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Salida</label>
              <div class="flex gap-2">
                <input v-model="topNoteInput" @keyup.enter="addTopNote" type="text" placeholder="Ej. Bergamota, Azafrán..." class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs font-sans focus:border-primary focus:outline-none" />
                <button @click="addTopNote" type="button" class="bg-surface border border-outline-variant hover:border-primary font-label text-xs px-4 py-2 rounded-xl uppercase tracking-wider text-primary hover:bg-surface-container transition-colors">Agregar</button>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <span v-for="(n, idx) in formData.olfactoryPyramid.topNotes" :key="idx" class="bg-surface border border-outline-variant px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-medium shadow-2xs">
                  {{ n }}
                  <span @click="removeTopNote(idx)" class="material-symbols-outlined text-xs cursor-pointer hover:text-red-700 transition-colors">close</span>
                </span>
              </div>
            </div>

            <!-- Heart Notes -->
            <div class="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-2.5">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Corazón</label>
              <div class="flex gap-2">
                <input v-model="heartNoteInput" @keyup.enter="addHeartNote" type="text" placeholder="Ej. Jazmín de Grasse, Cedro..." class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs font-sans focus:border-primary focus:outline-none" />
                <button @click="addHeartNote" type="button" class="bg-surface border border-outline-variant hover:border-primary font-label text-xs px-4 py-2 rounded-xl uppercase tracking-wider text-primary hover:bg-surface-container transition-colors">Agregar</button>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <span v-for="(n, idx) in formData.olfactoryPyramid.heartNotes" :key="idx" class="bg-surface border border-outline-variant px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-medium shadow-2xs">
                  {{ n }}
                  <span @click="removeHeartNote(idx)" class="material-symbols-outlined text-xs cursor-pointer hover:text-red-700 transition-colors">close</span>
                </span>
              </div>
            </div>

            <!-- Base Notes -->
            <div class="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-2.5">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Fondo</label>
              <div class="flex gap-2">
                <input v-model="baseNoteInput" @keyup.enter="addBaseNote" type="text" placeholder="Ej. Ámbar gris, Almizcle, Vainilla..." class="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs font-sans focus:border-primary focus:outline-none" />
                <button @click="addBaseNote" type="button" class="bg-surface border border-outline-variant hover:border-primary font-label text-xs px-4 py-2 rounded-xl uppercase tracking-wider text-primary hover:bg-surface-container transition-colors">Agregar</button>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <span v-for="(n, idx) in formData.olfactoryPyramid.baseNotes" :key="idx" class="bg-surface border border-outline-variant px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-medium shadow-2xs">
                  {{ n }}
                  <span @click="removeBaseNote(idx)" class="material-symbols-outlined text-xs cursor-pointer hover:text-red-700 transition-colors">close</span>
                </span>
              </div>
            </div>
          </div>

          <!-- STEP 5: Specs & Description -->
          <div v-if="currentFormStep === 5" class="space-y-4 animate-in fade-in">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Duración en Piel</label>
                <select v-model="formData.characteristics.longevity" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none">
                  <option v-for="opt in longevityOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Estela / Proyección</label>
                <select v-model="formData.characteristics.sillage" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none">
                  <option v-for="opt in sillageOptions" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <!-- Season Multi-select -->
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-2">Estación Ideal (Multi-selección)</label>
              <div class="flex flex-wrap gap-2">
                <button 
                  v-for="s in seasonOptions" 
                  :key="s"
                  type="button"
                  @click="toggleSeason(s)"
                  class="px-4 py-1.5 rounded-full text-xs font-label uppercase tracking-wider border transition-all"
                  :class="formData.characteristics.season?.includes(s) ? 'bg-primary text-on-primary border-primary font-bold shadow-xs' : 'bg-surface text-secondary border-outline-variant hover:border-primary/50'"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Descripción de la Fragancia</label>
              <textarea v-model="formData.description" rows="3" placeholder="Una creación opulenta y envolvente..." class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none"></textarea>
            </div>
          </div>

          <!-- Wizard Navigation Footer -->
          <div class="flex justify-between items-center border-t border-outline-variant pt-4">
            <button 
              v-if="currentFormStep > 1" 
              @click="goToPrevStep" 
              type="button" 
              class="px-5 py-2.5 text-xs font-label uppercase tracking-wider rounded-xl border border-outline-variant text-secondary hover:text-primary hover:bg-surface-container transition-colors"
            >
              ← Anterior
            </button>
            <div v-else></div>

            <button 
              v-if="currentFormStep < steps.length" 
              @click="goToNextStep" 
              type="button" 
              class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-8 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md border border-primary/20"
            >
              Siguiente →
            </button>

            <button 
              v-else 
              @click="handleSubmitProduct" 
              :disabled="isSubmitting"
              type="button" 
              class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-8 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md border border-primary/20 disabled:opacity-50"
            >
              <span>{{ isSubmitting ? 'Publicando...' : (isEditing ? 'Guardar Cambios' : 'Publicar Perfume') }}</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
