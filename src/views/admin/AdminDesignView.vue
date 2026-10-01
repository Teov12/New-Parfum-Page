<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useSiteContentStore } from '@/stores/siteContent'
import { useToastStore } from '@/stores/toast'
import { useTenantStore } from '@/stores/tenant'
import { useProductStore } from '@/stores/products'
import { THEME_PRESETS } from '@/utils/themePresets.js'
import CategoryModal from '@/components/admin/CategoryModal.vue'
import FamilyModal from '@/components/admin/FamilyModal.vue'
import SlideModal from '@/components/admin/SlideModal.vue'
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal.vue'

const siteContentStore = useSiteContentStore()
const toastStore = useToastStore()
const tenantStore = useTenantStore()
const productStore = useProductStore()

const activeDesignSubtab = ref('categorias') // 'categorias', 'familias', 'banners', 'editorial', 'icono', 'paleta'

// Theme Palettes State
const selectedPaletteId = ref(tenantStore.branding?.paletteId || 'amber')
const customPrimaryColor = ref(tenantStore.branding?.primaryColor || '#2e1911')
const isSavingTheme = ref(false)

const selectPresetTheme = (preset) => {
  selectedPaletteId.value = preset.id
  customPrimaryColor.value = preset.primary
  tenantStore.previewTheme({
    ...tenantStore.branding,
    paletteId: preset.id,
    primaryColor: preset.primary,
    primaryContainer: preset.primaryContainer,
    surface: preset.surface,
    surfaceContainer: preset.surfaceContainer
  })
}

const onCustomColorChange = () => {
  selectedPaletteId.value = 'custom'
  tenantStore.previewTheme({
    ...tenantStore.branding,
    paletteId: 'custom',
    primaryColor: customPrimaryColor.value
  })
}

const saveTheme = async () => {
  isSavingTheme.value = true
  try {
    const preset = THEME_PRESETS.find(p => p.id === selectedPaletteId.value)
    const updatedBranding = {
      ...tenantStore.branding,
      paletteId: selectedPaletteId.value,
      primaryColor: customPrimaryColor.value,
      primaryContainer: preset?.primaryContainer,
      surface: preset?.surface,
      surfaceContainer: preset?.surfaceContainer
    }
    await tenantStore.updateSettings({
      branding: updatedBranding
    })
    toastStore.show('¡Paleta de colores aplicada y guardada con éxito!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar la paleta', 'error')
  } finally {
    isSavingTheme.value = false
  }
}

// Store Icon State
const isSavingStoreIcon = ref(false)
const isUploadingStoreIcon = ref(false)
const storeIconForm = ref({
  iconUrl: '',
  storeIcon: 'spa',
  storeName: ''
})

const syncStoreIconForm = () => {
  storeIconForm.value = {
    iconUrl: tenantStore.branding?.iconUrl || '',
    storeIcon: tenantStore.branding?.storeIcon || 'spa',
    storeName: tenantStore.storeName
  }
  selectedPaletteId.value = tenantStore.branding?.paletteId || 'amber'
  customPrimaryColor.value = tenantStore.branding?.primaryColor || '#2e1911'
}

onMounted(async () => {
  syncStoreIconForm()
  siteContentStore.fetchSiteContent()
  productStore.fetchProducts()
})

watch(() => tenantStore.branding, () => {
  syncStoreIconForm()
}, { deep: true })

const LUXURY_ICONS = [
  { id: 'spa', label: 'Atelier / Loto', icon: 'spa' },
  { id: 'diamond', label: 'Diamante / Joya', icon: 'diamond' },
  { id: 'local_florist', label: 'Flor / Esencias', icon: 'local_florist' },
  { id: 'auto_awesome', label: 'Destellos / Magia', icon: 'auto_awesome' },
  { id: 'crown', label: 'Corona / Royal', icon: 'crown' },
  { id: 'flare', label: 'Resplandor / Aura', icon: 'flare' },
  { id: 'vital_signs', label: 'Línea de Vida', icon: 'vital_signs' },
  { id: 'all_inclusive', label: 'Infinito / Firma', icon: 'all_inclusive' },
  { id: 'verified', label: 'Garantía / Oficial', icon: 'verified' },
  { id: 'favorite', label: 'Favorito / Pasión', icon: 'favorite' }
]

const handleStoreIconUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  isUploadingStoreIcon.value = true
  try {
    toastStore.show('Subiendo ícono de la tienda...', 'info')
    const url = await tenantStore.uploadIcon(file)
    storeIconForm.value.iconUrl = url
    toastStore.show('¡Ícono subido con éxito! Presioná "Guardar Ícono" para confirmarlo.', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al subir el ícono', 'error')
  } finally {
    isUploadingStoreIcon.value = false
    event.target.value = ''
  }
}

