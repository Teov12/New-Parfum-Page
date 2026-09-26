import mongoose from 'mongoose'

const siteContentSchema = new mongoose.Schema({
  tenantId: { type: String, default: 'gicca', index: true },
  key: { type: String, default: 'global_content' },
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
