import { ref, onMounted } from 'vue'
import { useTenantStore } from '@/stores/tenant'
import { useToastStore } from '@/stores/toast'

export const adminHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('gicca_admin_token') || ''}`
})

/**
 * Carga la configuración de la tienda (credenciales enmascaradas) y guarda secciones sueltas.
 */
export function useStoreSettings() {
  const tenantStore = useTenantStore()
  const toastStore = useToastStore()
  const settings = ref(null)
  const isLoading = ref(true)
  const isSaving = ref(false)

  const load = async () => {
    try {
      const res = await fetch('/api/tenant/settings', { headers: adminHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la configuración')
      settings.value = data.tenant
    } catch (err) {
      toastStore.show(err.message, 'error')
    } finally {
      isLoading.value = false
    }
  }

  const save = async (payload, successMessage = 'Cambios guardados') => {
    isSaving.value = true
    try {
      await tenantStore.updateSettings(payload)
      await load()
      toastStore.show(successMessage, 'success')
      return true
    } catch (err) {
      toastStore.show(err.message, 'error')
      return false
    } finally {
      isSaving.value = false
    }
  }

  onMounted(load)
  return { settings, isLoading, isSaving, load, save }
}

export const cardClass = 'bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs'
export const inputClass = 'w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm focus:border-primary focus:outline-none'
export const labelClass = 'block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5'
export const primaryButtonClass = 'inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary hover:bg-inverse-surface font-label text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-all shadow-md disabled:opacity-50 font-bold cursor-pointer'