const clearStoreIcon = () => {
  storeIconForm.value.iconUrl = ''
  toastStore.show('Se eliminó la imagen del ícono. Usando símbolo predeterminado.', 'info')
}

const handleSaveStoreIcon = async () => {
  isSavingStoreIcon.value = true
  try {
    await tenantStore.updateSettings({
      branding: {
        ...tenantStore.branding,
        iconUrl: storeIconForm.value.iconUrl,
        storeIcon: storeIconForm.value.storeIcon
      }
    })
    toastStore.show('¡Ícono de la tienda y favicon actualizados con éxito!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar el ícono', 'error')
  } finally {
    isSavingStoreIcon.value = false
  }
}

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
          class="px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center cursor-pointer"
          :class="activeDesignSubtab === 'editorial' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/80'"
        >
          <span>Nosotros</span>
        </button>

        <button 
          @click="activeDesignSubtab = 'icono'"
          class="px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center cursor-pointer"
          :class="activeDesignSubtab === 'icono' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/80'"
        >
          <span class="material-symbols-outlined text-sm">token</span>
          <span>Ícono Tienda</span>
        </button>

        <button 
          @click="activeDesignSubtab = 'paleta'"
          class="px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center cursor-pointer"
          :class="activeDesignSubtab === 'paleta' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-primary hover:bg-surface/80'"
        >
          <span class="material-symbols-outlined text-sm">palette</span>
          <span>Paleta de Colores</span>
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

      <!-- SUBTAB 5: ÍCONO & LOGOTIPO DE LA TIENDA -->
      <div v-else-if="activeDesignSubtab === 'icono'" key="icono" class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 class="font-serif text-xl sm:text-2xl font-normal text-primary">Ícono & Logotipo de la Boutique</h3>
            <p class="font-sans text-xs text-secondary mt-0.5">
              Personalizá el ícono visible en la barra de navegación pública, pie de página, favicon del navegador y panel de administración.
            </p>
          </div>

          <button 
            @click="handleSaveStoreIcon"
            :disabled="isSavingStoreIcon"
            class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 border border-primary/20 cursor-pointer font-bold"
          >
            <span class="material-symbols-outlined text-sm">save</span>
            <span>{{ isSavingStoreIcon ? 'Guardando...' : 'Guardar Ícono' }}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Configuración (7 cols) -->
          <div class="lg:col-span-7 bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <!-- 1. Imagen / Archivo Personalizado -->
            <div class="space-y-3">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">
                1. Subir Imagen o Logo Propio (PNG, SVG, ICO, JPG)
              </label>
              
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <label 
                  class="cursor-pointer bg-surface-container hover:bg-surface-container-high border border-dashed border-outline-variant hover:border-primary rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-xs font-label uppercase tracking-wider text-primary font-bold transition-all shadow-2xs group flex-grow"
                  :class="isUploadingStoreIcon ? 'opacity-50 pointer-events-none' : ''"
                >
                  <span class="material-symbols-outlined text-lg text-primary group-hover:scale-110 transition-transform">
                    {{ isUploadingStoreIcon ? 'hourglass_top' : 'cloud_upload' }}
                  </span>
                  <span>{{ isUploadingStoreIcon ? 'Subiendo archivo...' : 'Seleccionar Archivo de Imagen' }}</span>
                  <input 
                    type="file" 
                    accept="image/*,.ico,.svg" 
                    class="hidden" 
                    @change="handleStoreIconUpload" 
                  />
                </label>

                <button 
                  v-if="storeIconForm.iconUrl"
                  type="button"
                  @click="clearStoreIcon"
                  class="px-3.5 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-label uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                  title="Eliminar imagen y volver a símbolo"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                  <span>Quitar</span>
                </button>
              </div>

              <!-- Input directo URL de imagen opcional -->
              <input 
                v-model="storeIconForm.iconUrl" 
                type="text" 
                placeholder="O pegá aquí el enlace directo a tu imagen (https://...)" 
                class="w-full bg-surface-container border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
              />
            </div>

            <!-- 2. Símbolo Insignia Vectorial (Fallback) -->
            <div class="pt-4 border-t border-outline-variant space-y-3">
              <div class="flex items-center justify-between">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">
                  2. O elegir Símbolo de Alta Gama
                </label>
                <span class="text-[10px] text-secondary font-sans">
                  {{ storeIconForm.iconUrl ? '(Inactivo mientras haya imagen subida)' : 'Activo como ícono principal' }}
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  v-for="item in LUXURY_ICONS"
                  :key="item.id"
                  type="button"
                  @click="storeIconForm.storeIcon = item.icon"
                  class="p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                  :class="storeIconForm.storeIcon === item.icon && !storeIconForm.iconUrl
                    ? 'bg-primary text-amber-200 border-primary font-bold shadow-xs scale-102 ring-2 ring-amber-400/40' 
                    : 'bg-surface-container border-outline-variant/80 text-secondary hover:text-primary hover:border-primary/50'"
                >
                  <span class="material-symbols-outlined text-xl">{{ item.icon }}</span>
                  <span class="text-[10px] font-label uppercase tracking-wider truncate w-full">{{ item.label }}</span>
                </button>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <span class="text-[11px] text-secondary font-label uppercase tracking-wider flex-shrink-0">Nombre de símbolo:</span>
                <input 
                  v-model="storeIconForm.storeIcon" 
                  type="text" 
                  placeholder="spa, diamond, local_florist, auto_awesome..." 
                  class="flex-grow bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Previews (5 cols) -->
          <div class="lg:col-span-5 bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
            <h4 class="font-serif text-base text-primary font-bold">Previsualización en Vivo</h4>
            
            <!-- Navbar Preview -->
            <div class="space-y-1.5">
              <span class="text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Navbar de la Tienda</span>
              <div class="flex items-center gap-3 p-3 bg-surface-container/60 rounded-xl border border-outline-variant">
                <img 
                  v-if="storeIconForm.iconUrl" 
                  :src="storeIconForm.iconUrl" 
                  alt="Ícono" 
                  class="w-8 h-8 object-contain rounded-lg shadow-2xs"
                />
                <div 
                  v-else 
                  class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-container text-amber-200 flex items-center justify-center shadow-xs border border-primary/20 flex-shrink-0"
                >
                  <span class="material-symbols-outlined text-base">{{ storeIconForm.storeIcon || 'spa' }}</span>
                </div>
                <span class="font-sans text-base font-bold text-primary truncate">
                  {{ tenantStore.storeName }}
                </span>
              </div>
            </div>

            <!-- Favicon Preview -->
            <div class="space-y-1.5">
              <span class="text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Pestaña del Navegador (Favicon)</span>
              <div class="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-300">
                <img 
                  v-if="storeIconForm.iconUrl" 
                  :src="storeIconForm.iconUrl" 
                  alt="Favicon" 
                  class="w-4 h-4 object-contain rounded-2xs"
                />
                <div 
                  v-else 
                  class="w-4 h-4 rounded-2xs bg-primary text-amber-300 flex items-center justify-center flex-shrink-0 text-[9px] font-serif font-bold"
                >
                  {{ (tenantStore.storeName || 'G').charAt(0).toUpperCase() }}
                </div>
                <span class="text-xs text-slate-800 font-sans truncate">
                  {{ tenantStore.storeName }} | Boutique
                </span>
              </div>
            </div>

            <!-- Admin Header Preview -->
            <div class="space-y-1.5">
              <span class="text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Barra de Administración</span>
              <div class="flex items-center gap-2.5 p-3 bg-surface-container/40 rounded-xl border border-outline-variant">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container text-amber-200 flex items-center justify-center flex-shrink-0 shadow-2xs overflow-hidden">
                  <img 
                    v-if="storeIconForm.iconUrl" 
                    :src="storeIconForm.iconUrl" 
                    alt="Admin Icon" 
                    class="w-full h-full object-contain p-1"
                  />
                  <span v-else class="material-symbols-outlined text-base">{{ storeIconForm.storeIcon || 'spa' }}</span>
                </div>
                <div>
                  <span class="font-serif text-xs font-bold text-primary block leading-none truncate">
                    {{ tenantStore.storeName }}
                  </span>
                  <span class="text-[9px] font-label uppercase tracking-wider text-secondary">
                    Atelier Admin OS
                  </span>
                </div>
              </div>
            </div>

            <!-- Save CTA -->
            <button 
              @click="handleSaveStoreIcon"
              :disabled="isSavingStoreIcon"
              class="w-full mt-4 bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 font-bold cursor-pointer"
            >
              <span class="material-symbols-outlined text-sm">save</span>
              <span>{{ isSavingStoreIcon ? 'Guardando Cambios...' : 'Guardar y Aplicar Ícono' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- SUBTAB 6: PALETA DE COLORES DE LA BOUTIQUE (DYNAMIC THEMING) -->
      <div v-else-if="activeDesignSubtab === 'paleta'" key="paleta" class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 class="font-serif text-xl sm:text-2xl font-normal text-primary">Paleta de Colores de la Boutique</h3>
            <p class="font-sans text-xs text-secondary mt-0.5">
              Personalizá la identidad visual de la tienda. Al seleccionar una paleta o color, toda la web (botones, badges, títulos y fondos) se adapta en tiempo real.
            </p>
          </div>
          <button 
            @click="saveTheme"
            :disabled="isSavingTheme"
            class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 border border-primary/20 cursor-pointer font-bold"
          >
            <span class="material-symbols-outlined text-sm">palette</span>
            <span>{{ isSavingTheme ? 'Guardando...' : 'Guardar y Aplicar Paleta' }}</span>
          </button>
        </div>

        <!-- Presets Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div 
            v-for="preset in THEME_PRESETS" 
            :key="preset.id"
            @click="selectPresetTheme(preset)"
            class="bg-surface border rounded-2xl p-5 transition-all cursor-pointer relative group flex flex-col justify-between"
            :class="selectedPaletteId === preset.id 
              ? 'border-primary ring-2 ring-primary/40 shadow-md' 
              : 'border-outline-variant hover:border-outline hover:shadow-xs'"
          >
            <div>
              <!-- Header with Active Badge -->
              <div class="flex items-center justify-between mb-3">
                <span class="font-serif text-lg font-bold text-primary">{{ preset.name }}</span>
                <span 
                  v-if="selectedPaletteId === preset.id"
                  class="bg-primary text-on-primary text-[10px] font-label uppercase px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs"
                >
                  <span class="material-symbols-outlined text-xs">check</span>
                  <span>Activo</span>
                </span>
              </div>
              <p class="font-label text-[11px] uppercase tracking-wider text-secondary font-medium mb-1">{{ preset.subtitle }}</p>
              <p class="font-sans text-xs text-secondary leading-relaxed mb-4">{{ preset.description }}</p>
            </div>

            <!-- Color Swatches & Preview Button -->
            <div class="space-y-3 pt-3 border-t border-outline-variant/60">
              <div class="flex items-center gap-2">
                <span 
                  v-for="(hex, cIdx) in preset.previewColors" 
                  :key="cIdx"
                  class="w-7 h-7 rounded-full border border-black/10 shadow-2xs"
                  :style="{ backgroundColor: hex }"
                ></span>
              </div>

              <!-- Mini Component Simulation -->
              <div class="p-3 rounded-lg flex items-center justify-between border" :style="{ backgroundColor: preset.surface, borderColor: preset.previewColors[1] + '40' }">
                <span class="text-xs font-serif font-bold" :style="{ color: preset.primary }">{{ tenantStore.storeName }}</span>
                <span class="text-[10px] font-label uppercase px-2.5 py-1 rounded-sm text-white font-medium shadow-2xs" :style="{ backgroundColor: preset.primary }">
                  Comprar
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Color Hex Picker -->
        <div class="bg-surface border border-outline-variant rounded-2xl p-6 shadow-xs space-y-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-primary">colorize</span>
            <h4 class="font-serif text-lg font-normal text-primary">Color Personalizado de Marca</h4>
          </div>
          <p class="font-sans text-xs text-secondary">
            Si tenés un código de color específico de tu marca (ej. de tu logo o manual de identidad corporativa), podés ingresarlo acá para aplicarlo a la tienda.
          </p>

          <div class="flex flex-wrap items-center gap-4 pt-2">
            <div class="flex items-center gap-2.5 bg-surface-container border border-outline-variant rounded-xl p-2 pr-4 shadow-2xs">
              <input 
                type="color" 
                v-model="customPrimaryColor" 
                @input="onCustomColorChange"
                class="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <div>
                <label class="block text-[10px] font-label uppercase tracking-wider text-secondary">Color Primario (Hex)</label>
                <input 
                  type="text" 
                  v-model="customPrimaryColor" 
                  @input="onCustomColorChange"
                  placeholder="#2E1911"
                  class="font-mono text-xs font-bold text-primary bg-transparent focus:outline-none uppercase w-24"
                />
              </div>
            </div>

            <button 
              @click="saveTheme"
              :disabled="isSavingTheme"
              class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer font-bold"
            >
              <span class="material-symbols-outlined text-sm">save</span>
              <span>{{ isSavingTheme ? 'Guardando...' : 'Aplicar y Guardar Este Color' }}</span>
            </button>
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
      :title="`¿Eliminar '${contentToDelete?.title || 'este elemento'}'?`"
      message="Este elemento dejará de mostrarse en la web inmediatamente."
      :is-deleting="isDeleting"
      @close="isDeleteModalOpen = false"
      @confirm="handleExecuteDeleteContent"
    />

  </div>
</template>
