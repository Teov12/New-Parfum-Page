import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { Tenant } from '../models/Tenant.js'
import { Product } from '../models/Product.js'
import { isMongoConnected } from '../dbConnection.js'
import { DEFAULT_TENANT_CONFIG, clearTenantCache, getLocalDefaultTenant } from '../middleware/tenant.js'
import { PLATFORM, PLAN_IDS, getPlan, getStoreUrl, getStoreEntryUrl, getTenantLimits, isBillingExempt, getDefaultTenantId, isDemoStore } from '../config/platform.js'
import { createProduct } from '../db.js'
import { encryptSecret, secretHint } from './secrets.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STARTER_CATALOG_FILE = path.join(__dirname, '..', 'data', 'starter-catalog.json')

export const MIN_PASSWORD_LENGTH = 8

// Subdominios que no puede tomar una tienda (los usa la plataforma)
export const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'app', 'superadmin', 'mail', 'static', 'cdn', 'soporte', 'ayuda', 'blog', 'plataforma']

export class TenantError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export const normalizeDomain = (value) => String(value || '')
  .replace(/^https?:\/\//i, '')
  .replace(/\/.*$/, '')
  .trim()
  .toLowerCase()

export const normalizeEmail = (email) => String(email || '').toLowerCase().trim()
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const slugifyStoreName = (name) => String(name || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40)

// Nombre del registro TXT con el que una tienda demuestra que el dominio es suyo
export const domainVerificationRecord = (domain) => `_verificacion-tienda.${domain}`

/**
 * Identificadores y dominios de la tienda principal: aunque todavía viva en tenant.json
 * (sin registro en MongoDB), ninguna otra tienda puede tomarlos.
 */
const getDefaultStoreReservations = () => {
  const local = getLocalDefaultTenant()
  const ids = new Set([getDefaultTenantId(), local.subdomain].filter(Boolean).map(v => String(v).toLowerCase()))
  const domains = [local.domain, DEFAULT_TENANT_CONFIG.domain, ...(process.env.RESERVED_DOMAINS || '').split(',')]
  if (process.env.SITE_URL) {
    try { domains.push(new URL(process.env.SITE_URL).hostname) } catch { /* URL inválida */ }
  }
  return {
    ids,
    domains: new Set(domains.map(normalizeDomain).filter(Boolean).map(d => d.replace(/^www\./, '')))
  }
}

export const isReservedStoreId = (value) => getDefaultStoreReservations().ids.has(String(value || '').toLowerCase())

/**
 * Valida que el dominio y subdominio no estén tomados por otra tienda
 * (si no, el ruteo por dominio podría mostrar una tienda ajena).
 */
export const validateRouting = async ({ tenantId, domain, subdomain }) => {
  if (subdomain) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(subdomain) || subdomain.length < 3) {
      throw new TenantError('El subdominio debe tener entre 3 y 40 caracteres: letras minúsculas, números y guiones.', 409)
    }
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      throw new TenantError(`El subdominio "${subdomain}" está reservado por la plataforma.`, 409)
    }
  }

  // Lo de la tienda principal solo lo puede usar la tienda principal
  if (tenantId !== getDefaultTenantId()) {
    const reserved = getDefaultStoreReservations()
    if (subdomain && reserved.ids.has(subdomain)) {
      throw new TenantError(`El subdominio "${subdomain}" no está disponible.`, 409)
    }
    if (domain && reserved.domains.has(domain.replace(/^www\./, ''))) {
      throw new TenantError(`El dominio "${domain}" no está disponible.`, 409)
    }
  }
  if (domain) {
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      throw new TenantError('El dominio no es válido (ej: miperfumeria.com.ar).', 409)
    }
    if (PLATFORM.domain && (domain === PLATFORM.domain || domain.endsWith(`.${PLATFORM.domain}`))) {
      throw new TenantError('Ese dominio pertenece a la plataforma. Usá el campo subdominio.', 409)
    }
  }

  if (!isMongoConnected()) return

  if (domain && await Tenant.exists({ tenantId: { $ne: tenantId }, domain: { $in: [domain, domain.replace(/^www\./, '')] } })) {
    throw new TenantError(`El dominio "${domain}" ya está asociado a otra tienda.`, 409)
  }
  if (subdomain && await Tenant.exists({ tenantId: { $ne: tenantId }, subdomain })) {
    throw new TenantError(`El subdominio "${subdomain}" ya está en uso por otra tienda.`, 409)
  }
}

