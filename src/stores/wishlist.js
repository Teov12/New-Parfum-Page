import { defineStore } from 'pinia'

export const useWishlistStore = defineStore('wishlist', {
  state: () => ({
    items: JSON.parse(localStorage.getItem('gicca_wishlist') || '[]'),
  }),

  getters: {
    totalItems: (state) => state.items.length,
    isInWishlist: (state) => (productId) => state.items.includes(productId),
  },

  actions: {
    persist() {
      localStorage.setItem('gicca_wishlist', JSON.stringify(this.items))
    },

    toggleWishlist(productId) {
      if (this.items.includes(productId)) {
        this.items = this.items.filter(id => id !== productId)
      } else {
        this.items.push(productId)
      }
      this.persist()
    }
  }
})
