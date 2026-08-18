import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem('gicca_cart_items') || '[]'),
    coupon: JSON.parse(localStorage.getItem('gicca_cart_coupon') || 'null'),
    isDrawerOpen: false,
    freeShippingThreshold: 200000,
    selectedSample: localStorage.getItem('gicca_selected_sample') || 'Libre YSL 2ml - Muestra de Cortesía',
  }),

  getters: {
    totalItems: (state) => state.items.reduce((acc, item) => acc + item.quantity, 0),
    
    subtotal: (state) => {
      return state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    },

    discountAmount: (state) => {
      if (!state.coupon) return 0
      const subtotal = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      if (state.coupon.type === 'percentage') {
        return Math.round((subtotal * state.coupon.value) / 100)
      } else if (state.coupon.type === 'fixed') {
        return Math.min(subtotal, state.coupon.value)
      }
      return 0
    },

    shippingCost: (state) => {
      const subtotal = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      if (subtotal === 0) return 0
      return subtotal >= state.freeShippingThreshold ? 0 : 4500
    },

    total(state) {
      return Math.max(0, this.subtotal - this.discountAmount + this.shippingCost)
    },

    amountForFreeShipping: (state) => {
      const subtotal = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      return Math.max(0, state.freeShippingThreshold - subtotal)
    },

    freeShippingProgress: (state) => {
      const subtotal = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      if (state.freeShippingThreshold <= 0) return 100
      return Math.min(100, Math.round((subtotal / state.freeShippingThreshold) * 100))
    }
  },

  actions: {
    persist() {
      localStorage.setItem('gicca_cart_items', JSON.stringify(this.items))
      localStorage.setItem('gicca_cart_coupon', JSON.stringify(this.coupon))
      if (this.selectedSample) {
        localStorage.setItem('gicca_selected_sample', this.selectedSample)
      }
    },

    addItem(product, chosenSize = null, quantity = 1) {
      const sizeObj = chosenSize || product.sizes.find(s => s.default) || product.sizes[0]
      const sizeLabel = typeof sizeObj === 'string' ? sizeObj : sizeObj.size
      const sizePrice = typeof sizeObj === 'object' ? sizeObj.price : product.price

      const existingIndex = this.items.findIndex(
        i => i.id === product.id && i.size === sizeLabel
      )

      if (existingIndex > -1) {
        this.items[existingIndex].quantity += quantity
      } else {
        this.items.push({
          id: product.id,
          slug: product.slug,
          brand: product.brand,
          name: product.name,
          concentration: product.concentration,
          image: product.images[0],
          size: sizeLabel,
          price: sizePrice,
          originalPrice: product.originalPrice,
          quantity: quantity
        })
      }

      this.persist()
      this.isDrawerOpen = true
    },

    removeItem(productId, size) {
      this.items = this.items.filter(i => !(i.id === productId && i.size === size))
      this.persist()
    },

    updateQuantity(productId, size, newQty) {
      const item = this.items.find(i => i.id === productId && i.size === size)
      if (item) {
        if (newQty <= 0) {
          this.removeItem(productId, size)
        } else {
          item.quantity = newQty
          this.persist()
        }
      }
    },

    applyCoupon(code) {
      const clean = code.trim().toUpperCase()
      if (clean === 'GICCA10' || clean === 'PERFUME10') {
        this.coupon = { code: clean, type: 'percentage', value: 10, label: '10% OFF en tu orden' }
        this.persist()
        return { success: true, message: 'Cupón del 10% OFF aplicado con éxito' }
      } else if (clean === 'LUJO15') {
        this.coupon = { code: clean, type: 'percentage', value: 15, label: '15% OFF Exclusivo' }
        this.persist()
        return { success: true, message: 'Cupón del 15% OFF aplicado con éxito' }
      } else if (clean === 'BIENVENIDO') {
        this.coupon = { code: clean, type: 'fixed', value: 10000, label: '$10.000 OFF de Bienvenida' }
        this.persist()
        return { success: true, message: 'Cupón de bienvenida de $10.000 aplicado' }
      } else {
        return { success: false, message: 'El cupón ingresado no es válido o ha expirado.' }
      }
    },

    removeCoupon() {
      this.coupon = null
      this.persist()
    },

    selectSample(sampleName) {
      this.selectedSample = sampleName
      this.persist()
    },

    openDrawer() {
      this.isDrawerOpen = true
    },

    closeDrawer() {
      this.isDrawerOpen = false
    },

    clearCart() {
      this.items = []
      this.coupon = null
      this.persist()
    }
  }
})
