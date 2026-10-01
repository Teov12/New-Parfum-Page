import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'gicca', index: true },
  id: { type: String, required: true, index: true },
  slug: { type: String, required: true, index: true },
  brand: { type: String, default: 'Gicca' },
  name: { type: String, required: true },
  concentration: { type: String, default: 'Eau de Parfum' },
  gender: { type: String, default: 'unisex' },
  category: { type: String, default: 'disenador' },
  fragranceFamily: { type: String, default: 'Floral' },
  price: { type: Number, default: 0 },
  transferPrice: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  originalPrice: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  badge: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  description: { type: String, default: '' },
  images: [{ type: String }],
  sizes: [{
    size: String,
    price: Number,
    transferPrice: Number,
    costPrice: Number,
    // Stock propio de la presentación. Si no está definido, se usa el stock general del producto.
    stock: Number,
    default: Boolean
  }],
  olfactoryPyramid: {
    topNotes: [String],
    heartNotes: [String],
    baseNotes: [String]
  },
  characteristics: {
    longevity: { type: String, default: '8 a 12 horas' },
    sillage: { type: String, default: 'Moderada' },
    season: { type: mongoose.Schema.Types.Mixed, default: 'Todo el año' },
    occasion: { type: String, default: 'Uso diario y ocasiones especiales' },
    timeOfDay: { type: String, default: 'Versátil (Día y Noche)' },
    situations: { type: mongoose.Schema.Types.Mixed, default: () => [] }
  },
  usageTips: { type: String, default: 'Pulverizar en puntos de pulso (cuello y muñecas).' },
  stock: { type: Number, default: 10 }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema)
