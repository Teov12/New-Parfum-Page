<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSiteContentStore } from '@/stores/siteContent'
import { useToastStore } from '@/stores/toast'
import CategoryModal from '@/components/admin/CategoryModal.vue'
import FamilyModal from '@/components/admin/FamilyModal.vue'
import SlideModal from '@/components/admin/SlideModal.vue'
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal.vue'

const siteContentStore = useSiteContentStore()
const toastStore = useToastStore()

const activeDesignSubtab = ref('categorias') // 'categorias', 'familias', 'banners', 'editorial'

// Modals State
const isCategoryModalOpen = ref(false)
const selectedCategory = ref(null)

const isFamilyModalOpen = ref(false)
const selectedFamily = ref(null)

const isSlideModalOpen = ref(false)
const selectedSlide = ref(null)

const isDeleteModalOpen = ref(false)
const contentToDelete = ref(null)
const isDeleting = ref(false)

const isSubmittingEditorial = ref(false)

// Open Modal Handlers
const openCreateCategory = () => {
  selectedCategory.value = null
  isCategoryModalOpen.value = true
}

const openEditCategory = (cat) => {
  selectedCategory.value = cat
  isCategoryModalOpen.value = true
}

const openCreateFamily = () => {
  selectedFamily.value = null
  isFamilyModalOpen.value = true
}

const openEditFamily = (fam) => {
  selectedFamily.value = fam
  isFamilyModalOpen.value = true
}

const openCreateSlide = () => {
  selectedSlide.value = null
  isSlideModalOpen.value = true
}

const openEditSlide = (slide) => {
  selectedSlide.value = slide
  isSlideModalOpen.value = true
}

// Delete content confirmation
const confirmDeleteContentItem = (type, item, title) => {
  contentToDelete.value = { type, item, title }
  isDeleteModalOpen.value = true
}

const handleExecuteDeleteContent = async () => {
  if (!contentToDelete.value) return
  const { type, item } = contentToDelete.value
  isDeleting.value = true
  try {
    if (type === 'category') {
      await siteContentStore.deleteCategory(item.id)
      toastStore.show('Categoría eliminada del catálogo', 'info')
    } else if (type === 'family') {
      await siteContentStore.deleteOlfactiveFamily(item.id || item.name)
      toastStore.show('Familia olfativa eliminada', 'info')
    } else if (type === 'slide') {
      const slides = siteContentStore.heroSlides.filter(s => s.id !== item.id)
      await siteContentStore.saveFullContent({ heroSlides: slides })
      toastStore.show('Diapositiva eliminada', 'info')
    }
  } catch (err) {
    toastStore.show(err.message || 'Error al eliminar', 'error')
  } finally {
    isDeleting.value = false
    isDeleteModalOpen.value = false
    contentToDelete.value = null
  }
}

// 1-Click Direct upload from PC
const handleDirectImageUpload = async (targetObj, fieldKey, event) => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    toastStore.show('Subiendo imagen a la web...', 'info')
    const url = await siteContentStore.uploadImage(file)
    targetObj[fieldKey] = url
    await siteContentStore.saveFullContent({})
    toastStore.show('¡Imagen actualizada con éxito!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al subir imagen', 'error')
  } finally {
    event.target.value = ''
  }
}

