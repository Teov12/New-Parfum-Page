import crypto from 'crypto'
import { Tenant } from '../models/Tenant.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { SiteContent } from '../models/SiteContent.js'
import { Customer } from '../models/Customer.js'
import { WithdrawalRequest } from '../models/WithdrawalRequest.js'
import { AbandonedCart } from '../models/AbandonedCart.js'
import { isMongoConnected } from '../dbConnection.js'
import { clearTenantCache } from '../middleware/tenant.js'
import { createOrder, getProducts } from '../db.js'
import { createTenant } from './tenantService.js'
import { encryptSecret } from './secrets.js'

/**
 * Tiendas de ejemplo para mostrar la plataforma a perfumerías interesadas.
 * Cada una tiene catálogo, ventas de los últimos 45 días, cupones, envíos y datos legales.
 */
export const DEMO_STORES = [
  {
    tenantId: 'maison-aurora',
    name: 'Maison Aurora',
    tagline: 'Alta perfumería de diseñador',
    paletteId: 'obsidian',
    primaryColor: '#141414',
    storeIcon: 'diamond',
    city: 'Palermo, CABA',
    postalCodes: ['1000-1499']
  },
  {
    tenantId: 'oud-al-sahra',
    name: 'Oud Al Sahra',
    tagline: 'Perfumería árabe y decants',
    paletteId: 'emerald',
    primaryColor: '#0c2621',
    storeIcon: 'local_florist',
    city: 'Nueva Córdoba, Córdoba',
    postalCodes: ['5000-5020']
  },
  {
    tenantId: 'flor-de-lis',
    name: 'Flor de Lis Perfumes',
    tagline: 'Fragancias que cuentan historias',
    paletteId: 'bordeaux',
    primaryColor: '#2b111b',
    storeIcon: 'spa',
    city: 'Rosario, Santa Fe',
    postalCodes: ['2000-2010']
  }
]

const CUSTOMERS = [
  ['Lucía', 'Fernández', 'CABA', 'CABA', '1425'], ['Martín', 'Gómez', 'Córdoba', 'Córdoba', '5000'],
  ['Sofía', 'Rodríguez', 'Rosario', 'Santa Fe', '2000'], ['Juan', 'Pérez', 'La Plata', 'Buenos Aires', '1900'],
  ['Valentina', 'López', 'Mendoza', 'Mendoza', '5500'], ['Mateo', 'Díaz', 'Mar del Plata', 'Buenos Aires', '7600'],
  ['Camila', 'Martínez', 'Tucumán', 'Tucumán', '4000'], ['Benjamín', 'Romero', 'Neuquén', 'Neuquén', '8300'],
  ['Martina', 'Sosa', 'Salta', 'Salta', '4400'], ['Tomás', 'Álvarez', 'Bahía Blanca', 'Buenos Aires', '8000'],
  ['Catalina', 'Torres', 'Santa Fe', 'Santa Fe', '3000'], ['Joaquín', 'Ruiz', 'Paraná', 'Entre Ríos', '3100']
]

export const getDemoPassword = () => process.env.DEMO_PASSWORD || 'demo-perfumeria'
export const getDemoEmail = (tenantId) => `demo@${tenantId}.demo`

const pick = (list) => list[crypto.randomInt(0, list.length)]

const deleteStoreData = async (tenantId) => {
  await Promise.all([
    Tenant.deleteOne({ tenantId }),
    Product.deleteMany({ tenantId }),
    Order.deleteMany({ tenantId }),
    SiteContent.deleteMany({ tenantId }),
    Customer.deleteMany({ tenantId }),
    WithdrawalRequest.deleteMany({ tenantId }),
    AbandonedCart.deleteMany({ tenantId })
  ])
}

