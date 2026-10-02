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
    default: 'Mi Perfumería'
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
  // Dominio propio pendiente de verificar con un registro TXT (recién verificado pasa a "domain")
  pendingDomain: { type: String, default: '' },
  domainVerificationToken: { type: String, default: '' },
  // Estado de la tienda online (suspended = pausada: no vende y muestra aviso)
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial'],
    default: 'active'
  },
  suspendedReason: { type: String, default: '' },
  // Tienda de ejemplo del entorno demo (se reinicia sola y bloquea acciones sensibles)
  isDemo: { type: Boolean, default: false },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    default: 'pro'
  },

  // Suscripción de la tienda a la plataforma (cobrada con Mercado Pago Suscripciones)
  billing: {
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'cancelled', 'exempt'],
      default: 'trialing'
    },
    trialEndsAt: { type: Date },
    currentPeriodEnd: { type: Date },
    pastDueSince: { type: Date },
    preapprovalId: { type: String, default: '' },
    pendingPlan: { type: String, default: '' },
    pendingPreapprovalId: { type: String, default: '' },
    lastPaymentAt: { type: Date }
  },

  // Custom Branding per Perfumería
  branding: {
    logoUrl: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    storeIcon: { type: String, default: 'spa' },
    faviconUrl: { type: String, default: '' },
    tagline: { type: String, default: '' },
    paletteId: { type: String, default: 'amber' },
    primaryColor: { type: String, default: '#2E1911' },
    primaryContainer: { type: String, default: '#784233' },
    surface: { type: String, default: '#fffdfa' },
    accentColor: { type: String, default: '#D4AF37' },
    instagramUrl: { type: String, default: '' },
    instagram: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    // Email de contacto que se muestra en la tienda (contacto y pie de página)
    contactEmail: { type: String, default: '' },
    // false = la tienda recién creada todavía no completó el asistente inicial del panel
    onboardingCompleted: { type: Boolean, default: true }
  },

  // Posicionamiento en buscadores y vista previa al compartir (WhatsApp, Instagram, Facebook)
  seo: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    keywords: { type: String, default: '' },
    ogImage: { type: String, default: '' }
  },

  // Commercial & Financial Settings
  commercial: {
    cbu: { type: String, default: '' },
    alias: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    cuit: { type: String, default: '' },
    // Email donde la tienda recibe avisos de ventas (y reply-to de los emails a clientes)
    notificationEmail: { type: String, default: '' },
    mercadoPagoAccessToken: { type: String, default: '' },
    mercadoPagoPublicKey: { type: String, default: '' },
    mpAccessToken: { type: String, default: '' },
    mpPublicKey: { type: String, default: '' },
    // Clave secreta para validar la firma de los webhooks de Mercado Pago (opcional)
    mpWebhookSecret: { type: String, default: '' },
    // Cuenta de Mercado Pago conectada por OAuth desde el panel
    mpConnection: {
      method: { type: String, enum: ['', 'manual', 'oauth'], default: '' },
      userId: { type: String, default: '' },
      nickname: { type: String, default: '' },
      refreshToken: { type: String, default: '' },
      expiresAt: { type: Date },
      connectedAt: { type: Date }
    },
    maxInstallments: { type: Number, default: 6 },
    cardFeeRate: { type: Number, default: 28 },
    andreaniContractNumber: { type: String, default: '' },
    // Credenciales propias de Andreani (password cifrada)
    andreani: {
      username: { type: String, default: '' },
      password: { type: String, default: '' },
      clientCode: { type: String, default: '' },
      contractDomicilio: { type: String, default: '' },
      contractSucursal: { type: String, default: '' },
      contractUrgente: { type: String, default: '' },
      originZip: { type: String, default: '' },
      // Dirección desde donde se despachan los pedidos
      originStreet: { type: String, default: '' },
      originNumber: { type: String, default: '' },
      originCity: { type: String, default: '' },
      originProvince: { type: String, default: '' },
      sandbox: { type: Boolean, default: true },
      // La tienda no ofrece Andreani (solo sus métodos propios)
      disabled: { type: Boolean, default: false }
    },
    freeShippingThreshold: { type: Number, default: 250000 }
  },

  // Métodos de envío propios además de Andreani (retiro en local, moto, tarifa fija)
  shippingMethods: [{
    id: { type: String },
    type: { type: String, enum: ['pickup', 'local', 'flat'], default: 'flat' },
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    freeOver: { type: Number, default: 0 },
    // Prefijos o rangos de CP habilitados (ej: "5000-5020", "50"). Vacío = todo el país
    postalCodes: [{ type: String }],
    estimatedDays: { type: String, default: '' },
    active: { type: Boolean, default: true }
  }],

  // Cupones de descuento propios de la tienda (validados siempre del lado del servidor)
  coupons: {
    type: [{
      code: { type: String, uppercase: true, trim: true },
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
      value: { type: Number, default: 0 },
      label: { type: String, default: '' },
      minPurchase: { type: Number, default: 0 },
      expiresAt: { type: Date },
      usageLimit: { type: Number, default: 0 },
      usedCount: { type: Number, default: 0 },
      active: { type: Boolean, default: true }
    }],
    default: undefined
  },

  // Textos legales e información obligatoria (Ley 24.240 / Res. 424/2020)
  legal: {
    legalName: { type: String, default: '' },
    address: { type: String, default: '' },
    termsText: { type: String, default: '' },
    privacyText: { type: String, default: '' },
    returnsText: { type: String, default: '' },
    // Formulario 960 / Data Fiscal de ARCA (link al QR)
    fiscalDataUrl: { type: String, default: '' },
    fiscalDataImageUrl: { type: String, default: '' }
  },

  // Integraciones de marketing
  marketing: {
    metaPixelId: { type: String, default: '' },
    ga4Id: { type: String, default: '' },
    gtmId: { type: String, default: '' },
    googleSiteVerification: { type: String, default: '' }
  },

  // Facturación electrónica ARCA (ex AFIP)
  invoicing: {
    enabled: { type: Boolean, default: false },
    cuit: { type: String, default: '' },
    pointOfSale: { type: Number, default: 1 },
    taxCondition: { type: String, enum: ['monotributo', 'responsable_inscripto'], default: 'monotributo' },
    production: { type: Boolean, default: false },
    autoIssueOnPaid: { type: Boolean, default: false },
    certificate: { type: String, default: '' },
    privateKey: { type: String, default: '' },
    afipSdkToken: { type: String, default: '' }
  },

  // Alertas y automatizaciones
  automations: {
    lowStockThreshold: { type: Number, default: 2 },
    lowStockAlerts: { type: Boolean, default: true },
    abandonedCartEmails: { type: Boolean, default: true }
  },

  // Credenciales del dueño de la tienda para el panel de administración
  adminUser: {
    email: { type: String, default: '', lowercase: true, trim: true },
    passwordHash: { type: String, default: '' }
  },

  // Usuarios del equipo (acceso a pedidos y catálogo, sin configuración ni facturación)
  staff: [{
    email: { type: String, lowercase: true, trim: true },
    name: { type: String, default: '' },
    passwordHash: { type: String, default: '' },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema)
