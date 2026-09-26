<script setup>
import { ref, computed } from 'vue'
import { useProductStore } from '@/stores/products'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'imported'])

const productStore = useProductStore()
const toastStore = useToastStore()

const rawCsvText = ref('')
const selectedFileName = ref('')
const isParsing = ref(false)
const isImporting = ref(false)
const parsedRows = ref([])
const activeTab = ref('upload') // 'upload' | 'preview'
const importResults = ref(null)

// Parse CSV text supporting comma or semicolon
const parseCsv = (text) => {
  if (!text || !text.trim()) return []

  const lines = text
    .split(/\r\n|\n|\r/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length < 2) return []

  // Detect delimiter (, or ;)
  const firstLine = lines[0]
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = semicolonCount >= commaCount ? ';' : ','

  // Clean cell value
  const cleanCell = (val) => {
    if (!val) return ''
    let cleaned = val.trim()
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).replace(/""/g, '"')
    }
    return cleaned.trim()
  }

  const headers = firstLine.split(delimiter).map(h => cleanCell(h).toLowerCase())

  const findIndex = (possibleNames) => {
    return headers.findIndex(h => possibleNames.includes(h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  }

  const nameIdx = findIndex(['nombre', 'name', 'producto', 'perfume', 'titulo', 'title'])
  const brandIdx = findIndex(['marca', 'brand', 'casa', 'fabricante'])
  const genderIdx = findIndex(['genero', 'gender', 'sexo'])
  const categoryIdx = findIndex(['categoria', 'category', 'tipo'])
  const familyIdx = findIndex(['familia', 'family', 'familia olfativa', 'fragrancefamily'])
  const priceIdx = findIndex(['precio', 'price', 'precio lista', 'preciolista', 'precio_lista'])
  const transferIdx = findIndex(['transferencia', 'transferprice', 'precio transferencia', 'preciotransferencia', 'precio_transferencia', 'efectivo'])
  const costIdx = findIndex(['costo', 'costprice', 'precio costo', 'preciocosto', 'precio_costo', 'cost'])
  const stockIdx = findIndex(['stock', 'cantidad', 'unidades', 'inventory'])
  const sizeIdx = findIndex(['tamano', 'size', 'ml', 'volumen', 'presentacion'])
  const imageIdx = findIndex(['imagen', 'image', 'foto', 'img', 'url'])

  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter)
    if (rawCols.length < 2) continue

    const name = nameIdx !== -1 ? cleanCell(rawCols[nameIdx]) : ''
    const brand = brandIdx !== -1 ? cleanCell(rawCols[brandIdx]) : ''
    if (!name && !brand) continue

    const gender = genderIdx !== -1 ? cleanCell(rawCols[genderIdx]) : 'unisex'
    const category = categoryIdx !== -1 ? cleanCell(rawCols[categoryIdx]) : 'arabe'
    const fragranceFamily = familyIdx !== -1 ? cleanCell(rawCols[familyIdx]) : 'Amaderada Especiada'

    const parseNum = (val, fallback = 0) => {
      if (!val) return fallback
      const clean = val.replace(/[^0-9.,]/g, '').replace(',', '.')
      const num = parseFloat(clean)
      return isNaN(num) ? fallback : num
    }

    const price = priceIdx !== -1 ? parseNum(rawCols[priceIdx], 0) : 0
    let transferPrice = transferIdx !== -1 ? parseNum(rawCols[transferIdx], 0) : 0
    if (transferPrice <= 0 && price > 0) {
      transferPrice = Math.round(price * 0.8)
    }
    const costPrice = costIdx !== -1 ? parseNum(rawCols[costIdx], 0) : Math.round(transferPrice * 0.45)
    const stock = stockIdx !== -1 ? Math.max(0, parseInt(cleanCell(rawCols[stockIdx]), 10) || 10) : 10
    const sizeStr = sizeIdx !== -1 ? cleanCell(rawCols[sizeIdx]) : '100 ml'
    const imageUrl = imageIdx !== -1 ? cleanCell(rawCols[imageIdx]) : ''

    const isDecant = sizeStr.toLowerCase().includes('decant') || 
                     sizeStr.toLowerCase().includes('muestra') || 
                     (parseInt(sizeStr.replace(/\D/g, ''), 10) <= 15 && parseInt(sizeStr.replace(/\D/g, ''), 10) > 0)

    const isValid = Boolean(name && brand && price > 0)
    let errorMsg = ''
    if (!name) errorMsg = 'Falta el nombre'
    else if (!brand) errorMsg = 'Falta la marca'
    else if (price <= 0) errorMsg = 'El precio debe ser mayor a 0'

    rows.push({
      rowIndex: i,
      name,
      brand,
      gender: gender || 'unisex',
      category: category || 'arabe',
      fragranceFamily: fragranceFamily || 'Amaderada',
      price,
      transferPrice,
      costPrice,
      stock,
      size: sizeStr || '100 ml',
      image: imageUrl,
      isDecant,
      isValid,
      errorMsg
    })
  }

  return rows
}

