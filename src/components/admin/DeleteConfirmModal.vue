<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '¿Confirmar eliminación?'
  },
  message: {
    type: String,
    default: 'Esta acción no se puede deshacer y el elemento se dará de baja de inmediato.'
  },
  isDeleting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-modal">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div class="admin-modal-dialog bg-surface border border-outline-variant rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-[0_25px_60px_-15px_rgba(46,25,17,0.25)]">
          <div class="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600 shadow-2xs">
            <span class="material-symbols-outlined text-2xl">warning</span>
          </div>
          <div>
            <h3 class="font-serif text-xl font-bold text-primary">{{ title }}</h3>
            <p class="text-xs text-secondary mt-1.5 leading-relaxed">
              {{ message }}
            </p>
          </div>
          <div class="flex gap-3 justify-center pt-2">
            <button 
              type="button"
              @click="emit('close')" 
              class="px-5 py-2.5 text-xs font-label uppercase tracking-wider border border-outline-variant rounded-xl text-secondary hover:text-primary hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="button"
              @click="emit('confirm')" 
              :disabled="isDeleting" 
              class="bg-red-600 hover:bg-red-700 text-white font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs disabled:opacity-50"
            >
              {{ isDeleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