// Save editorial images
const handleSaveEditorial = async () => {
  isSubmittingEditorial.value = true
  try {
    await siteContentStore.saveFullContent({ editorial: siteContentStore.editorial })
    toastStore.show('¡Imágenes editoriales guardadas con éxito!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar imágenes editoriales', 'error')
  } finally {
    isSubmittingEditorial.value = false
  }
}
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-300">
    
    <!-- Sub-header & Subtabs Navigation -->
    <div class="bg-surface border border-outline-variant rounded-2xl p-4 sm:p-7 shadow-[0_4px_18px_-4px_rgba(46,25,17,0.04)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-1">Personalización Visual</span>
        <h2 class="font-serif text-2xl sm:text-3xl text-primary font-normal">Diseño & Contenido de la Boutique</h2>
        <p class="font-sans text-xs text-secondary mt-1">
          Modificá todas las imágenes estáticas, tarjetas del Bento Grid de portada y familias olfativas en tiempo real.
        </p>
      </div>

      <!-- Subtabs Segmented Control -->
      <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 bg-surface-container/80 p-1.5 rounded-xl border border-outline-variant/80 text-xs font-label uppercase w-full md:w-auto">
        <button 
          @click="activeDesignSubtab = 'categorias'"
          class="px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center"
          :class="activeDesignSubtab === 'categorias' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/80'"
        >
          <span>Categorías</span>
          <span 
            class="px-1.5 sm:px-2 py-0.5 text-[10px] rounded-full font-mono font-bold border"
            :class="activeDesignSubtab === 'categorias' ? 'bg-white/20 text-white border-white/20' : 'bg-surface text-primary border-outline-variant/70'"
          >
            {{ siteContentStore.mainCategories.length }}
          </span>
        </button>

        <button 
          @click="activeDesignSubtab = 'familias'"
          class="px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center"
          :class="activeDesignSubtab === 'familias' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/80'"
        >
          <span>Familias</span>
          <span 
            class="px-1.5 sm:px-2 py-0.5 text-[10px] rounded-full font-mono font-bold border"
            :class="activeDesignSubtab === 'familias' ? 'bg-white/20 text-white border-white/20' : 'bg-surface text-primary border-outline-variant/70'"
          >
            {{ siteContentStore.olfactiveFamilies.length }}
          </span>
        </button>

        <button 
          @click="activeDesignSubtab = 'banners'"
          class="px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center"
          :class="activeDesignSubtab === 'banners' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/80'"
        >
          <span>Banners</span>
          <span 
            class="px-1.5 sm:px-2 py-0.5 text-[10px] rounded-full font-mono font-bold border"
            :class="activeDesignSubtab === 'banners' ? 'bg-white/20 text-white border-white/20' : 'bg-surface text-primary border-outline-variant/70'"
          >
            {{ siteContentStore.heroSlides.length }}
          </span>
        </button>

        <button 
          @click="activeDesignSubtab = 'editorial'"
          class="px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center"
          :class="activeDesignSubtab === 'editorial' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/80'"
        >
          <span>Nosotros</span>
        </button>
      </div>
    </div>

    <!-- Subtabs Dynamic View with Fluid Transition -->
    <Transition name="admin-tab-fade" mode="out-in">
      
      <!-- SUBTAB 1: CATEGORÍAS PRINCIPALES (BENTO GRID) -->
      <div v-if="activeDesignSubtab === 'categorias'" key="categorias" class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 class="font-serif text-xl sm:text-2xl font-normal text-primary">Categorías Principales (Bento Grid Portada)</h3>
            <p class="font-sans text-xs text-secondary mt-0.5">
              Estas tarjetas aparecen destacadas en la página de inicio. Podés cambiar la foto, editar textos, agregar nuevas o eliminarlas.
            </p>
          </div>

          <button 
            @click="openCreateCategory"
            class="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-95 border border-primary/20 transition-all flex-shrink-0"
          >
            <span class="material-symbols-outlined text-base">add</span>
            <span>Nueva Categoría</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            v-for="cat in siteContentStore.mainCategories" 
            :key="cat.id"
            class="bg-surface border border-outline-variant hover:border-primary rounded-2xl overflow-hidden shadow-[0_8px_25px_-8px_rgba(46,25,17,0.06)] hover:shadow-[0_20px_40px_-10px_rgba(46,25,17,0.14)] hover:-translate-y-1.5 transition-all duration-400 flex flex-col justify-between group"
          >
            <div>
              <div class="relative aspect-[16/9] bg-surface-container overflow-hidden group">
                <img 
                  :src="cat.image" 
                  :alt="cat.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div class="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                  <label class="bg-surface/90 hover:bg-surface text-primary font-label text-xs uppercase px-4 py-2 rounded-full cursor-pointer flex items-center gap-1.5 shadow-md border border-outline-variant backdrop-blur-sm transition-all hover:scale-105 active:scale-95">
                    <span class="material-symbols-outlined text-sm">upload</span>
                    <span>Cambiar Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      class="hidden" 
                      @change="handleDirectImageUpload(cat, 'image', $event)" 
                    />
                  </label>
                </div>

                <div class="absolute top-3 left-3 bg-surface/95 backdrop-blur-md font-label text-[10px] font-bold px-3 py-1 rounded-full text-primary border border-outline-variant shadow-xs">
                  {{ cat.subtitle || 'Categoría' }}
                </div>

                <div class="absolute top-3 right-3 bg-primary text-on-primary font-label text-[10px] font-bold px-3 py-1 rounded-full shadow-xs border border-primary/30">
                  {{ cat.span === 12 ? 'Ancho Completo (12 cols)' : 'Media Pantalla (6 cols)' }}
                </div>
              </div>

              <div class="p-6 space-y-2.5">
                <h4 class="font-serif text-xl text-primary font-normal">{{ cat.title }}</h4>
                <p class="font-sans text-xs text-secondary line-clamp-2 leading-relaxed">{{ cat.description }}</p>
                
                <div class="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-secondary">
                  <span class="bg-surface-container px-2.5 py-0.5 rounded-full border border-outline-variant text-[10px]">Enlace: {{ cat.link }}</span>
                  <span class="bg-surface-container px-2.5 py-0.5 rounded-full border border-outline-variant text-[10px]">Botón: {{ cat.buttonText || 'Ver Colección' }}</span>
                </div>
              </div>
            </div>

            <div class="border-t border-outline-variant p-3.5 bg-surface-container/60 flex justify-between items-center">
              <label class="text-xs text-primary font-label uppercase flex items-center gap-1.5 cursor-pointer hover:text-secondary transition-colors py-1 px-2 rounded-md">
                <span class="material-symbols-outlined text-base">photo_camera</span>
                <span>Subir Foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  class="hidden" 
                  @change="handleDirectImageUpload(cat, 'image', $event)" 
                />
              </label>

              <div class="flex items-center gap-1.5">
                <button 
                  @click="openEditCategory(cat)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-primary rounded-lg border border-outline-variant/60 hover:border-primary hover:bg-surface transition-all shadow-2xs"
                  title="Editar Categoría"
                >
                  <span class="material-symbols-outlined text-base">edit</span>
                </button>
                <button 
                  @click="confirmDeleteContentItem('category', cat, cat.title)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-rose-700 rounded-lg border border-outline-variant/60 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs"
                  title="Eliminar Categoría"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUBTAB 2: FAMILIAS OLFATIVAS -->
      <div v-else-if="activeDesignSubtab === 'familias'" key="familias" class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 class="font-serif text-xl sm:text-2xl font-normal text-primary">Familias Olfativas (Guía Aromática & Filtros)</h3>
            <p class="font-sans text-xs text-secondary mt-0.5">
              Familias aromáticas exhibidas en la portada y utilizadas como filtros aromáticos en el catálogo.
            </p>
          </div>

          <button 
            @click="openCreateFamily"
            class="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-95 border border-primary/20 transition-all flex-shrink-0"
          >
            <span class="material-symbols-outlined text-base">add</span>
            <span>Nueva Familia Olfativa</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            v-for="fam in siteContentStore.olfactiveFamilies" 
            :key="fam.id || fam.name"
            class="bg-surface border border-outline-variant hover:border-primary rounded-2xl overflow-hidden shadow-[0_8px_25px_-8px_rgba(46,25,17,0.06)] hover:shadow-[0_20px_40px_-10px_rgba(46,25,17,0.14)] hover:-translate-y-1.5 transition-all duration-400 flex flex-col justify-between group"
          >
            <div>
              <div class="relative aspect-square bg-surface-container overflow-hidden group">
                <img 
                  :src="fam.image" 
                  :alt="fam.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div class="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-2xs">
                  <label class="bg-surface/90 hover:bg-surface text-primary font-label text-xs uppercase px-4 py-2 rounded-full cursor-pointer flex items-center gap-1.5 shadow-md border border-outline-variant backdrop-blur-sm transition-all hover:scale-105 active:scale-95">
                    <span class="material-symbols-outlined text-sm">upload</span>
                    <span>Cambiar Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      class="hidden" 
                      @change="handleDirectImageUpload(fam, 'image', $event)" 
                    />
                  </label>
                </div>
              </div>

              <div class="p-5 space-y-2">
                <h4 class="font-serif text-xl text-primary font-normal">{{ fam.name }}</h4>
                <p class="font-sans text-xs text-secondary leading-relaxed line-clamp-3">{{ fam.description }}</p>
              </div>
            </div>

            <div class="border-t border-outline-variant p-3 bg-surface-container/60 flex justify-between items-center">
              <label class="text-[11px] text-primary font-label uppercase flex items-center gap-1.5 cursor-pointer hover:text-secondary transition-colors py-1 px-2 rounded-md">
                <span class="material-symbols-outlined text-base">photo_camera</span>
                <span>Subir Foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  class="hidden" 
                  @change="handleDirectImageUpload(fam, 'image', $event)" 
                />
              </label>

              <div class="flex items-center gap-1.5">
                <button 
                  @click="openEditFamily(fam)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-primary rounded-lg border border-outline-variant/60 hover:border-primary hover:bg-surface transition-all shadow-2xs"
                  title="Editar Familia"
                >
                  <span class="material-symbols-outlined text-base">edit</span>
                </button>
                <button 
                  @click="confirmDeleteContentItem('family', fam, fam.name)"
                  class="w-8 h-8 inline-flex items-center justify-center text-secondary hover:text-rose-700 rounded-lg border border-outline-variant/60 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs"
                  title="Eliminar Familia"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUBTAB 3: BANNERS DE PORTADA (HERO SLIDER) -->
      <div v-else-if="activeDesignSubtab === 'banners'" key="banners" class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 class="font-serif text-xl sm:text-2xl font-normal text-primary">Diapositivas del Banner Principal</h3>
            <p class="font-sans text-xs text-secondary mt-0.5">
              Gestioná los fondos, frascos flotantes, títulos y botones del gran carrusel de inicio.
            </p>
          </div>

          <button 
            @click="openCreateSlide"
            class="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-95 border border-primary/20 transition-all flex-shrink-0"
          >
            <span class="material-symbols-outlined text-base">add</span>
            <span>Nuevo Slide</span>
          </button>
        </div>

        <div class="space-y-4">
          <div 
            v-for="(slide, idx) in siteContentStore.heroSlides" 
            :key="slide.id"
            class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between"
          >
            <div class="flex items-center gap-4 flex-shrink-0">
              <!-- Background preview -->
              <div class="relative w-36 h-24 rounded-xl overflow-hidden border border-outline-variant group bg-surface-container shadow-2xs">
                <img :src="slide.image" :alt="slide.title" class="w-full h-full object-cover" />
                <label class="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-label uppercase cursor-pointer backdrop-blur-2xs">
                  <span class="material-symbols-outlined text-base">upload</span>
                  <span>Fondo</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleDirectImageUpload(slide, 'image', $event)" />
                </label>
              </div>

              <!-- Bottle preview -->
              <div class="relative w-20 h-24 rounded-xl overflow-hidden border border-outline-variant group bg-surface-container shadow-2xs">
                <img :src="slide.bottleImage" :alt="slide.featuredTitle" class="w-full h-full object-cover" />
                <label class="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-label uppercase cursor-pointer backdrop-blur-2xs">
                  <span class="material-symbols-outlined text-base">upload</span>
                  <span>Frasco</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleDirectImageUpload(slide, 'bottleImage', $event)" />
                </label>
              </div>
            </div>

            <!-- Text info -->
            <div class="flex-grow space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-secondary">#{{ idx + 1 }}</span>
                <span v-if="slide.tag" class="bg-surface-container px-3 py-0.5 rounded-full text-[10px] font-label uppercase font-bold text-primary border border-outline-variant shadow-2xs">
                  {{ slide.tag }}
                </span>
              </div>
              <h4 class="font-sans text-lg font-medium text-primary">{{ slide.title }} <span class="italic font-serif font-normal">{{ slide.highlight }}</span></h4>
              <p class="font-sans text-xs text-secondary line-clamp-1 max-w-xl">{{ slide.description }}</p>
              <p class="text-[11px] text-secondary">Destacado: <strong class="text-primary">{{ slide.featuredTitle }}</strong> ({{ slide.featuredRating }})</p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <button 
                @click="openEditSlide(slide)"
                class="bg-surface border border-outline-variant hover:border-primary text-primary font-label text-xs uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span class="material-symbols-outlined text-sm">edit</span>
                <span>Editar Textos</span>
              </button>
              <button 
                @click="confirmDeleteContentItem('slide', slide, slide.title)"
                class="w-9 h-9 inline-flex items-center justify-center text-secondary hover:text-rose-700 rounded-xl border border-outline-variant/60 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs"
                title="Eliminar Slide"
              >
                <span class="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- SUBTAB 4: IMÁGENES EDITORIALES (SOBRE NOSOTROS) -->
      <div v-else-if="activeDesignSubtab === 'editorial'" key="editorial" class="space-y-6">
        <div class="bg-surface border border-outline-variant rounded-2xl p-8 shadow-xs space-y-6 max-w-3xl">
          <div>
            <h3 class="font-serif text-xl sm:text-2xl font-normal text-primary">Fotografía de "Sobre Nosotros"</h3>
            <p class="font-sans text-xs text-secondary mt-0.5">
              Esta foto aparece en la sección editorial de la página <RouterLink to="/nosotros" target="_blank" class="underline text-primary font-bold">/nosotros</RouterLink>.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div class="aspect-[4/5] bg-surface-container border border-outline-variant rounded-2xl overflow-hidden shadow-sm relative group">
              <img 
                :src="siteContentStore.editorial?.aboutImage || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85'" 
                alt="Sobre Nosotros Preview"
                class="w-full h-full object-cover"
              />
              <label class="absolute inset-0 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-label uppercase cursor-pointer backdrop-blur-2xs">
                <span class="material-symbols-outlined text-2xl">upload</span>
                <span>Cambiar Foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  class="hidden" 
                  @change="handleDirectImageUpload(siteContentStore.editorial, 'aboutImage', $event)" 
                />
              </label>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  Subir archivo desde la PC
                </label>
                <label class="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs border border-primary/20">
                  <span class="material-symbols-outlined text-sm">upload</span>
                  <span>Seleccionar Archivo...</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    class="hidden" 
                    @change="handleDirectImageUpload(siteContentStore.editorial, 'aboutImage', $event)" 
                  />
                </label>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                  O ingresar URL directa de la imagen
                </label>
                <input 
                  v-model="siteContentStore.editorial.aboutImage" 
                  type="text" 
                  placeholder="https://..."
                  class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans text-primary placeholder:text-secondary/70 focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-2xs"
                />
              </div>

              <button 
                @click="handleSaveEditorial"
                :disabled="isSubmittingEditorial"
                class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 border border-primary/20"
              >
                <span class="material-symbols-outlined text-sm">save</span>
                <span>{{ isSubmittingEditorial ? 'Guardando...' : 'Guardar Cambios' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modals -->
    <CategoryModal 
      :is-open="isCategoryModalOpen"
      :category="selectedCategory"
      @close="isCategoryModalOpen = false"
      @saved="siteContentStore.fetchSiteContent()"
    />

    <FamilyModal 
      :is-open="isFamilyModalOpen"
      :family="selectedFamily"
      @close="isFamilyModalOpen = false"
      @saved="siteContentStore.fetchSiteContent()"
    />

    <SlideModal 
      :is-open="isSlideModalOpen"
      :slide="selectedSlide"
      @close="isSlideModalOpen = false"
      @saved="siteContentStore.fetchSiteContent()"
    />

    <DeleteConfirmModal 
      :is-open="isDeleteModalOpen"
      :title="`¿Eliminar '${contentToDelete?.title}'?`"
      message="Este elemento dejará de mostrarse en la web inmediatamente."
      :is-deleting="isDeleting"
      @close="isDeleteModalOpen = false"
      @confirm="handleExecuteDeleteContent"
    />

  </div>
</template>