// Handle file input
const handleFileUpload = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  selectedFileName.value = file.name
  isParsing.value = true

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const content = event.target?.result
      rawCsvText.value = content
      parsedRows.value = parseCsv(content)
      activeTab.value = 'preview'
      toastStore.show(`Se detectaron ${parsedRows.value.length} filas en el archivo CSV`, 'info')
    } catch (err) {
      toastStore.show('Error al leer el archivo CSV', 'error')
    } finally {
      isParsing.value = false
    }
  }
  reader.readAsText(file)
}

// Handle paste/manual parse
const handleParseManualText = () => {
  if (!rawCsvText.value.trim()) {
    toastStore.show('Por favor ingresá o pegá texto CSV', 'error')
    return
  }
  parsedRows.value = parseCsv(rawCsvText.value)
  if (parsedRows.value.length === 0) {
    toastStore.show('No se encontraron registros válidos en el CSV', 'error')
    return
  }
  activeTab.value = 'preview'
  toastStore.show(`Se detectaron ${parsedRows.value.length} registros`, 'info')
}

// Counts
const validRowsCount = computed(() => parsedRows.value.filter(r => r.isValid).length)
const invalidRowsCount = computed(() => parsedRows.value.filter(r => !r.isValid).length)

// Download CSV template
const downloadTemplate = () => {
  const headers = 'Nombre;Marca;Genero;Categoria;Familia Olfativa;Precio;Precio Transferencia;Precio Costo;Stock;Tamano\n'
  const samples = [
    'Khamrah Eau de Parfum;Lattafa;unisex;arabe;Amaderada Dulce;65000;52000;26000;12;100 ml',
    'Club de Nuit Intense Man;Armaf;hombre;arabe;Citrica Amaderada;59000;47200;23600;15;105 ml',
    'Asad Eau de Parfum;Lattafa;hombre;arabe;Oriental Especiada;48000;38400;19200;20;100 ml',
    'Yara Eau de Parfum;Lattafa;mujer;arabe;Floral Dulce;45000;36000;18000;18;100 ml',
    'Khamrah Decant 5ml;Lattafa;unisex;arabe;Amaderada Dulce;8500;6800;3400;30;5 ml (Decant)',
    'Sauvage Eau de Parfum;Dior;hombre;disenador;Aromatica Fougere;185000;148000;85000;8;100 ml'
  ].join('\n')

  const blob = new Blob([headers + samples], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'plantilla_perfumes_gicca.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toastStore.show('Plantilla descargada en tu dispositivo', 'success')
}

// Execute Bulk Import
const executeImport = async () => {
  const validItems = parsedRows.value.filter(r => r.isValid)
  if (validItems.length === 0) {
    toastStore.show('No hay registros válidos para importar', 'error')
    return
  }

  isImporting.value = true

  const productsPayload = validItems.map(item => {
    return {
      name: item.name,
      brand: item.brand,
      gender: item.gender,
      category: item.category,
      fragranceFamily: item.fragranceFamily,
      price: item.price,
      transferPrice: item.transferPrice,
      costPrice: item.costPrice,
      stock: item.stock,
      badge: item.isDecant ? 'Decant' : 'Nuevo Ingreso',
      images: item.image ? [item.image] : [
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85'
      ],
      sizes: [
        {
          size: item.size,
          price: item.price,
          transferPrice: item.transferPrice,
          costPrice: item.costPrice,
          default: true
        }
      ],
      shortDescription: `Perfume ${item.name} de ${item.brand}. Fragancia ${item.gender} 100% original.`,
      description: `Disfrutá de ${item.name}, una fragancia de la reconocida casa ${item.brand}. Formulada con materias primas de la más alta calidad y garantizada con batch code verificable.`
    }
  })

  try {
    const result = await productStore.bulkCreateProducts(productsPayload)
    if (result && result.success) {
      importResults.value = result
      toastStore.show(`¡${result.count} perfumes importados con éxito!`, 'success')
      emit('imported')
    } else {
      toastStore.show(result?.error || 'Error al procesar la importación masiva', 'error')
    }
  } catch (err) {
    toastStore.show(err.message || 'Error en la conexión con el servidor', 'error')
  } finally {
    isImporting.value = false
  }
}

const closeModal = () => {
  parsedRows.value = []
  rawCsvText.value = ''
  selectedFileName.value = ''
  importResults.value = null
  activeTab.value = 'upload'
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-primary/60 backdrop-blur-sm overflow-y-auto"
        @click.self="closeModal"
      >
        <div 
          class="bg-surface border border-outline-variant rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div class="p-5 sm:p-6 bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-start justify-between gap-4 flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-surface/15 border border-surface/20 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-2xl text-amber-300">upload_file</span>
              </div>
              <div>
                <div class="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2.5 py-0.5 rounded-full text-[10px] font-label uppercase tracking-widest font-bold mb-1">
                  <span>Carga Masiva de Productos</span>
                </div>
                <h3 class="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                  Importador Masivo CSV / Excel
                </h3>
              </div>
            </div>

            <button 
              @click="closeModal"
              class="w-9 h-9 rounded-full bg-surface/10 hover:bg-surface/20 flex items-center justify-center transition-colors text-on-primary flex-shrink-0 cursor-pointer"
            >
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- Subheader / Tabs -->
          <div class="px-6 py-3 bg-surface-container/60 border-b border-outline-variant flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
            <div class="flex items-center gap-2">
              <button
                @click="activeTab = 'upload'"
                class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                :class="activeTab === 'upload' ? 'bg-primary text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                1. Cargar Archivo
              </button>
              <button
                @click="activeTab = 'preview'"
                :disabled="parsedRows.length === 0"
                class="font-label text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                :class="activeTab === 'preview' ? 'bg-primary text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                2. Vista Previa ({{ parsedRows.length }})
              </button>
            </div>

            <button
              @click="downloadTemplate"
              class="text-xs font-label text-primary hover:text-primary-container font-bold flex items-center gap-1.5 cursor-pointer underline"
            >
              <span class="material-symbols-outlined text-sm">download</span>
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>

          <!-- Body -->
          <div class="p-5 sm:p-6 overflow-y-auto space-y-6 flex-grow text-primary">
            
            <!-- Success Results View -->
            <div v-if="importResults" class="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
              <span class="material-symbols-outlined text-5xl text-emerald-700">check_circle</span>
              <h4 class="font-serif text-2xl font-bold text-emerald-950">¡Importación Exitosa!</h4>
              <p class="text-xs text-emerald-900 max-w-md mx-auto">
                Se han añadido <strong>{{ importResults.count }}</strong> nuevos perfumes al catálogo de tu tienda con sus precios de transferencia, margen y tamaños configurados.
              </p>
              <div class="pt-2 flex justify-center gap-3">
                <button
                  @click="closeModal"
                  class="bg-emerald-800 text-white font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-full hover:bg-emerald-900 shadow-xs cursor-pointer"
                >
                  Ver Catálogo Actualizado
                </button>
              </div>
            </div>

            <!-- Tab 1: Upload / Input -->
            <div v-else-if="activeTab === 'upload'" class="space-y-6">
              <!-- File Drag & Drop / Input -->
              <div class="border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl p-8 text-center transition-all bg-surface-container/30 group">
                <span class="material-symbols-outlined text-5xl text-secondary group-hover:text-primary transition-colors mb-3">cloud_upload</span>
                <h4 class="font-sans font-bold text-base text-primary mb-1">
                  Seleccioná tu archivo CSV exportado desde Excel o Google Sheets
                </h4>
                <p class="text-xs text-secondary mb-4 max-w-md mx-auto">
                  Soporta delimitadores por coma (,) o punto y coma (;). Incluye columnas de Nombre, Marca, Precio, Costo, Stock y Presentación.
                </p>

                <label class="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl cursor-pointer shadow-xs transition-all active:scale-95">
                  <span class="material-symbols-outlined text-base">attach_file</span>
                  <span>Examinar Archivo</span>
                  <input type="file" accept=".csv, .txt" class="hidden" @change="handleFileUpload" />
                </label>

                <p v-if="selectedFileName" class="text-xs font-bold text-emerald-800 mt-3 flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  <span>Archivo cargado: {{ selectedFileName }}</span>
                </p>
              </div>

              <!-- Or Paste Text Directly -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="font-label text-xs uppercase tracking-wider text-primary font-bold">
                    O pegá el texto CSV / Tabla copiada:
                  </label>
                  <span class="text-[11px] text-secondary">
                    Separador por comas o punto y coma
                  </span>
                </div>
                <textarea 
                  v-model="rawCsvText"
                  rows="6"
                  placeholder="Nombre;Marca;Genero;Categoria;Familia Olfativa;Precio;Precio Transferencia;Precio Costo;Stock;Tamano&#10;Khamrah;Lattafa;unisex;arabe;Amaderada;65000;52000;26000;10;100 ml&#10;Club de Nuit;Armaf;hombre;arabe;Citrica;59000;47200;23600;12;105 ml"
                  class="w-full bg-surface-container/60 border border-outline-variant rounded-xl p-3 font-mono text-xs text-primary focus:border-primary focus:bg-surface focus:outline-none"
                ></textarea>
                <div class="flex justify-end">
                  <button
                    type="button"
                    @click="handleParseManualText"
                    class="bg-surface hover:bg-surface-container text-primary border border-outline-variant font-label text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span class="material-symbols-outlined text-sm">table_view</span>
                    <span>Procesar y Ver Vista Previa</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tab 2: Preview & Validation Table -->
            <div v-else-if="activeTab === 'preview'" class="space-y-4">
              <!-- Summary Counter Badges -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div class="p-3 bg-surface-container rounded-xl border border-outline-variant flex items-center gap-3">
                  <span class="material-symbols-outlined text-primary text-2xl">list_alt</span>
                  <div>
                    <span class="font-label text-[10px] uppercase text-secondary font-bold block">Total Filas</span>
                    <strong class="font-sans text-lg text-primary">{{ parsedRows.length }}</strong>
                  </div>
                </div>

                <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                  <span class="material-symbols-outlined text-emerald-800 text-2xl">check_circle</span>
                  <div>
                    <span class="font-label text-[10px] uppercase text-emerald-800 font-bold block">Listos para Importar</span>
                    <strong class="font-sans text-lg text-emerald-950">{{ validRowsCount }}</strong>
                  </div>
                </div>

                <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
                  <span class="material-symbols-outlined text-amber-800 text-2xl">warning</span>
                  <div>
                    <span class="font-label text-[10px] uppercase text-amber-800 font-bold block">Con Errores / Omitidos</span>
                    <strong class="font-sans text-lg text-amber-950">{{ invalidRowsCount }}</strong>
                  </div>
                </div>
              </div>

              <!-- Table Preview -->
              <div class="border border-outline-variant rounded-xl overflow-hidden shadow-2xs bg-surface max-h-[45vh] overflow-y-auto">
                <table class="w-full text-left text-xs font-sans">
                  <thead class="bg-surface-container font-label text-[10px] uppercase tracking-wider text-secondary border-b border-outline-variant sticky top-0 z-10">
                    <tr>
                      <th class="py-2.5 px-3">Estado</th>
                      <th class="py-2.5 px-3">Perfume & Marca</th>
                      <th class="py-2.5 px-3">Género / Cat</th>
                      <th class="py-2.5 px-3 text-right">Transferencia</th>
                      <th class="py-2.5 px-3 text-right">Lista</th>
                      <th class="py-2.5 px-3 text-right">Costo</th>
                      <th class="py-2.5 px-3 text-center">Tamaño</th>
                      <th class="py-2.5 px-3 text-center">Stock</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-outline-variant/60">
                    <tr 
                      v-for="(row, idx) in parsedRows" 
                      :key="idx"
                      class="hover:bg-surface-container/40 transition-colors"
                      :class="!row.isValid ? 'bg-amber-50/40 text-amber-950' : ''"
                    >
                      <td class="py-2 px-3">
                        <span 
                          v-if="row.isValid" 
                          class="inline-flex items-center gap-1 text-[10px] font-label font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full"
                        >
                          <span class="material-symbols-outlined text-[11px]">check</span>
                          <span>OK</span>
                        </span>
                        <span 
                          v-else 
                          class="inline-flex items-center gap-1 text-[10px] font-label font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full"
                          :title="row.errorMsg"
                        >
                          <span class="material-symbols-outlined text-[11px]">error</span>
                          <span>{{ row.errorMsg }}</span>
                        </span>
                      </td>

                      <td class="py-2 px-3 font-medium">
                        <div class="text-primary font-bold">{{ row.name }}</div>
                        <div class="text-[11px] text-secondary">{{ row.brand }}</div>
                      </td>

                      <td class="py-2 px-3 text-[11px]">
                        <span class="uppercase font-bold text-primary">{{ row.gender }}</span> • 
                        <span class="text-secondary">{{ row.category }}</span>
                      </td>

                      <td class="py-2 px-3 text-right font-bold text-emerald-800">
                        ${{ row.transferPrice.toLocaleString('es-AR') }}
                      </td>

                      <td class="py-2 px-3 text-right font-medium text-secondary">
                        ${{ row.price.toLocaleString('es-AR') }}
                      </td>

                      <td class="py-2 px-3 text-right text-secondary">
                        ${{ row.costPrice.toLocaleString('es-AR') }}
                      </td>

                      <td class="py-2 px-3 text-center">
                        <span 
                          class="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                          :class="row.isDecant ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-surface-container text-secondary'"
                        >
                          {{ row.size }}
                        </span>
                      </td>

                      <td class="py-2 px-3 text-center font-bold">
                        {{ row.stock }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="p-4 sm:p-5 bg-surface-container/80 border-t border-outline-variant flex items-center justify-between gap-3 flex-shrink-0">
            <button 
              type="button"
              @click="closeModal"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 text-secondary hover:text-primary cursor-pointer"
            >
              Cancelar
            </button>

            <div class="flex items-center gap-2">
              <button
                v-if="activeTab === 'preview' && !importResults"
                type="button"
                @click="activeTab = 'upload'"
                class="font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-primary cursor-pointer shadow-2xs"
              >
                Volver
              </button>

              <button
                v-if="activeTab === 'preview' && !importResults"
                type="button"
                @click="executeImport"
                :disabled="validRowsCount === 0 || isImporting"
                class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isImporting" class="material-symbols-outlined text-base animate-spin">progress_activity</span>
                <span>{{ isImporting ? 'Importando...' : `Confirmar e Importar ${validRowsCount} Perfumes` }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
