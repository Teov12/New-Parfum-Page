import { defineStore } from 'pinia'

export const useShippingStore = defineStore('shipping', {
  state: () => ({
    postalCode: localStorage.getItem('gicca_shipping_cp') || '',
    destination: JSON.parse(localStorage.getItem('gicca_shipping_dest') || 'null'),
    options: JSON.parse(localStorage.getItem('gicca_shipping_options') || '[]'),
    selectedOptionId: localStorage.getItem('gicca_shipping_selected_id') || 'andreani_domicilio',
    isLoading: false,
    error: null
  }),

  getters: {
    selectedOption: (state) => {
      if (state.options.length === 0) return null
      return state.options.find(o => o.id === state.selectedOptionId) || state.options[0]
    },
    currentShippingCost: (state) => {
      const option = state.options.find(o => o.id === state.selectedOptionId) || state.options[0]
      return option ? option.price : 4800
    },
    hasQuote: (state) => state.options.length > 0 && !!state.destination
  },

  actions: {
    async calculateShipping(cp, cartTotal = 0) {
      if (!cp || !cp.toString().trim()) {
        this.error = 'Por favor ingresá un código postal.'
        return null
      }

      this.isLoading = true
      this.error = null

      try {
        const res = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postalCode: cp.toString().trim(),
            cartTotal: Number(cartTotal) || 0
          })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cotizar el envío para este código postal.')
        }

        this.postalCode = data.destination.postalCode
        this.destination = data.destination
        this.options = data.options

        // Preserve selected option if still exists, or default to first
        if (!this.options.some(o => o.id === this.selectedOptionId)) {
          this.selectedOptionId = this.options[0]?.id || 'andreani_domicilio'
        }

        this.persist()
        return data
      } catch (err) {
        this.error = err.message
        return null
      } finally {
        this.isLoading = false
      }
    },

    selectOption(optionId) {
      this.selectedOptionId = optionId
      this.persist()
    },

    persist() {
      localStorage.setItem('gicca_shipping_cp', this.postalCode || '')
      localStorage.setItem('gicca_shipping_dest', JSON.stringify(this.destination))
      localStorage.setItem('gicca_shipping_options', JSON.stringify(this.options))
      localStorage.setItem('gicca_shipping_selected_id', this.selectedOptionId || '')
    }
  }
})
