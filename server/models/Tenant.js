import mongoose from 'mongoose'

const tenantSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true, 
    index: true 
  },
  name: { 
    type: String, 
    required: true, 
    default: 'Gicca Perfumes' 
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true 
  },
  domain: { 
    type: String, 
    default: '' 
  },
  subdomain: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'trial'], 
    default: 'active' 
  },
  plan: { 
    type: String, 
    enum: ['basic', 'pro', 'enterprise'], 
    default: 'pro' 
  },
  
  // Custom Branding per Perfumería
  branding: {
    logoUrl: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    storeIcon: { type: String, default: 'spa' },
    faviconUrl: { type: String, default: '' },
    tagline: { type: String, default: 'Atelier de Alta Perfumería' },
    paletteId: { type: String, default: 'amber' },
    primaryColor: { type: String, default: '#2E1911' },
    primaryContainer: { type: String, default: '#784233' },
    surface: { type: String, default: '#fffdfa' },
    accentColor: { type: String, default: '#D4AF37' },
    instagramUrl: { type: String, default: 'https://instagram.com/giccaparfum' },
    whatsappNumber: { type: String, default: '+5493564123456' }
  },
  
  // Commercial & Financial Settings
  commercial: {
    cbu: { type: String, default: '' },
    alias: { type: String, default: 'GICCA.PERFUMES' },
    bankName: { type: String, default: 'Banco Galicia' },
    accountHolder: { type: String, default: 'Gicca Perfumes S.A.' },
    cuit: { type: String, default: '20-12345678-9' },
    mercadoPagoAccessToken: { type: String, default: '' },
    mercadoPagoPublicKey: { type: String, default: '' },
    mpAccessToken: { type: String, default: '' },
    mpPublicKey: { type: String, default: '' },
    // Clave secreta para validar la firma de los webhooks de Mercado Pago (opcional)
    mpWebhookSecret: { type: String, default: '' },
    cardFeeRate: { type: Number, default: 28 }, // 28% de recargo para 6 cuotas sin interes
    andreaniContractNumber: { type: String, default: '' },
    freeShippingThreshold: { type: Number, default: 250000 }
  },

  // Cupones de descuento propios de la tienda (validados siempre del lado del servidor)
  coupons: {
    type: [{
      code: { type: String, uppercase: true, trim: true },
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 0 },
      label: { type: String, default: '' },
      active: { type: Boolean, default: true }
    }],
    default: undefined
  },

  // Credenciales del dueño de la tienda para el panel de administración
  adminUser: {
    email: { type: String, default: '', lowercase: true, trim: true },
    passwordHash: { type: String, default: '' }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema)
