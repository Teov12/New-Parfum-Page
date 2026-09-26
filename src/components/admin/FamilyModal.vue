<script setup>
import { ref, computed, watch } from 'vue'
import { useSiteContentStore } from '@/stores/siteContent'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  family: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const siteContentStore = useSiteContentStore()
const toastStore = useToastStore()

const isSubmittingFamily = ref(false)
const familyForm = ref({
  id: '',
  name: '',
  description: '',
  image: ''
})

const isEditingFamily = computed(() => !!familyForm.value.id)

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.family) {
      familyForm.value = { ...props.family }
    } else {
      familyForm.value = {
        id: '',
        name: '',
        description: '',
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80'
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

const handleSaveFamily = async () => {
  if (!familyForm.value.name.trim()) {
    toastStore.show('Por favor ingresá un nombre para la familia olfativa', 'error')
    return
  }
  isSubmittingFamily.value = true
  try {
    if (isEditingFamily.value) {
      await siteContentStore.updateOlfactiveFamily(familyForm.value.id || familyForm.value.name, familyForm.value)
      toastStore.show('¡Familia olfativa actualizada con éxito!', 'success')
    } else {
      await siteContentStore.addOlfactiveFamily(familyForm.value)
      toastStore.show('¡Nueva familia olfativa agregada con éxito!', 'success')
    }
    emit('saved')
    emit('close')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar familia olfativa', 'error')
  } finally {
    isSubmittingFamily.value = false
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
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)] p-6 sm:p-8 space-y-5">
          <div class="flex justify-between items-center border-b border-outline-variant pb-4">
            <div>
              <span class="font-label text-[10px] uppercase tracking-[0.25em] text-secondary font-bold block mb-0.5">Diseño Web</span>
              <h3 class="font-serif text-2xl text-primary font-bold">
                {{ isEditingFamily ? 'Editar Familia Olfativa' : 'Nueva Familia Olfativa' }}
              </h3>
            </div>
            <button @click="emit('close')" class="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-all">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <form @submit.prevent="handleSaveFamily" class="space-y-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Nombre de la Familia Olfativa *</label>
              <input v-model="familyForm.name" type="text" required placeholder="Ej. Gourmand, Cuero, Aromática..." class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all" />
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">Descripción de Notas Aromáticas</label>
              <textarea v-model="familyForm.description" rows="3" placeholder="Acordes seductores de vainilla negra, haba tonka y café tostado..." class="w-full bg-surface-container/70 border border-outline-variant rounded-xl p-3 text-xs font-sans focus:border-primary focus:outline-none focus:bg-surface transition-all"></textarea>
            </div>

            <!-- Imagen -->
            <div class="bg-surface-container/40 p-4 rounded-xl border border-outline-variant space-y-3">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Imagen Aromática</label>
              <div class="flex items-center gap-4">
                <div class="w-20 h-20 rounded-xl overflow-hidden border border-outline-variant bg-surface flex-shrink-0 shadow-2xs">
                  <img v-if="familyForm.image" :src="familyForm.image" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-secondary text-xs">Sin foto</div>
                </div>
                <div class="space-y-2 flex-grow">
                  <label class="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary font-label text-[11px] uppercase px-4 py-2 rounded-xl cursor-pointer transition-all shadow-xs border border-primary/20">
                    <span class="material-symbols-outlined text-sm">upload</span>
                    <span>Subir desde mi PC</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(familyForm, 'image', $event)" />
                  </label>
                  <input v-model="familyForm.image" type="text" placeholder="O pegar URL: https://..." class="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-sans focus:border-primary focus:outline-none" />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button @click="emit('close')" type="button" class="px-5 py-2.5 text-xs font-label uppercase tracking-wider border border-outline-variant rounded-xl text-secondary hover:text-primary hover:bg-surface-container transition-colors">Cancelar</button>
              <button :disabled="isSubmittingFamily" type="submit" class="bg-primary hover:bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md border border-primary/20 disabled:opacity-50">
                {{ isSubmittingFamily ? 'Guardando...' : (isEditingFamily ? 'Guardar Cambios' : 'Crear Familia') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