export const isSubdomainAvailable = async (subdomain) => {
  try {
    await validateRouting({ tenantId: '__new__', subdomain })
  } catch {
    return false
  }
  if (!isMongoConnected()) return false
  return !(await Tenant.exists({ $or: [{ tenantId: subdomain }, { slug: subdomain }] }))
}

// Nunca exponer hashes de contraseña ni credenciales en listados
export const toSafeTenant = (tenant, req = null) => {
  if (!tenant) return tenant
  const plain = typeof tenant.toObject === 'function' ? tenant.toObject() : tenant
  const { adminUser, staff, invoicing, ...rest } = plain
  const commercial = { ...(rest.commercial || {}) }
  delete commercial.mpAccessToken
  delete commercial.mercadoPagoAccessToken
  delete commercial.mpWebhookSecret
  if (commercial.mpConnection) {
    commercial.mpConnection = { ...commercial.mpConnection }
    delete commercial.mpConnection.refreshToken
  }
  if (commercial.andreani) {
    commercial.andreani = { ...commercial.andreani, password: '' }
  }
  return {
    ...rest,
    commercial,
    adminEmail: adminUser?.email || '',
    hasAdminUser: Boolean(adminUser?.passwordHash),
    staffCount: (staff || []).length,
    storeUrl: getStoreEntryUrl(plain, req, '/'),
    isDefaultStore: plain.tenantId === getDefaultTenantId()
  }
}

/**
 * Configuración pública de la tienda (la que recibe cualquier visitante). Nunca incluye credenciales.
 */
export const toPublicTenant = (tenant, req = null) => {
  const commercial = tenant?.commercial || {}
  const legal = tenant?.legal || {}
  const marketing = tenant?.marketing || {}
  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain,
    subdomain: tenant.subdomain,
    status: req?.storeNotFound ? 'not_found' : (tenant.status || 'active'),
    isPlatformHost: Boolean(req?.isPlatformHost),
    isDemo: isDemoStore(tenant),
    platform: { name: PLATFORM.name, domain: PLATFORM.domain, demoMode: PLATFORM.demoMode },
    branding: tenant.branding || DEFAULT_TENANT_CONFIG.branding,
    commercial: {
      alias: commercial.alias || '',
      cbu: commercial.cbu || '',
      bankName: commercial.bankName || '',
      accountHolder: commercial.accountHolder || '',
      cardFeeRate: commercial.cardFeeRate ?? 20,
      maxInstallments: commercial.maxInstallments ?? 6,
      freeShippingThreshold: commercial.freeShippingThreshold ?? 250000
    },
    legal: {
      legalName: legal.legalName || '',
      address: legal.address || '',
      cuit: commercial.cuit || '',
      termsText: legal.termsText || '',
      privacyText: legal.privacyText || '',
      returnsText: legal.returnsText || '',
      fiscalDataUrl: legal.fiscalDataUrl || '',
      fiscalDataImageUrl: legal.fiscalDataImageUrl || ''
    },
    marketing: {
      metaPixelId: marketing.metaPixelId || '',
      ga4Id: marketing.ga4Id || '',
      gtmId: marketing.gtmId || ''
    }
  }
}

/**
 * Configuración visible para el dueño en el panel: las credenciales se reemplazan por una pista.
 */
