<script setup>
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <transition-group
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto bg-surface border border-primary p-4 shadow-xl flex items-start gap-3"
          :class="toast.type === 'error' ? 'border-error' : 'border-primary'"
        >
          <span 
            class="material-symbols-outlined text-xl flex-shrink-0"
            :class="toast.type === 'error' ? 'text-error' : 'text-primary'"
          >
            {{ toast.type === 'error' ? 'error' : 'check_circle' }}
          </span>
          <div class="flex-grow">
            <p class="font-sans text-sm text-primary font-medium leading-snug">
              {{ toast.message }}
            </p>
          </div>
          <button 
            @click="toastStore.remove(toast.id)" 
            class="text-secondary hover:text-primary transition-colors p-1"
          >
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>
