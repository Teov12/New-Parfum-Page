<script setup>
import { ref, computed, watch } from 'vue'
import { useSiteContentStore } from '@/stores/siteContent'
import { useToastStore } from '@/stores/toast'
import { useProductStore } from '@/stores/products'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  slide: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const siteContentStore = useSiteContentStore()
const toastStore = useToastStore()
const productStore = useProductStore()

const isSubmittingSlide = ref(false)
const slideForm = ref({
  id: '',
  tag: '',
  title: '',
  highlight: '',
  description: '',
  image: '',
  bottleImage: '',
  featuredTitle: '',
  featuredSub: '',
  featuredRating: '5.0 ★ Destacado',
  primaryCtaText: 'Explorar Catálogo',
  primaryCtaLink: '/catalogo',
  secondaryCtaText: 'Test de Fragancia',
  secondaryCtaLink: '/quiz'
})

const isEditingSlide = computed(() => !!slideForm.value.id)

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.slide) {
      slideForm.value = {
        ...props.slide,
        featuredTitle: props.slide.featuredTitle || '',
        featuredSub: props.slide.featuredSub || '',
        featuredRating: props.slide.featuredRating || '5.0 ★ Destacado'
      }
    } else {
      slideForm.value = {
        id: `slide_${Date.now()}`,
        tag: '',
        title: 'Nueva Fragancia',
        highlight: 'exclusiva.',
        description: 'Descripción cautivadora del perfume o promoción.',
        image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2000&q=85',
        bottleImage: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=85',
        featuredTitle: 'YSL Libre Eau de Parfum',
        featuredSub: 'Notas de Lavanda, Azahar & Vainilla',
        featuredRating: '5.0 ★ Exclusivo',
        primaryCtaText: 'Explorar Catálogo',
        primaryCtaLink: '/catalogo',
        secondaryCtaText: 'Test de Fragancia',
        secondaryCtaLink: '/quiz'
      }
    }
  }
})

const onSelectProductForSlide = (event) => {
  const prodId = event.target.value
  if (!prodId) return
  const prod = productStore.items.find(p => p.id === prodId || p._id === prodId)
  if (prod) {
    slideForm.value.featuredTitle = `${prod.brand ? prod.brand + ' ' : ''}${prod.name}`.trim()
    if (prod.fragranceFamily) {
      slideForm.value.featuredSub = `Familia ${prod.fragranceFamily} • ${prod.concentration || 'Eau de Parfum'}`
    }
    if (prod.images && prod.images.length > 0 && !slideForm.value.bottleImage) {
      slideForm.value.bottleImage = prod.images[0]
    }
  }
}

const handleModalImageUpload = async (targetObj, fieldKey, event) => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    toastStore.show('Subiendo imagen...', 'info')
    const url = await siteContentStore.uploadImage(file)
    targetObj[fieldKey] = url
    toastStore.show('¡Imagen cargada en el formulario!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al subir imagen', 'error')
  } finally {
    event.target.value = ''
  }
}