export const toOwnerSettings = (tenant) => {
  const commercial = {
    ...DEFAULT_TENANT_CONFIG.commercial,
    ...(tenant.commercial || {})
  }
  const mpToken = commercial.mpAccessToken || commercial.mercadoPagoAccessToken || ''
  const andreani = commercial.andreani || {}
  const invoicing = tenant.invoicing || {}

  return {
    tenantId: tenant.tenantId,
    name: tenant.name || '',
    domain: tenant.domain || '',
    pendingDomain: tenant.pendingDomain || '',
    domainVerification: tenant.pendingDomain
      ? { type: 'TXT', name: domainVerificationRecord(tenant.pendingDomain), value: tenant.domainVerificationToken || '' }
      : null,
    subdomain: tenant.subdomain || '',
    status: tenant.status || 'active',
    plan: tenant.plan || 'pro',
    storeUrl: getStoreUrl(tenant),
    branding: tenant.branding || DEFAULT_TENANT_CONFIG.branding,
    seo: tenant.seo || {},
    legal: tenant.legal || {},
    marketing: tenant.marketing || {},
    automations: tenant.automations || {},
    shippingMethods: tenant.shippingMethods || [],
    commercial: {
      ...commercial,
      mpAccessToken: '',
      mercadoPagoAccessToken: '',
      mpAccessTokenSet: Boolean(mpToken),
      mpAccessTokenHint: secretHint(mpToken),
      mpPublicKey: commercial.mpPublicKey || commercial.mercadoPagoPublicKey || '',
      mpWebhookSecret: '',
      mpWebhookSecretSet: Boolean(commercial.mpWebhookSecret),
      mpConnection: {
        method: commercial.mpConnection?.method || (mpToken ? 'manual' : ''),
        nickname: commercial.mpConnection?.nickname || '',
        userId: commercial.mpConnection?.userId || '',
        connectedAt: commercial.mpConnection?.connectedAt || null,
        expiresAt: commercial.mpConnection?.expiresAt || null
      },
      andreani: {
        ...andreani,
        password: '',
        passwordSet: Boolean(andreani.password)
      }
    },
    invoicing: {
      ...invoicing,
      certificate: '',
      certificateSet: Boolean(invoicing.certificate),
      privateKey: '',
      privateKeySet: Boolean(invoicing.privateKey),
      afipSdkToken: '',
      afipSdkTokenSet: Boolean(invoicing.afipSdkToken)
    },
    adminEmail: tenant.adminUser?.email || '',
    limits: getTenantLimits(tenant)
  }
}

const pickFields = (source, fields) => {
  const out = {}
  if (!source || typeof source !== 'object') return out
  for (const field of fields) {
    if (source[field] !== undefined) out[field] = source[field]
  }
  return out
}

// Un secreto vacío en el formulario significa "mantener el actual"; clearX=true lo borra
const mergeSecret = (current, incoming, clear) => {
  if (clear) return ''
  if (incoming === undefined || incoming === null || incoming === '') return current || ''
  return encryptSecret(String(incoming).trim())
}

const BRANDING_FIELDS = ['logoUrl', 'iconUrl', 'storeIcon', 'faviconUrl', 'tagline', 'paletteId', 'primaryColor', 'primaryContainer', 'surface', 'accentColor', 'instagramUrl', 'instagram', 'whatsappNumber', 'contactEmail', 'onboardingCompleted']
const COMMERCIAL_FIELDS = ['cbu', 'alias', 'bankName', 'accountHolder', 'cuit', 'notificationEmail', 'mpPublicKey', 'maxInstallments', 'cardFeeRate', 'andreaniContractNumber', 'freeShippingThreshold']
const ANDREANI_FIELDS = ['username', 'clientCode', 'contractDomicilio', 'contractSucursal', 'contractUrgente', 'originZip', 'originStreet', 'originNumber', 'originCity', 'originProvince', 'sandbox', 'disabled']
const SEO_FIELDS = ['title', 'description', 'keywords', 'ogImage']
const LEGAL_FIELDS = ['legalName', 'address', 'termsText', 'privacyText', 'returnsText', 'fiscalDataUrl', 'fiscalDataImageUrl']
const MARKETING_FIELDS = ['metaPixelId', 'ga4Id', 'gtmId', 'googleSiteVerification']
const AUTOMATION_FIELDS = ['lowStockThreshold', 'lowStockAlerts', 'abandonedCartEmails']
const INVOICING_FIELDS = ['enabled', 'cuit', 'pointOfSale', 'taxCondition', 'production', 'autoIssueOnPaid']

