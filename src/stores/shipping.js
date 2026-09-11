import { defineStore } from 'pinia'

export const useShippingStore = defineStore('shipping', {
  state: () => ({
    postalCode: localStorage.getItem('gicca_shipping_cp') || '',
    destination: JSON.parse(localStorage.getItem('gicca_shipping_dest') || 'null'),
    options: JSON.parse(localStorage.getItem('gicca_shipping_options') || '[]'),
    selectedOptionId: localStorage.getItem('gicca_shipping_selected_id') || 'andreani_domicilio',
    branches: [],
    selectedBranchId: localStorage.getItem('gicca_shipping_selected_branch') || '',
    isLoading: false,
    isBranchesLoading: false,
    error: null,
    apiStatus: null
  }),

  getters: {
    selectedOption: (state) => {
      if (state.options.length === 0) return null
      return state.options.find(o => o.id === state.selectedOptionId) || state.options[0]
    },
    selectedBranch: (state) => {
      if (state.branches.length === 0) return null
      return state.branches.find(b => b.id === state.selectedBranchId) || state.branches[0]
    },
    currentShippingCost: (state) => {
      const option = state.options.find(o => o.id === state.selectedOptionId) || state.options[0]
      return option ? option.price : 4800
    },
    hasQuote: (state) => state.options.length > 0 && !!state.destination,
    isBranchPickup: (state) => {
      const opt = state.options.find(o => o.id === state.selectedOptionId)
      return opt?.type === 'sucursal'
    }
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

        // Preservar la opción seleccionada si aún existe
        if (!this.options.some(o => o.id === this.selectedOptionId)) {
          this.selectedOptionId = this.options[0]?.id || 'andreani_domicilio'
        }

        this.persist()

        // Si la opción seleccionada es sucursal, buscar las sucursales automáticamente
        if (this.isBranchPickup) {
          await this.fetchBranches(this.postalCode)
        }

        return data
      } catch (err) {
        this.error = err.message
        return null
      } finally {
        this.isLoading = false
      }
    },

    async fetchBranches(cp) {
      const targetCp = cp || this.postalCode
      if (!targetCp) return []

      this.isBranchesLoading = true
      try {
        const res = await fetch(`/api/shipping/sucursales?cp=${encodeURIComponent(targetCp)}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.branches)) {
          this.branches = data.branches
          if (!this.selectedBranchId && this.branches.length > 0) {
            this.selectedBranchId = this.branches[0].id
          }
          this.persist()
          return this.branches
        }
        return []
      } catch (err) {
        console.warn('Error fetching branches:', err)
        return []
      } finally {
        this.isBranchesLoading = false
      }
    },

    selectOption(optionId) {
      this.selectedOptionId = optionId
      this.persist()
      if (this.isBranchPickup && this.branches.length === 0) {
        this.fetchBranches(this.postalCode)
      }
    },

    selectBranch(branchId) {
      this.selectedBranchId = branchId
      this.persist()
    },

    async fetchApiStatus() {
      try {
        const res = await fetch('/api/shipping/status')
        const data = await res.json()
        this.apiStatus = data
        return data
      } catch (err) {
        console.error('Error fetching shipping status:', err)
        return null
      }
    },

    async trackShipment(trackingCode) {
      try {
        const res = await fetch(`/api/shipping/tracking/${encodeURIComponent(trackingCode)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al consultar tracking')
        return data
      } catch (err) {
        throw err
      }
    },

    persist() {
      localStorage.setItem('gicca_shipping_cp', this.postalCode || '')
      localStorage.setItem('gicca_shipping_dest', JSON.stringify(this.destination))
      localStorage.setItem('gicca_shipping_options', JSON.stringify(this.options))
      localStorage.setItem('gicca_shipping_selected_id', this.selectedOptionId || '')
      localStorage.setItem('gicca_shipping_selected_branch', this.selectedBranchId || '')
    }
  }
})
