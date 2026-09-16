import mongoose from 'mongoose'

const siteContentSchema = new mongoose.Schema({
  key: { type: String, default: 'global_content', unique: true },
  heroSlides: [{ type: Object }],
  mainCategories: [{ type: Object }],
  olfactiveFamilies: [{ type: Object }],
  editorial: { type: Object, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

export const SiteContent = mongoose.models.SiteContent || mongoose.model('SiteContent', siteContentSchema)
