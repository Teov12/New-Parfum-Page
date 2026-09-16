import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  brand: { type: String, default: 'Gicca' },
  name: { type: String, required: true },
  concentration: { type: String, default: 'Eau de Parfum' },
  gender: { type: String, default: 'unisex' },
  category: { type: String, default: 'disenador' },
  fragranceFamily: { type: String, default: 'Floral' },
  price: { type: Number, default: 0 },
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
    costPrice: Number,
    default: Boolean
  }],
  olfactoryPyramid: {
    topNotes: [String],
    heartNotes: [String],
    baseNotes: [String]
  },
  characteristics: {
    longevity: String,
    sillage: String,
    season: String,
    occasion: String
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