const sanitizeShippingMethods = (methods) => {
  if (!Array.isArray(methods)) return undefined
  return methods.slice(0, 20).map((m, index) => ({
    id: String(m.id || `custom_${Date.now()}_${index}`).slice(0, 60),
    type: ['pickup', 'local', 'flat'].includes(m.type) ? m.type : 'flat',
    name: String(m.name || 'Envío').slice(0, 80),
    description: String(m.description || '').slice(0, 300),
    price: Math.max(0, Number(m.price) || 0),
    freeOver: Math.max(0, Number(m.freeOver) || 0),
    postalCodes: (Array.isArray(m.postalCodes) ? m.postalCodes : String(m.postalCodes || '').split(','))
      .map(cp => String(cp).trim())
      .filter(Boolean)
      .slice(0, 100),
    estimatedDays: String(m.estimatedDays || '').slice(0, 40),
    active: m.active !== false
  }))
}

/**
 * Aplica una actualización de configuración enviada por el dueño sobre la configuración actual.
 * Solo campos permitidos; credenciales cifradas y conservadas si llegan vacías.
 */
export const mergeOwnerSettings = (current, body) => {
  const currentCommercial = current.commercial || {}
  const next = {}

  if (body.name !== undefined) next.name = String(body.name).trim().slice(0, 80) || current.name
  // El dominio pedido no se activa directo: lo decide la ruta (verificación por DNS)
  if (body.domain !== undefined) next.requestedDomain = normalizeDomain(body.domain)
  if (body.subdomain !== undefined) next.subdomain = String(body.subdomain).trim().toLowerCase()

  if (body.branding) next.branding = { ...(current.branding || {}), ...pickFields(body.branding, BRANDING_FIELDS) }
  if (body.seo) next.seo = { ...(current.seo || {}), ...pickFields(body.seo, SEO_FIELDS) }
  if (body.legal) next.legal = { ...(current.legal || {}), ...pickFields(body.legal, LEGAL_FIELDS) }
  if (body.marketing) next.marketing = { ...(current.marketing || {}), ...pickFields(body.marketing, MARKETING_FIELDS) }
  if (body.automations) next.automations = { ...(current.automations || {}), ...pickFields(body.automations, AUTOMATION_FIELDS) }

  const methods = sanitizeShippingMethods(body.shippingMethods)
  if (methods) next.shippingMethods = methods

  if (body.commercial) {
    const incoming = body.commercial
    const commercial = { ...currentCommercial, ...pickFields(incoming, COMMERCIAL_FIELDS) }

    if (commercial.maxInstallments !== undefined) {
      commercial.maxInstallments = Math.min(24, Math.max(1, Math.round(Number(commercial.maxInstallments) || 1)))
    }

    const clearMp = incoming.clearMpCredentials === true
    const token = mergeSecret(
      currentCommercial.mpAccessToken || currentCommercial.mercadoPagoAccessToken,
      incoming.mpAccessToken || incoming.mercadoPagoAccessToken,
      clearMp
    )
    commercial.mpAccessToken = token
    commercial.mercadoPagoAccessToken = token
    commercial.mpPublicKey = clearMp ? '' : (incoming.mpPublicKey ?? currentCommercial.mpPublicKey ?? currentCommercial.mercadoPagoPublicKey ?? '')
    commercial.mercadoPagoPublicKey = commercial.mpPublicKey
    if (clearMp) {
      commercial.mpConnection = { method: '', userId: '', nickname: '', refreshToken: '' }
    } else if (incoming.mpAccessToken && currentCommercial.mpConnection?.method !== 'oauth') {
      commercial.mpConnection = { ...(currentCommercial.mpConnection || {}), method: 'manual', connectedAt: new Date() }
    }
    commercial.mpWebhookSecret = mergeSecret(currentCommercial.mpWebhookSecret, incoming.mpWebhookSecret, incoming.clearMpWebhookSecret === true)

    if (incoming.andreani) {
      const currentAndreani = currentCommercial.andreani || {}
      commercial.andreani = {
        ...currentAndreani,
        ...pickFields(incoming.andreani, ANDREANI_FIELDS),
        password: mergeSecret(currentAndreani.password, incoming.andreani.password, incoming.andreani.clearPassword === true)
      }
    }
    next.commercial = commercial
  }

  if (body.invoicing) {
    const currentInvoicing = current.invoicing || {}
    next.invoicing = {
      ...currentInvoicing,
      ...pickFields(body.invoicing, INVOICING_FIELDS),
      // El certificado es público; la clave privada y el token de AFIP SDK se cifran
      certificate: body.invoicing.certificate ? String(body.invoicing.certificate).trim() : (currentInvoicing.certificate || ''),
      privateKey: mergeSecret(currentInvoicing.privateKey, body.invoicing.privateKey, body.invoicing.clearPrivateKey === true),
      afipSdkToken: mergeSecret(currentInvoicing.afipSdkToken, body.invoicing.afipSdkToken, body.invoicing.clearAfipSdkToken === true)
    }
  }

  return next
}