const handleSaveSlide = async () => {
  if (!slideForm.value.title.trim()) {
    toastStore.show('Por favor ingresá un título principal para el slide', 'error')
    return
  }
  isSubmittingSlide.value = true
  try {
    const slides = [...siteContentStore.heroSlides]
    const idx = slides.findIndex(s => s.id === slideForm.value.id)
    if (idx !== -1) {
      slides[idx] = { ...slideForm.value }
    } else {
      slides.push({ ...slideForm.value })
    }
    await siteContentStore.saveFullContent({ heroSlides: slides })
    toastStore.show('¡Diapositiva del banner guardada!', 'success')
    emit('saved')
    emit('close')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar slide', 'error')
  } finally {
    isSubmittingSlide.value = false
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
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-2xl w-full max-h-[96vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)] p-4 sm:p-8 space-y-4 sm:space-y-5">
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-0.5">Diseño Web</span>
              <h3 class="font-serif text-xl sm:text-2xl text-primary font-bold">
                {{ isEditingSlide ? 'Editar Diapositiva de Portada' : 'Nuevo Slide de Portada' }}
              </h3>
            </div>
            <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-all">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <form @submit.prevent="handleSaveSlide" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Etiqueta Superior (Tag)</label>
                <input v-model="slideForm.tag" type="text" placeholder="Ej. 100% Originales & Sellados" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Rating / Badge del Frasco</label>
                <input v-model="slideForm.featuredRating" type="text" placeholder="Ej. 4.9 ★ Exclusivo" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Título Principal *</label>
                <input v-model="slideForm.title" type="text" required placeholder="Ej. Encontrá tu nueva" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Texto en Cursiva / Resalte</label>
                <input v-model="slideForm.highlight" type="text" placeholder="Ej. fragancia favorita." class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans italic focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Bajada / Descripción</label>
              <textarea v-model="slideForm.description" rows="2" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all"></textarea>
            </div>

            <!-- Perfume Destacado en la Tarjeta Flotante (Showcase Card) -->
            <div class="bg-surface-container/60 p-4 sm:p-5 rounded-2xl border border-outline-variant space-y-3">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">
                    Tarjeta del Frasco Destacado (Card del Banner)
                  </label>
                  <p class="text-[11px] text-secondary font-sans mt-0.5">
                    Modificá el título y notas que aparecen en la tarjeta del perfume (ej: YSL Libre, Bleu de Chanel).
                  </p>
                </div>
                <div v-if="productStore.items && productStore.items.length > 0" class="flex items-center gap-1.5 flex-shrink-0">
                  <span class="text-[10px] font-label uppercase text-secondary font-bold">Catálogo:</span>
                  <select 
                    @change="onSelectProductForSlide($event)" 
                    class="bg-surface border border-outline-variant rounded-xl px-2.5 py-1.5 text-xs font-sans text-primary focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Autocompletar desde producto --</option>
                    <option v-for="prod in productStore.items" :key="prod.id || prod._id" :value="prod.id || prod._id">
                      {{ prod.name }} ({{ prod.brand }})
                    </option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label class="block font-label text-[11px] uppercase tracking-wider text-primary font-bold mb-1">
                    Título de la Card (Nombre del Perfume) *
                  </label>
                  <input 
                    v-model="slideForm.featuredTitle" 
                    type="text" 
                    required 
                    placeholder="Ej. YSL Libre Eau de Parfum / Bleu de Chanel" 
                    class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary font-bold focus:border-primary focus:outline-none shadow-2xs" 
                  />
                </div>

                <div>
                  <label class="block font-label text-[11px] uppercase tracking-wider text-secondary font-semibold mb-1">
                    Subtítulo / Notas Aromáticas de la Card
                  </label>
                  <input 
                    v-model="slideForm.featuredSub" 
                    type="text" 
                    placeholder="Ej. Notas de Lavanda, Azahar & Vainilla" 
                    class="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary focus:border-primary focus:outline-none shadow-2xs" 
                  />
                </div>
              </div>
            </div>

            <!-- Slide Images (Background & Bottle) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Background Image -->
              <div class="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Foto de Fondo Gran Formato</label>
                <div class="aspect-[16/9] rounded-xl overflow-hidden border border-outline-variant bg-surface mb-2 shadow-2xs">
                  <img v-if="slideForm.image" :src="slideForm.image" class="w-full h-full object-cover" />
                </div>
                <label class="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary font-label text-[10px] uppercase px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-xs border border-primary/20">
                  <span class="material-symbols-outlined text-sm">upload</span>
                  <span>Subir Fondo</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(slideForm, 'image', $event)" />
                </label>
                <input v-model="slideForm.image" type="text" placeholder="URL Fondo: https://..." class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none" />
              </div>

              <!-- Bottle Image -->
              <div class="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Foto Frasco Destacado</label>
                <div class="aspect-[3/4] max-h-36 rounded-xl overflow-hidden border border-outline-variant bg-surface mb-2 mx-auto shadow-2xs">
                  <img v-if="slideForm.bottleImage" :src="slideForm.bottleImage" class="w-full h-full object-cover" />
                </div>
                <label class="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary font-label text-[10px] uppercase px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-xs border border-primary/20">
                  <span class="material-symbols-outlined text-sm">upload</span>
                  <span>Subir Frasco</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(slideForm, 'bottleImage', $event)" />
                </label>
                <input v-model="slideForm.bottleImage" type="text" placeholder="URL Frasco: https://..." class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none" />
              </div>
            </div>

            <!-- Buttons CTAs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Botón Principal (Texto & Link)</label>
                <div class="grid grid-cols-2 gap-2">
                  <input v-model="slideForm.primaryCtaText" type="text" placeholder="Texto Botón" class="bg-surface-container/70 border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none" />
                  <input v-model="slideForm.primaryCtaLink" type="text" placeholder="/catalogo" class="bg-surface-container/70 border border-outline-variant rounded-xl p-2.5 text-xs font-sans font-mono focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Botón Secundario (Texto & Link)</label>
                <div class="grid grid-cols-2 gap-2">
                  <input v-model="slideForm.secondaryCtaText" type="text" placeholder="Texto Secundario" class="bg-surface-container/70 border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none" />
                  <input v-model="slideForm.secondaryCtaLink" type="text" placeholder="/quiz" class="bg-surface-container/70 border border-outline-variant rounded-xl p-2.5 text-xs font-sans font-mono focus:border-primary focus:outline-none" />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button @click="emit('close')" type="button" class="px-5 py-2.5 text-xs font-label uppercase tracking-wider border border-outline-variant rounded-xl text-secondary hover:text-primary hover:bg-surface-container transition-colors">Cancelar</button>
              <button :disabled="isSubmittingSlide" type="submit" class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md border border-primary/20 disabled:opacity-50">
                {{ isSubmittingSlide ? 'Guardando...' : 'Guardar Diapositiva' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
