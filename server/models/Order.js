import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'gicca', index: true },
  id: { type: String, required: true, index: true },
  orderNumber: { type: String, required: true, index: true },
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
  couponCode: { type: String, default: '' },
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
  shippingCarrier: { type: String, default: '' },
  shippingLabelUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  source: { type: String, default: 'web' },
  // Factura electrónica ARCA del pedido
  invoice: {
    type: { type: String, default: '' },
    cbteTipo: { type: Number },
    pointOfSale: { type: Number },
    number: { type: Number },
    cae: { type: String, default: '' },
    caeExpiresAt: { type: String, default: '' },
    issuedAt: { type: Date },
    total: { type: Number },
    production: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  // Token secreto para que el comprador vea su comprobante sin exponer pedidos ajenos
  accessToken: { type: String, default: '' },
  // true cuando el stock reservado por el pedido ya fue devuelto (pedido cancelado)
  stockReleased: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