/**
 * Resuelve el cambio de dominio pedido desde el panel:
 * - vacío: se quita el dominio propio
 * - tienda principal o superadmin: se activa directo
 * - resto: queda pendiente hasta verificar el registro TXT (evita que una tienda tome un dominio ajeno)
 */
export const resolveDomainChange = ({ current, requestedDomain, trusted }) => {
  if (requestedDomain === undefined) return {}
  if (!requestedDomain) return { domain: '', pendingDomain: '', domainVerificationToken: '' }
  if (requestedDomain === (current.domain || '')) return { pendingDomain: '', domainVerificationToken: '' }
  if (trusted) return { domain: requestedDomain, pendingDomain: '', domainVerificationToken: '' }
  const token = current.pendingDomain === requestedDomain && current.domainVerificationToken
    ? current.domainVerificationToken
    : `verificacion-${crypto.randomBytes(12).toString('hex')}`
  return { pendingDomain: requestedDomain, domainVerificationToken: token }
}

const readStarterCatalog = () => {
  try {
    return JSON.parse(fs.readFileSync(STARTER_CATALOG_FILE, 'utf-8'))
  } catch {
    return []
  }
}

export const countTenantProducts = async (tenantId) => {
  if (!isMongoConnected()) return 0
  return Product.countDocuments({ tenantId })
}

/**
 * Verifica que la tienda pueda sumar `adding` productos según su plan.
 */
export const assertProductCapacity = async (tenant, adding = 1) => {
  const limit = getTenantLimits(tenant).products
  if (limit === null || limit === undefined) return
  const current = await countTenantProducts(tenant.tenantId)
  if (current + adding > limit) {
    throw new TenantError(
      `Tu plan permite hasta ${limit} perfumes y ya tenés ${current}. Pasate a un plan superior desde Admin > Mi Plan para cargar más.`,
      403
    )
  }
}

export const seedStarterCatalog = async (tenantId) => {
  const created = []
  for (const item of readStarterCatalog()) {
    try {
      created.push(await createProduct(item, tenantId))
    } catch (err) {
      console.warn(`[SeedStarter] Error creando ${item.name}:`, err.message)
    }
  }
  return created
}

/**
 * Alta de una perfumería (desde la consola de superadmin o el registro autoservicio).
 */
