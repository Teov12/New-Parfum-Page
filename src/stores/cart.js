import { defineStore } from 'pinia'
import { useShippingStore } from './shipping'
import { useTenantStore } from './tenant'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem('gicca_cart_items') || '[]'),
    coupon: JSON.parse(localStorage.getItem('gicca_cart_coupon') || 'null'),
    isDrawerOpen: false
  }),

  getters: {
    totalItems: (state) => state.items.reduce((acc, item) => acc + item.quantity, 0),
    
    subtotal: (state) => {
      return state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    },

    transferSubtotal: (state) => {
      return state.items.reduce((acc, item) => {
        const itemTransfer = Number(item.transferPrice) || (item.price > 0 ? Math.round(item.price * 0.72) : 0)
        return acc + (itemTransfer * item.quantity)
      }, 0)
    },

    transferDiscount: (state) => {
      return Math.max(0, state.items.reduce((acc, item) => {
        const itemPrice = Number(item.price) || 0
        const itemTransfer = Number(item.transferPrice) || (itemPrice > 0 ? Math.round(itemPrice * 0.72) : 0)
        return acc + ((itemPrice - itemTransfer) * item.quantity)
      }, 0))
    },

    discountAmount: (state) => {
      if (!state.coupon) return 0
      const subtotal = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      if (state.coupon.type === 'percentage') {
        return Math.round((subtotal * state.coupon.value) / 100)
      }
      if (state.coupon.type === 'fixed') {
        return Math.min(subtotal, state.coupon.value)
      }
      return 0
    },

    // Umbral de envío gratis configurado por la tienda (Infinity = no ofrece envío gratis)
    freeShippingThreshold() {
      return useTenantStore().freeShippingThreshold
    },

    hasFreeShippingOffer() {
      return Number.isFinite(this.freeShippingThreshold)
    },

    shippingCost() {
      if (this.subtotal === 0) return 0
      if (this.subtotal >= this.freeShippingThreshold) return 0
      const shippingStore = useShippingStore()
      return shippingStore.currentShippingCost
    },

    total() {
      return Math.max(0, this.subtotal - this.discountAmount) + this.shippingCost
    },

    transferTotal() {
      return Math.max(0, this.transferSubtotal - this.discountAmount) + this.shippingCost
    },

    amountForFreeShipping() {
      if (!this.hasFreeShippingOffer) return 0
      return Math.max(0, this.freeShippingThreshold - this.subtotal)
    },

    freeShippingProgress() {
      if (!this.hasFreeShippingOffer) return 0
      return Math.min(100, Math.round((this.subtotal / this.freeShippingThreshold) * 100))
    }
  },

  actions: {
    persist() {
      localStorage.setItem('gicca_cart_items', JSON.stringify(this.items))
      localStorage.setItem('gicca_cart_coupon', JSON.stringify(this.coupon))
    },

    addItem(product, chosenSize = null, quantity = 1) {
      const sizeObj = chosenSize || product.sizes.find(s => s.default) || product.sizes[0]
      const sizeLabel = typeof sizeObj === 'string' ? sizeObj : sizeObj.size
      const sizePrice = typeof sizeObj === 'object' ? sizeObj.price : product.price
      const sizeTransferPrice = typeof sizeObj === 'object' && sizeObj.transferPrice !== undefined && sizeObj.transferPrice !== null
        ? Number(sizeObj.transferPrice)
        : (product.transferPrice || (sizePrice > 0 ? Math.round(sizePrice * 0.72) : 0))

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
          transferPrice: sizeTransferPrice,
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

    // Los cupones se validan en el servidor de la tienda (el monto final también se recalcula allí)
    async applyCoupon(code) {
      const clean = (code || '').trim().toUpperCase()
      if (!clean) return { success: false, message: 'Ingresá un código de cupón.' }

      try {
        const res = await fetch('/api/checkout/coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: clean })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.coupon) {
          return { success: false, message: data.message || data.error || 'El cupón ingresado no es válido o ha expirado.' }
        }

        const { coupon } = data
        this.coupon = coupon
        this.persist()
        const label = coupon.type === 'percentage'
          ? `${coupon.value}% OFF`
          : `$${Number(coupon.value).toLocaleString('es-AR')} OFF`
        return { success: true, message: `Cupón ${coupon.code} aplicado: ${coupon.label || label}` }
      } catch (err) {
        return { success: false, message: 'No pudimos validar el cupón. Revisá tu conexión e intentá de nuevo.' }
      }
    },

    removeCoupon() {
      this.coupon = null
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
