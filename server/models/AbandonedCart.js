import mongoose from 'mongoose'

// Carritos que llegaron al checkout con email pero no se convirtieron en pedido
const abandonedCartSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  firstName: { type: String, default: '' },
  items: [{
    id: String,
    name: String,
    size: String,
    quantity: Number,
    price: Number,
    image: String
  }],
  subtotal: { type: Number, default: 0 },
  // Token para restaurar el carrito desde el email y para darse de baja
  token: { type: String, required: true },
  reminderSentAt: { type: Date },
  recoveredAt: { type: Date },
  unsubscribed: { type: Boolean, default: false }
}, { timestamps: true })

abandonedCartSchema.index({ tenantId: 1, email: 1 })

export const AbandonedCart = mongoose.models.AbandonedCart || mongoose.model('AbandonedCart', abandonedCartSchema)