export const createTenant = async ({
  tenantId, name, subdomain, domain = '', plan = 'pro', status = 'active', billing,
  adminEmail, adminPassword, whatsappNumber = '', alias = '', cbu = '', seedStarter = false
}) => {
  if (!isMongoConnected()) {
    throw new TenantError('Crear perfumerías requiere MongoDB configurado (MONGODB_URI).', 400)
  }

  const cleanId = String(tenantId || '').toLowerCase().trim()
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(cleanId)) {
    throw new TenantError('El identificador debe tener entre 3 y 40 caracteres: letras minúsculas, números y guiones.')
  }
  if (!name || !String(name).trim()) {
    throw new TenantError('El nombre de la tienda es obligatorio.')
  }
  const email = normalizeEmail(adminEmail)
  if (!isValidEmail(email)) {
    throw new TenantError('Ingresá el email del dueño de la tienda (será su usuario de acceso).')
  }
  if (!adminPassword || String(adminPassword).length < MIN_PASSWORD_LENGTH) {
    throw new TenantError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  }
  if (!PLAN_IDS.includes(plan)) {
    throw new TenantError('Plan inválido.')
  }

  if (isReservedStoreId(cleanId) || await Tenant.exists({ $or: [{ tenantId: cleanId }, { slug: cleanId }] })) {
    throw new TenantError(`Ya existe una perfumería con el identificador "${cleanId}".`, 409)
  }

  const cleanDomain = normalizeDomain(domain)
  const cleanSubdomain = subdomain ? String(subdomain).toLowerCase().trim() : cleanId
  await validateRouting({ tenantId: cleanId, domain: cleanDomain, subdomain: cleanSubdomain })

  const tenant = await Tenant.create({
    tenantId: cleanId,
    name: String(name).trim().slice(0, 80),
    slug: cleanId,
    domain: cleanDomain,
    subdomain: cleanSubdomain,
    plan,
    status,
    billing: billing || { status: 'exempt' },
    // Datos de contacto y cobro propios: no heredar los de la tienda principal
    branding: {
      ...DEFAULT_TENANT_CONFIG.branding,
      tagline: '',
      instagramUrl: '',
      whatsappNumber: String(whatsappNumber || '').replace(/[^\d+]/g, ''),
      // Abre el asistente de configuración en el primer ingreso al panel
      onboardingCompleted: false
    },
    commercial: {
      ...DEFAULT_TENANT_CONFIG.commercial,
      alias: alias || '',
      cbu: cbu || '',
      bankName: '',
      accountHolder: String(name).trim(),
      cuit: '',
      notificationEmail: email,
      mercadoPagoAccessToken: '',
      mercadoPagoPublicKey: '',
      mpAccessToken: '',
      mpPublicKey: ''
    },
    seo: {
      title: `${String(name).trim()} | Perfumes originales`,
      description: `Comprá perfumes originales en ${String(name).trim()}. Pagá con Mercado Pago o transferencia y recibí tu pedido en todo el país.`,
      keywords: '',
      ogImage: ''
    },
    adminUser: {
      email,
      passwordHash: await bcrypt.hash(String(adminPassword), 12)
    }
  })

  if (seedStarter) {
    await seedStarterCatalog(cleanId)
  }

  clearTenantCache()
  return tenant
}

export const getPlanSummary = (tenant) => {
  const plan = getPlan(tenant.plan)
  const billing = tenant.billing || {}
  const exempt = isBillingExempt(tenant)
  const trialEndsAt = billing.trialEndsAt ? new Date(billing.trialEndsAt) : null
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86400000)) : null

  return {
    plan: { id: plan.id, name: plan.name, price: plan.price },
    status: exempt ? 'exempt' : (billing.status || 'trialing'),
    trialEndsAt,
    trialDaysLeft: exempt ? null : trialDaysLeft,
    currentPeriodEnd: billing.currentPeriodEnd || null,
    pendingPlan: billing.pendingPlan || '',
    storeStatus: tenant.status,
    suspendedReason: tenant.suspendedReason || '',
    limits: getTenantLimits(tenant),
    exempt
  }
}

export { getDefaultTenantId }
