import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  orderNumber: { type: String, required: true, unique: true, index: true },
  date: { type: String, default: () => new Date().toISOString() },
  customer: {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    dni: { type: String, default: '' },
    address: { type: String, default: '' },
    apartment: { type: String, default: '' },
    city: { type: String, default: 'Córdoba' },
    province: { type: String, default: 'Córdoba' },
    postalCode: { type: String, default: '' }
  },
  items: [{
    id: String,
    name: String,
    brand: String,
    size: String,
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 }
  }],
  subtotal: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  transferDiscount: { type: Number, default: 0 },
  couponDiscount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  profitMargin: { type: Number, default: 0 },
  shippingMethod: { type: String, default: 'Andreani Estándar a Domicilio' },
  pickupBranch: { type: Object, default: null },
  paymentMethod: { type: String, default: 'transfer' },
  paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'cancelled', 'refunded'] },
  fulfillmentStatus: { type: String, default: 'unfulfilled', enum: ['unfulfilled', 'packing', 'shipped', 'delivered'] },
  trackingCode: { type: String, default: '' },
  notes: { type: String, default: '' },
  source: { type: String, default: 'web' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
