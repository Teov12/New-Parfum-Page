<script setup>
import { ref, computed, watch } from 'vue'
import { useSiteContentStore } from '@/stores/siteContent'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  category: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const siteContentStore = useSiteContentStore()
const toastStore = useToastStore()

const isSubmittingCategory = ref(false)
const categoryForm = ref({
  id: '',
  title: '',
  subtitle: '',
  description: '',
  link: '/catalogo',
  image: '',
  badge: '',
  buttonText: 'Ver Colección',
  span: 6
})

const isEditingCategory = computed(() => !!categoryForm.value.id)

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.category) {
      categoryForm.value = { ...props.category }
    } else {
      categoryForm.value = {
        id: '',
        title: '',
        subtitle: '',
        description: '',
        link: '/catalogo',
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85',
        badge: '',
        buttonText: 'Ver Colección',
        span: 6
      }
    }
  }
})

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

const handleSaveCategory = async () => {
  if (!categoryForm.value.title.trim()) {
    toastStore.show('Por favor ingresá un título para la categoría', 'error')
    return
  }
  isSubmittingCategory.value = true
  try {
    if (isEditingCategory.value) {
      await siteContentStore.updateCategory(categoryForm.value.id, categoryForm.value)
      toastStore.show('¡Categoría actualizada con éxito!', 'success')
    } else {
      await siteContentStore.addCategory(categoryForm.value)
      toastStore.show('¡Nueva categoría agregada con éxito!', 'success')
    }
    emit('saved')
    emit('close')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar categoría', 'error')
  } finally {
    isSubmittingCategory.value = false
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
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)] p-6 sm:p-8 space-y-5">
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-0.5">Diseño Web</span>
              <h3 class="font-serif text-2xl text-primary font-bold">
                {{ isEditingCategory ? 'Editar Categoría' : 'Nueva Categoría' }}
              </h3>
            </div>
            <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-all">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <form @submit.prevent="handleSaveCategory" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Título de la Categoría *</label>
                <input v-model="categoryForm.title" type="text" required placeholder="Ej. Perfumes de Mujer" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Subtítulo / Bajada</label>
                <input v-model="categoryForm.subtitle" type="text" placeholder="Ej. Para Ella / Tendencia Viral" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Descripción Breve</label>
              <textarea v-model="categoryForm.description" rows="2" placeholder="Fragancias florales, dulces y frescas..." class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Enlace / Destino</label>
                <input v-model="categoryForm.link" type="text" required placeholder="/catalogo?gender=woman" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none font-mono focus:bg-surface transition-all" />
              </div>
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Texto del Botón</label>
                <input v-model="categoryForm.buttonText" type="text" placeholder="Ver Perfumes de Mujer" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Ancho en el Bento Grid</label>
                <select v-model.number="categoryForm.span" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all">
                  <option :value="6">Media pantalla (6 columnas - Estándar)</option>
                  <option :value="12">Ancho completo (12 columnas - Destacado grande)</option>
                </select>
              </div>
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Etiqueta / Badge Opcional</label>
                <input v-model="categoryForm.badge" type="text" placeholder="Ej. Más Pedidos / Tendencia" class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
              </div>
            </div>

            <!-- Imagen -->
            <div class="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-3">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Imagen de la Categoría</label>
              <div class="flex items-center gap-4">
                <div class="w-20 h-20 rounded-xl overflow-hidden border border-outline-variant bg-surface flex-shrink-0 shadow-2xs">
                  <img v-if="categoryForm.image" :src="categoryForm.image" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-secondary text-xs">Sin foto</div>
                </div>
                <div class="space-y-2 flex-grow">
                  <label class="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary font-label text-[11px] uppercase px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs border border-primary/20">
                    <span class="material-symbols-outlined text-sm">upload</span>
                    <span>Subir desde mi PC</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(categoryForm, 'image', $event)" />
                  </label>
                  <input v-model="categoryForm.image" type="text" placeholder="O pegar URL: https://..." class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none" />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button @click="emit('close')" type="button" class="px-5 py-2.5 text-xs font-label uppercase tracking-wider border border-outline-variant rounded-xl text-secondary hover:text-primary hover:bg-surface-container transition-colors">Cancelar</button>
              <button :disabled="isSubmittingCategory" type="submit" class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md border border-primary/20 disabled:opacity-50">
                {{ isSubmittingCategory ? 'Guardando...' : (isEditingCategory ? 'Guardar Cambios' : 'Crear Categoría') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