// Ventas de ejemplo para que el panel (ventas, finanzas, márgenes) se vea con movimiento
const seedOrders = async (tenantId, count) => {
  const products = await getProducts(tenantId)
  if (products.length === 0) return

  for (let i = 0; i < count; i++) {
    const [firstName, lastName, city, province, postalCode] = pick(CUSTOMERS)
    const items = Array.from({ length: crypto.randomInt(1, 3) }, () => {
      const product = pick(products)
      const size = pick(product.sizes)
      return { id: product.id, size: size.size, quantity: crypto.randomInt(1, 3) }
    })
    const roll = crypto.randomInt(0, 100)
    const paymentStatus = roll < 70 ? 'paid' : roll < 92 ? 'pending' : 'cancelled'
    const fulfillmentStatus = paymentStatus !== 'paid' ? 'unfulfilled' : pick(['delivered', 'delivered', 'shipped', 'packing'])
    const paymentMethod = pick(['mercadopago', 'mercadopago', 'transfer'])

    const order = await createOrder({
      customer: {
        firstName,
        lastName,
        email: `${firstName}.${lastName}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '@ejemplo.com',
        phone: `+54 9 11 ${crypto.randomInt(4000, 6999)}-${crypto.randomInt(1000, 9999)}`,
        address: `Calle ${crypto.randomInt(1, 99)} N° ${crypto.randomInt(100, 3000)}`,
        city,
        province,
        postalCode
      },
      items,
      shippingCost: pick([0, 4200, 5800, 6900]),
      discountAmount: pick([0, 0, 0, 5000]),
      shippingMethod: pick(['Andreani Estándar a Domicilio', 'Retiro en Sucursal / Punto Andreani']),
      paymentMethod,
      paymentStatus,
      fulfillmentStatus,
      trackingCode: ['shipped', 'delivered'].includes(fulfillmentStatus) ? `3600${crypto.randomInt(10000000, 99999999)}` : '',
      source: 'web'
    }, tenantId, { trusted: true })

    const createdAt = new Date(Date.now() - crypto.randomInt(0, 45 * 24) * 3600 * 1000)
    // Directo a la colección: Mongoose no permite cambiar createdAt (es inmutable)
    await Order.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt, date: createdAt.toISOString(), updatedAt: createdAt } }
    )
  }

  // Stock "lindo" para la demo después de las ventas de ejemplo
  await Product.updateMany({ tenantId }, { $set: { stock: 12 } })
}

const seedStore = async (store) => {
  const tenant = await createTenant({
    tenantId: store.tenantId,
    subdomain: store.tenantId,
    name: store.name,
    plan: 'enterprise',
    status: 'active',
    billing: { status: 'exempt' },
    adminEmail: getDemoEmail(store.tenantId),
    adminPassword: getDemoPassword(),
    whatsappNumber: '5491100000000',
    alias: `${store.tenantId.toUpperCase().replace(/-/g, '.')}.DEMO`,
    cbu: '0000003100000000000000',
    seedStarter: true
  })

  const mpToken = process.env.DEMO_MP_ACCESS_TOKEN?.trim()
  await Tenant.updateOne({ tenantId: tenant.tenantId }, {
    $set: {
      isDemo: true,
      'branding.tagline': store.tagline,
      'branding.paletteId': store.paletteId,
      'branding.primaryColor': store.primaryColor,
      'branding.storeIcon': store.storeIcon,
      'branding.instagram': `@${store.tenantId.replace(/-/g, '')}`,
      'branding.onboardingCompleted': true,
      'commercial.bankName': 'Banco Demo',
      'commercial.accountHolder': `${store.name} S.R.L.`,
      'commercial.cuit': '30-00000000-0',
      'commercial.freeShippingThreshold': 150000,
      // Credenciales de PRUEBA de Mercado Pago (sandbox): se paga con tarjetas de test
      ...(mpToken ? {
        'commercial.mpAccessToken': encryptSecret(mpToken),
        'commercial.mercadoPagoAccessToken': encryptSecret(mpToken),
        'commercial.mpPublicKey': process.env.DEMO_MP_PUBLIC_KEY || '',
        'commercial.mpConnection.method': 'manual'
      } : {}),
      legal: {
        legalName: `${store.name} S.R.L. (tienda de demostración)`,
        address: store.city,
        termsText: '',
        privacyText: '',
        returnsText: ''
      },
      seo: {
        title: `${store.name} | ${store.tagline}`,
        description: `${store.name}: perfumes originales con envíos a todo el país. Tienda de demostración.`,
        keywords: '',
        ogImage: ''
      },
      coupons: [
        { code: 'BIENVENIDA10', type: 'percentage', value: 10, label: '10% OFF en tu primera compra', active: true, usedCount: 0, usageLimit: 0, minPurchase: 0 },
        { code: 'DECANT15', type: 'percentage', value: 15, label: '15% OFF desde $80.000', active: true, usedCount: 0, usageLimit: 0, minPurchase: 80000 }
      ],
      shippingMethods: [
        { id: 'retiro_showroom', type: 'pickup', name: `Retiro en el showroom (${store.city})`, description: 'Coordinamos el horario por WhatsApp.', price: 0, freeOver: 0, postalCodes: [], estimatedDays: 'Listo en 24 hs', active: true },
        { id: 'moto_local', type: 'local', name: 'Envío en moto (mismo día)', description: 'Pedidos antes de las 14 hs.', price: 3500, freeOver: 120000, postalCodes: store.postalCodes, estimatedDays: 'En el día', active: true }
      ]
    }
  })

  await seedOrders(tenant.tenantId, 28)
  return tenant.tenantId
}

/**
 * Crea las tiendas demo que falten. Con reset=true las borra y las vuelve a crear desde cero
 * (deshace los cambios que hicieron los visitantes).
 */
export const seedDemoStores = async ({ reset = false } = {}) => {
  if (!isMongoConnected()) throw new Error('Las tiendas demo requieren MongoDB (MONGODB_URI).')

  const created = []
  for (const store of DEMO_STORES) {
    const existing = await Tenant.findOne({ tenantId: store.tenantId }).lean()
    if (existing && !existing.isDemo) {
      console.warn(`[Demo] "${store.tenantId}" existe y no es una tienda demo: no se toca.`)
      continue
    }
    if (existing && !reset) continue
    if (existing) await deleteStoreData(store.tenantId)
    created.push(await seedStore(store))
  }
  clearTenantCache()
  return created
}

