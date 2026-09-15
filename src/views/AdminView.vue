<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useProductStore } from '@/stores/products'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toast'
import { useSiteContentStore } from '@/stores/siteContent'

const productStore = useProductStore()
const ordersStore = useOrdersStore()
const toastStore = useToastStore()
const siteContentStore = useSiteContentStore()

// Navigation Tabs in Admin
const activeAdminTab = ref('ventas') // 'ventas', 'productos', 'finanzas', 'diseno'

// Authentication State
const isAuthenticated = ref(false)
const adminPassword = ref('')
const loginError = ref('')

// Dashboard & Filter State for Products
const searchQuery = ref('')
const filterGender = ref('all')
const filterCategory = ref('all')
const isModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const productToDelete = ref(null)
const isSubmitting = ref(false)
const isUploadingImage = ref(false)
const currentFormStep = ref(1)

// Orders State (Tienda Nube)
const orderSearchQuery = ref('')
const orderPaymentFilter = ref('all')
const orderFulfillmentFilter = ref('all')
const isManualOrderModalOpen = ref(false)
const isOrderDetailModalOpen = ref(false)
const selectedOrderForDetail = ref(null)
const isSubmittingOrder = ref(false)

// Step definitions for product wizard
const steps = [
  { number: 1, title: 'General', subtitle: 'Datos principales' },
  { number: 2, title: 'Costos & Venta', subtitle: 'Precio y Ganancia' },
  { number: 3, title: 'Galería', subtitle: 'Fotos del frasco' },
  { number: 4, title: 'Pirámide', subtitle: 'Notas aromáticas' },
  { number: 5, title: 'Ficha', subtitle: 'Descripción y ritual' }
]

// Technical Specs Select Options
const longevityOptions = [
  '4 a 6 horas (Moderada)',
  '6 a 8 horas (Duradera)',
  '8 a 12 horas (Muy Duradera)',
  'Más de 12 horas (Extrema)'
]

const sillageOptions = [
  'Suave / Íntima (A flor de piel)',
  'Moderada (Radio de 1 metro)',
  'Pesada (De gran estela)',
  'Enorme / Bestial (Llena habitaciones)'
]

const seasonOptions = [
  'Todo el año',
  'Primavera',
  'Verano',
  'Otoño',
  'Invierno'
]

// ==========================================
// PRODUCT FORM STATE & VEE-VALIDATE
// ==========================================
const defaultForm = () => ({
  id: '',
  name: '',
  brand: '',
  concentration: 'Eau de Parfum',
  gender: 'unisex',
  category: 'disenador',
  fragranceFamily: 'Amaderada',
  price: null,
  costPrice: null,
  originalPrice: 0,
  badge: '',
  isFeatured: false,
  isBestSeller: false,
  isNew: false,
  shortDescription: '',
  description: '',
  usageTips: '',
  stock: 10,
  images: [],
  sizes: [
    { size: 100, price: null, costPrice: null, default: true }
  ],
  olfactoryPyramid: {
    topNotes: [],
    heartNotes: [],
    baseNotes: []
  },
  characteristics: {
    longevity: '8 a 12 horas (Muy Duradera)',
    sillage: 'Moderada (Radio de 1 metro)',
    season: ['Todo el año'],
    occasion: ''
  }
})

const formData = ref(defaultForm())
const isEditing = computed(() => !!formData.value.id)

// Input tags helpers
const topNoteInput = ref('')
const heartNoteInput = ref('')
const baseNoteInput = ref('')

// Calculated Profit for product being created/edited
const productUnitProfit = computed(() => {
  const price = Number(formData.value.sizes[0]?.price) || 0
  const cost = Number(formData.value.sizes[0]?.costPrice) || 0
  return Math.max(0, price - cost)
})

const productProfitMargin = computed(() => {
  const price = Number(formData.value.sizes[0]?.price) || 0
  const cost = Number(formData.value.sizes[0]?.costPrice) || 0
  if (price <= 0) return 0
  return Math.round(((price - cost) / price) * 100)
})

// Calculadora automática: Precio deseado en Transferencia -> Precio de Lista a Publicar
const targetTransferPrice = ref(null)

const calculateListPriceFromTransfer = () => {
  const target = Number(targetTransferPrice.value) || 0
  if (target > 0 && formData.value.sizes[0]) {
    // Si precio_transfer = precio_lista * 0.8 => precio_lista = precio_transfer / 0.8
    const calculatedListPrice = Math.round(target / 0.8)
    formData.value.sizes[0].price = calculatedListPrice
    if (formData.value.price !== undefined) formData.value.price = calculatedListPrice
  }
}

// ==========================================
// MANUAL ORDER FORM STATE (TIENDA NUBE)
// ==========================================
const manualOrderForm = ref({
  customer: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dni: '',
    address: '',
    apartment: '',
    city: 'Córdoba',
    province: 'Córdoba',
    postalCode: '2400'
  },
  selectedProductId: '',
  selectedProductSize: '100 ml',
  quantity: 1,
  unitPrice: 0,
  unitCostPrice: 0,
  shippingMethod: 'Andreani Estándar a Domicilio',
  shippingCost: 0,
  discountAmount: 0,
  paymentMethod: 'transfer',
  paymentStatus: 'paid',
  fulfillmentStatus: 'packing',
  notes: '',
  source: 'manual_admin'
})

// Manual Order Profit Calculations
const manualOrderSubtotal = computed(() => {
  return (Number(manualOrderForm.value.unitPrice) || 0) * (Number(manualOrderForm.value.quantity) || 1)
})

const manualOrderTotalCost = computed(() => {
  return (Number(manualOrderForm.value.unitCostPrice) || 0) * (Number(manualOrderForm.value.quantity) || 1)
})

const manualOrderTotal = computed(() => {
  const sub = manualOrderSubtotal.value
  const disc = Number(manualOrderForm.value.discountAmount) || 0
  const ship = Number(manualOrderForm.value.shippingCost) || 0
  return Math.max(0, sub - disc + ship)
})

const manualOrderProfit = computed(() => {
  const netRevenue = Math.max(0, manualOrderSubtotal.value - (Number(manualOrderForm.value.discountAmount) || 0))
  return Math.max(0, netRevenue - manualOrderTotalCost.value)
})

const manualOrderProfitMargin = computed(() => {
  const netRevenue = Math.max(0, manualOrderSubtotal.value - (Number(manualOrderForm.value.discountAmount) || 0))
  if (netRevenue <= 0) return 0
  return Math.round((manualOrderProfit.value / netRevenue) * 100)
})

// Watch product selection in manual order modal to auto-populate price and cost
watch(() => manualOrderForm.value.selectedProductId, (prodId) => {
  if (!prodId) return
  const prod = productStore.items.find(p => p.id === prodId)
  if (prod) {
    const defaultSize = prod.sizes?.find(s => s.default) || prod.sizes?.[0]
    manualOrderForm.value.selectedProductSize = defaultSize?.size || '100 ml'
    manualOrderForm.value.unitPrice = defaultSize?.price || prod.price || 0
    manualOrderForm.value.unitCostPrice = defaultSize?.costPrice || prod.costPrice || Math.round((prod.price || 0) * 0.45)
  }
})

// Check existing login session with JWT verification
onMounted(async () => {
  const token = localStorage.getItem('gicca_admin_token')
  if (token) {
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        isAuthenticated.value = true
        loadData()
      } else {
        localStorage.removeItem('gicca_admin_token')
        isAuthenticated.value = false
      }
    } catch {
      localStorage.removeItem('gicca_admin_token')
      isAuthenticated.value = false
    }
  }
})

const handleLogin = async () => {
  loginError.value = ''
  if (!adminPassword.value.trim()) {
    loginError.value = 'Por favor ingresá la contraseña de administrador'
    return
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword.value })
    })
    const data = await res.json()
    if (!res.ok) {
      loginError.value = data.error || 'Contraseña incorrecta'
      return
    }

    localStorage.setItem('gicca_admin_token', data.token)
    isAuthenticated.value = true
    toastStore.show('¡Bienvenido al Panel de Administración!', 'success')
    loadData()
  } catch (err) {
    loginError.value = 'Error al conectar con el servidor backend'
  }
}

const handleLogout = () => {
  localStorage.removeItem('gicca_admin_token')
  isAuthenticated.value = false
  adminPassword.value = ''
  toastStore.show('Sesión cerrada correctamente', 'info')
}

const loadData = async () => {
  await Promise.all([
    productStore.fetchProducts(),
    productStore.fetchStats(),
    ordersStore.fetchOrders(),
    ordersStore.fetchStats(),
    siteContentStore.fetchSiteContent()
  ])
}

// Filtered list for the products table
const filteredProducts = computed(() => {
  return productStore.items.filter(p => {
    if (filterGender.value !== 'all' && p.gender !== filterGender.value) return false
    if (filterCategory.value !== 'all' && p.category !== filterCategory.value) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      return (
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      )
    }
    return true
  })
})

// Filtered list for orders (Tienda Nube)
const filteredOrders = computed(() => {
  return ordersStore.items.filter(o => {
    if (orderPaymentFilter.value !== 'all' && o.paymentStatus !== orderPaymentFilter.value) return false
    if (orderFulfillmentFilter.value !== 'all' && o.fulfillmentStatus !== orderFulfillmentFilter.value) return false
    if (orderSearchQuery.value.trim()) {
      const q = orderSearchQuery.value.toLowerCase().trim()
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customer?.firstName?.toLowerCase().includes(q) ||
        o.customer?.lastName?.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q) ||
        o.customer?.city?.toLowerCase().includes(q) ||
        o.items?.some(i => i.name?.toLowerCase().includes(q))
      )
    }
    return true
  })
})

// Product Modal Handlers
const openCreateModal = () => {
  formData.value = defaultForm()
  currentFormStep.value = 1
  isModalOpen.value = true
}

const openEditModal = (product) => {
  formData.value = JSON.parse(JSON.stringify(product))
  
  if (!formData.value.sizes || formData.value.sizes.length === 0) {
    formData.value.sizes = [{ size: 100, price: formData.value.price || null, costPrice: formData.value.costPrice || null, default: true }]
  } else {
    formData.value.sizes = formData.value.sizes.map((s, idx) => {
      let num = s.size
      if (typeof num === 'string') {
        const parsed = parseInt(num.replace(/\D/g, ''), 10)
        num = !isNaN(parsed) ? parsed : 100
      }
      return {
        size: num || 100,
        price: s.price || null,
        costPrice: s.costPrice !== undefined ? s.costPrice : Math.round((s.price || 0) * 0.45),
        default: idx === 0 || s.default === true
      }
    })
  }

  if (!formData.value.images) formData.value.images = []
  if (!formData.value.olfactoryPyramid) formData.value.olfactoryPyramid = { topNotes: [], heartNotes: [], baseNotes: [] }
  if (!formData.value.characteristics) {
    formData.value.characteristics = {
      longevity: '8 a 12 horas (Muy Duradera)',
      sillage: 'Moderada (Radio de 1 metro)',
      season: ['Todo el año'],
      occasion: ''
    }
  }

  currentFormStep.value = 1
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  formData.value = defaultForm()
  currentFormStep.value = 1
}

// Step Wizard Validation
const goToNextStep = () => {
  if (currentFormStep.value === 1) {
    if (!formData.value.name || formData.value.name.trim().length < 2) {
      toastStore.show('Por favor ingresá un nombre válido para el perfume.', 'error')
      return
    }
    if (!formData.value.brand || formData.value.brand.trim().length < 2) {
      toastStore.show('Por favor ingresá la casa o marca del perfume.', 'error')
      return
    }
  }

  if (currentFormStep.value === 2) {
    const mainSize = formData.value.sizes[0]
    if (!mainSize || !mainSize.size) {
      toastStore.show('Debes especificar al menos un tamaño en ml.', 'error')
      return
    }
    if (!mainSize.price || Number(mainSize.price) <= 0) {
      toastStore.show('El precio de venta debe ser mayor a $0.', 'error')
      return
    }
    if (mainSize.costPrice === null || mainSize.costPrice === undefined || Number(mainSize.costPrice) < 0) {
      toastStore.show('Por favor ingresá un precio de costo válido (>= $0).', 'error')
      return
    }
  }

  if (currentFormStep.value < steps.length) {
    currentFormStep.value++
  }
}

const goToPrevStep = () => {
  if (currentFormStep.value > 1) {
    currentFormStep.value--
  }
}

// Sizes array helpers
const addSize = () => {
  formData.value.sizes.push({ size: 50, price: null, costPrice: null, default: false })
}

const removeSize = (index) => {
  if (formData.value.sizes.length > 1) {
    formData.value.sizes.splice(index, 1)
  }
}

// Image upload from PC
const handleFileUpload = async (event) => {
  const files = event.target.files
  if (!files || files.length === 0) return

  isUploadingImage.value = true
  const uploadData = new FormData()
  for (let i = 0; i < files.length; i++) {
    uploadData.append('images', files[i])
  }

  try {
    const token = localStorage.getItem('gicca_admin_token')
    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: uploadData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al subir imágenes')

    if (data.urls && data.urls.length > 0) {
      formData.value.images.push(...data.urls)
      toastStore.show(`¡${data.urls.length} imagen(es) subida(s) con éxito!`, 'success')
    }
  } catch (err) {
    toastStore.show(err.message, 'error')
  } finally {
    isUploadingImage.value = false
    event.target.value = ''
  }
}

const removeImage = (index) => {
  formData.value.images.splice(index, 1)
}

// Pyramid tags helpers
const addTopNote = () => {
  if (topNoteInput.value.trim()) {
    formData.value.olfactoryPyramid.topNotes.push(topNoteInput.value.trim())
    topNoteInput.value = ''
  }
}
const removeTopNote = (idx) => formData.value.olfactoryPyramid.topNotes.splice(idx, 1)

const addHeartNote = () => {
  if (heartNoteInput.value.trim()) {
    formData.value.olfactoryPyramid.heartNotes.push(heartNoteInput.value.trim())
    heartNoteInput.value = ''
  }
}
const removeHeartNote = (idx) => formData.value.olfactoryPyramid.heartNotes.splice(idx, 1)

const addBaseNote = () => {
  if (baseNoteInput.value.trim()) {
    formData.value.olfactoryPyramid.baseNotes.push(baseNoteInput.value.trim())
    baseNoteInput.value = ''
  }
}
const removeBaseNote = (idx) => formData.value.olfactoryPyramid.baseNotes.splice(idx, 1)

// Toggle Season Multi-select
const toggleSeason = (seasonName) => {
  if (!Array.isArray(formData.value.characteristics.season)) {
    formData.value.characteristics.season = []
  }
  const idx = formData.value.characteristics.season.indexOf(seasonName)
  if (idx > -1) {
    formData.value.characteristics.season.splice(idx, 1)
  } else {
    formData.value.characteristics.season.push(seasonName)
  }
}

// Save Product
const handleSubmitProduct = async () => {
  isSubmitting.value = true

  try {
    const validSizes = formData.value.sizes.filter(s => s.size && s.price).map((s, idx) => ({
      size: `${s.size} ml`,
      price: Number(s.price),
      costPrice: Number(s.costPrice) || Math.round(Number(s.price) * 0.45),
      default: idx === 0
    }))

    const mainPrice = validSizes[0]?.price || 0
    const mainCost = validSizes[0]?.costPrice || Math.round(mainPrice * 0.45)

    const payload = {
      ...formData.value,
      price: mainPrice,
      costPrice: mainCost,
      sizes: validSizes,
      images: formData.value.images.length > 0 
        ? formData.value.images 
        : ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85']
    }

    let res
    if (isEditing.value) {
      res = await productStore.updateProduct(payload.id, payload)
    } else {
      res = await (productStore.createProduct ? productStore.createProduct(payload) : productStore.addProduct(payload))
    }

    if (res && (res.id || res.success)) {
      toastStore.show(isEditing.value ? '¡Perfume actualizado con éxito!' : '¡Perfume publicado en la tienda!', 'success')
      closeModal()
      await loadData()
    } else {
      toastStore.show('Error al guardar el perfume en el catálogo', 'error')
    }
  } catch (err) {
    toastStore.show(err.message || 'Error inesperado al publicar', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Delete Product Handlers
const confirmDeleteProduct = (product) => {
  productToDelete.value = product
  isDeleteConfirmOpen.value = true
}

const handleDeleteProduct = async () => {
  if (!productToDelete.value) return
  isSubmitting.value = true
  const success = await productStore.deleteProduct(productToDelete.value.id)
  isSubmitting.value = false
  isDeleteConfirmOpen.value = false
  if (success) {
    toastStore.show('Perfume eliminado del catálogo', 'info')
    await loadData()
  } else {
    toastStore.show('Error al eliminar perfume', 'error')
  }
  productToDelete.value = null
}

// ==========================================
// MANUAL ORDER HANDLERS (TIENDA NUBE)
// ==========================================
const openCreateManualOrderModal = () => {
  const firstProd = productStore.items[0]
  manualOrderForm.value = {
    customer: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      dni: '',
      address: '',
      apartment: '',
      city: 'Córdoba',
      province: 'Córdoba',
      postalCode: '2400'
    },
    selectedProductId: firstProd?.id || '',
    selectedProductSize: firstProd?.sizes?.[0]?.size || '100 ml',
    quantity: 1,
    unitPrice: firstProd?.price || 145000,
    unitCostPrice: firstProd?.costPrice || Math.round((firstProd?.price || 145000) * 0.45),
    shippingMethod: 'Andreani Estándar a Domicilio',
    shippingCost: 0,
    discountAmount: 0,
    paymentMethod: 'transfer',
    paymentStatus: 'paid',
    fulfillmentStatus: 'packing',
    notes: '',
    source: 'manual_admin'
  }
  isManualOrderModalOpen.value = true
}

const closeManualOrderModal = () => {
  isManualOrderModalOpen.value = false
}

const handleSaveManualOrder = async () => {
  if (!manualOrderForm.value.customer.firstName.trim()) {
    toastStore.show('Ingresá el nombre del cliente.', 'error')
    return
  }
  if (!manualOrderForm.value.customer.phone.trim()) {
    toastStore.show('Ingresá el WhatsApp o teléfono del cliente.', 'error')
    return
  }
  if (!manualOrderForm.value.customer.address.trim()) {
    toastStore.show('Ingresá la dirección de entrega.', 'error')
    return
  }
  if (!manualOrderForm.value.selectedProductId) {
    toastStore.show('Seleccioná un producto del catálogo.', 'error')
    return
  }

  isSubmittingOrder.value = true

  const prod = productStore.items.find(p => p.id === manualOrderForm.value.selectedProductId)
  const orderNumber = `GIC-${Math.floor(100000 + Math.random() * 900000)}`

  const payload = {
    orderNumber,
    customer: { ...manualOrderForm.value.customer },
    items: [
      {
        id: prod?.id || 'custom',
        name: prod?.name || 'Perfume Original',
        brand: prod?.brand || 'Gicca',
        size: manualOrderForm.value.selectedProductSize,
        quantity: Number(manualOrderForm.value.quantity) || 1,
        price: Number(manualOrderForm.value.unitPrice) || 0,
        costPrice: Number(manualOrderForm.value.unitCostPrice) || 0
      }
    ],
    subtotal: manualOrderSubtotal.value,
    shippingCost: Number(manualOrderForm.value.shippingCost) || 0,
    discountAmount: Number(manualOrderForm.value.discountAmount) || 0,
    total: manualOrderTotal.value,
    totalCost: manualOrderTotalCost.value,
    shippingMethod: manualOrderForm.value.shippingMethod,
    paymentMethod: manualOrderForm.value.paymentMethod,
    paymentStatus: manualOrderForm.value.paymentStatus,
    fulfillmentStatus: manualOrderForm.value.fulfillmentStatus,
    notes: manualOrderForm.value.notes,
    source: 'manual_admin'
  }

  const res = await ordersStore.createOrder(payload)
  isSubmittingOrder.value = false

  if (res.success) {
    toastStore.show(`¡Venta #${orderNumber} registrada con éxito! Ganancia: $${manualOrderProfit.value.toLocaleString('es-AR')}`, 'success')
    closeManualOrderModal()
  } else {
    toastStore.show(res.error || 'Error al guardar la venta', 'error')
  }
}

// Order Status Quick Updaters
const updateOrderStatus = async (order, field, value) => {
  const res = await ordersStore.updateOrder(order.id, { [field]: value })
  if (res.success) {
    toastStore.show('Estado actualizado correctamente', 'success')
  }
}

// View Order Detail
const viewOrderDetail = (order) => {
  selectedOrderForDetail.value = order
  isOrderDetailModalOpen.value = true
}

const isGeneratingShipment = ref(false)

const handleGenerateShipment = async (order) => {
  if (!order) return
  isGeneratingShipment.value = true
  try {
    const res = await fetch('/api/shipping/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al generar despacho')

    order.trackingCode = data.trackingCode
    order.fulfillmentStatus = 'shipped'
    order.shippingCarrier = 'Andreani'
    toastStore.show(`¡Despacho generado en Andreani! Tracking: ${data.trackingCode}`, 'success')
    await ordersStore.fetchOrders()
  } catch (err) {
    toastStore.show(err.message || 'Error al conectar con Andreani', 'error')
  } finally {
    isGeneratingShipment.value = false
  }
}

const openAndreaniTracking = (trackingCode) => {
  if (!trackingCode) return
  // Abrir tracking oficial de Andreani
  const url = `https://www.andreani.com/#!/informacionEnvio/${encodeURIComponent(trackingCode)}`
  window.open(url, '_blank')
}

const sendWhatsAppTracking = (order) => {
  const text = `Hola ${order.customer?.firstName}! ✨ Te escribimos de Gicca Perfumes sobre tu orden #${order.orderNumber}.\n\nTu pedido se encuentra: *${order.fulfillmentStatus === 'shipped' ? 'DESPACHADO EN ANDREANI' : (order.fulfillmentStatus === 'delivered' ? 'ENTREGADO' : 'EN PREPARACIÓN')}*.\n${order.trackingCode ? `Código de Seguimiento Andreani: *${order.trackingCode}*\nPodés seguirlo en: https://www.andreani.com/#!/informacionEnvio/${order.trackingCode}` : ''}\n\n¡Cualquier consulta estamos a tu disposición!`
  const url = `https://wa.me/${order.customer?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
}

// ==========================================
// DISEÑO & CONTENIDO STATE & METHODS
// ==========================================
const activeDesignSubtab = ref('categorias') // 'categorias', 'familias', 'banners', 'editorial'

// Category Form
const isCategoryModalOpen = ref(false)
const isSubmittingCategory = ref(false)
const categoryForm = ref({
  id: '',
  title: '',
  subtitle: '',
  description: '',
  link: '/catalogo',
  image: '',
  badge: '',
  buttonText: 'Ver Colección',
  span: 6
})
const isEditingCategory = computed(() => !!categoryForm.value.id)

const openCreateCategoryModal = () => {
  categoryForm.value = {
    id: '',
    title: '',
    subtitle: '',
    description: '',
    link: '/catalogo',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85',
    badge: '',
    buttonText: 'Ver Colección',
    span: 6
  }
  isCategoryModalOpen.value = true
}

const openEditCategoryModal = (cat) => {
  categoryForm.value = { ...cat }
  isCategoryModalOpen.value = true
}

const handleSaveCategory = async () => {
  if (!categoryForm.value.title.trim()) {
    toastStore.show('Por favor ingresá un título para la categoría', 'error')
    return
  }
  isSubmittingCategory.value = true
  try {
    if (isEditingCategory.value) {
      await siteContentStore.updateCategory(categoryForm.value.id, categoryForm.value)
      toastStore.show('¡Categoría actualizada con éxito!', 'success')
    } else {
      await siteContentStore.addCategory(categoryForm.value)
      toastStore.show('¡Nueva categoría agregada con éxito!', 'success')
    }
    isCategoryModalOpen.value = false
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar categoría', 'error')
  } finally {
    isSubmittingCategory.value = false
  }
}

// Olfactive Family Form
const isFamilyModalOpen = ref(false)
const isSubmittingFamily = ref(false)
const familyForm = ref({
  id: '',
  name: '',
  description: '',
  image: ''
})
const isEditingFamily = computed(() => !!familyForm.value.id)

const openCreateFamilyModal = () => {
  familyForm.value = {
    id: '',
    name: '',
    description: '',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80'
  }
  isFamilyModalOpen.value = true
}

const openEditFamilyModal = (fam) => {
  familyForm.value = { ...fam }
  isFamilyModalOpen.value = true
}

const handleSaveFamily = async () => {
  if (!familyForm.value.name.trim()) {
    toastStore.show('Por favor ingresá un nombre para la familia olfativa', 'error')
    return
  }
  isSubmittingFamily.value = true
  try {
    if (isEditingFamily.value) {
      await siteContentStore.updateOlfactiveFamily(familyForm.value.id || familyForm.value.name, familyForm.value)
      toastStore.show('¡Familia olfativa actualizada con éxito!', 'success')
    } else {
      await siteContentStore.addOlfactiveFamily(familyForm.value)
      toastStore.show('¡Nueva familia olfativa agregada con éxito!', 'success')
    }
    isFamilyModalOpen.value = false
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar familia olfativa', 'error')
  } finally {
    isSubmittingFamily.value = false
  }
}

// Slide Form
const isSlideModalOpen = ref(false)
const isSubmittingSlide = ref(false)
const slideForm = ref({
  id: '',
  tag: '',
  title: '',
  highlight: '',
  description: '',
  image: '',
  bottleImage: '',
  featuredTitle: '',
  featuredSub: '',
  featuredRating: '5.0 ★ Destacado',
  primaryCtaText: 'Explorar Catálogo',
  primaryCtaLink: '/catalogo',
  secondaryCtaText: 'Test de Fragancia',
  secondaryCtaLink: '/quiz'
})
const isEditingSlide = computed(() => !!slideForm.value.id)

const openCreateSlideModal = () => {
  slideForm.value = {
    id: `slide_${Date.now()}`,
    tag: 'NUEVA COLECCIÓN',
    title: 'Nueva Fragancia',
    highlight: 'exclusiva.',
    description: 'Descripción cautivadora del perfume o promoción.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2000&q=85',
    bottleImage: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=85',
    featuredTitle: 'Perfume Destacado',
    featuredSub: 'Notas de Lujo & Duración',
    featuredRating: '5.0 ★ Exclusivo',
    primaryCtaText: 'Explorar Catálogo',
    primaryCtaLink: '/catalogo',
    secondaryCtaText: 'Test de Fragancia',
    secondaryCtaLink: '/quiz'
  }
  isSlideModalOpen.value = true
}

const openEditSlideModal = (slide) => {
  slideForm.value = { ...slide }
  isSlideModalOpen.value = true
}

const handleSaveSlide = async () => {
  isSubmittingSlide.value = true
  try {
    const slides = [...siteContentStore.heroSlides]
    const idx = slides.findIndex(s => s.id === slideForm.value.id)
    if (idx !== -1) {
      slides[idx] = { ...slideForm.value }
    } else {
      slides.push({ ...slideForm.value })
    }
    await siteContentStore.saveFullContent({ heroSlides: slides })
    toastStore.show('¡Diapositiva del banner guardada!', 'success')
    isSlideModalOpen.value = false
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar slide', 'error')
  } finally {
    isSubmittingSlide.value = false
  }
}

// Editorial Save
const isSubmittingEditorial = ref(false)
const handleSaveEditorial = async () => {
  isSubmittingEditorial.value = true
  try {
    await siteContentStore.saveFullContent({ editorial: siteContentStore.editorial })
    toastStore.show('¡Imágenes editoriales guardadas con éxito!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al guardar imágenes editoriales', 'error')
  } finally {
    isSubmittingEditorial.value = false
  }
}

// Delete Confirmation State
const isDeleteContentModalOpen = ref(false)
const contentToDelete = ref(null)

const confirmDeleteContentItem = (type, item, title) => {
  contentToDelete.value = { type, item, title }
  isDeleteContentModalOpen.value = true
}

const handleExecuteDeleteContent = async () => {
  if (!contentToDelete.value) return
  const { type, item } = contentToDelete.value
  try {
    if (type === 'category') {
      await siteContentStore.deleteCategory(item.id)
      toastStore.show('Categoría eliminada del catálogo', 'info')
    } else if (type === 'family') {
      await siteContentStore.deleteOlfactiveFamily(item.id || item.name)
      toastStore.show('Familia olfativa eliminada', 'info')
    } else if (type === 'slide') {
      const slides = siteContentStore.heroSlides.filter(s => s.id !== item.id)
      await siteContentStore.saveFullContent({ heroSlides: slides })
      toastStore.show('Diapositiva eliminada', 'info')
    }
  } catch (err) {
    toastStore.show(err.message || 'Error al eliminar', 'error')
  } finally {
    isDeleteContentModalOpen.value = false
    contentToDelete.value = null
  }
}

// Direct image upload (1-click upload from PC on cards)
const handleDirectImageUpload = async (targetObj, fieldKey, event) => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    toastStore.show('Subiendo imagen a la web...', 'info')
    const url = await siteContentStore.uploadImage(file)
    targetObj[fieldKey] = url
    await siteContentStore.saveFullContent({})
    toastStore.show('¡Imagen actualizada con éxito!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al subir imagen', 'error')
  } finally {
    event.target.value = ''
  }
}

// Modal image upload
const handleModalImageUpload = async (targetObj, fieldKey, event) => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    toastStore.show('Subiendo imagen...', 'info')
    const url = await siteContentStore.uploadImage(file)
    targetObj[fieldKey] = url
    toastStore.show('¡Imagen cargada en el formulario!', 'success')
  } catch (err) {
    toastStore.show(err.message || 'Error al subir imagen', 'error')
  } finally {
    event.target.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface-container font-sans text-primary">
    
    <!-- LOGIN SCREEN FOR UNAUTHENTICATED USERS -->
    <div v-if="!isAuthenticated" class="min-h-screen flex items-center justify-center p-4">
      <div class="bg-surface border border-outline-variant rounded-xs p-8 sm:p-12 max-w-md w-full shadow-lg space-y-6">
        <div class="text-center space-y-2">
          <div class="w-14 h-14 bg-surface-container rounded-full border border-outline-variant flex items-center justify-center mx-auto text-primary shadow-xs">
            <span class="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <h1 class="font-sans text-3xl font-normal text-primary">Gicca Admin</h1>
          <p class="font-sans text-xs text-secondary">Panel de gestión de ventas y catálogo</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
              Contraseña de Acceso
            </label>
            <input 
              v-model="adminPassword"
              type="password" 
              required
              placeholder="••••••••"
              class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-sm font-sans focus:border-primary focus:outline-none"
            />
            <p v-if="loginError" class="text-xs text-red-600 font-sans mt-2 flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">error</span>
              {{ loginError }}
            </p>
          </div>

          <button 
            type="submit"
            class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 rounded-full border border-primary-container hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span>Ingresar al Panel</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </form>
      </div>
    </div>

    <!-- MAIN ADMIN DASHBOARD -->
    <div v-else class="pb-24">
      
      <!-- Top Sticky Admin Navbar -->
      <header class="sticky top-0 z-40 bg-surface border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-3.5 shadow-2xs">
        <div class="max-w-container-max mx-auto flex justify-between items-center">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="font-serif text-xl font-bold tracking-wider text-primary">GICCA</span>
              <span class="bg-surface-container px-2 py-0.5 rounded-full text-[10px] font-label uppercase font-bold text-secondary border border-outline-variant">
                Boutique Manager
              </span>
            </div>

            <!-- Main Admin Tabs (Tienda Nube Style) -->
            <nav class="hidden md:flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant">
              <button 
                @click="activeAdminTab = 'ventas'"
                class="px-4 py-1.5 rounded-full text-xs font-label uppercase tracking-wider transition-all flex items-center gap-1.5"
                :class="activeAdminTab === 'ventas' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span class="material-symbols-outlined text-sm">shopping_cart</span>
                <span>Ventas & Pedidos</span>
                <span class="bg-surface text-primary px-1.5 py-0.2 text-[10px] rounded-full font-mono">{{ ordersStore.items.length }}</span>
              </button>

              <button 
                @click="activeAdminTab = 'productos'"
                class="px-4 py-1.5 rounded-full text-xs font-label uppercase tracking-wider transition-all flex items-center gap-1.5"
                :class="activeAdminTab === 'productos' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span class="material-symbols-outlined text-sm">inventory_2</span>
                <span>Perfumes & Catálogo</span>
                <span class="bg-surface text-primary px-1.5 py-0.2 text-[10px] rounded-full font-mono">{{ productStore.items.length }}</span>
              </button>

              <button 
                @click="activeAdminTab = 'finanzas'"
                class="px-4 py-1.5 rounded-full text-xs font-label uppercase tracking-wider transition-all flex items-center gap-1.5"
                :class="activeAdminTab === 'finanzas' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span class="material-symbols-outlined text-sm">trending_up</span>
                <span>Rentabilidad & Ganancias</span>
              </button>

              <button 
                @click="activeAdminTab = 'diseno'"
                class="px-4 py-1.5 rounded-full text-xs font-label uppercase tracking-wider transition-all flex items-center gap-1.5"
                :class="activeAdminTab === 'diseno' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span class="material-symbols-outlined text-sm">palette</span>
                <span>Diseño & Contenido Web</span>
              </button>
            </nav>
          </div>

          <!-- Actions & Logout -->
          <div class="flex items-center gap-3">
            <RouterLink 
              to="/" 
              target="_blank"
              class="hidden sm:flex items-center gap-1 text-xs font-label uppercase tracking-wider text-secondary hover:text-primary transition-colors"
            >
              <span>Ver Tienda</span>
              <span class="material-symbols-outlined text-sm">open_in_new</span>
            </RouterLink>

            <button 
              @click="handleLogout"
              class="p-2 text-secondary hover:text-primary hover:bg-surface-container rounded-full transition-colors"
              title="Cerrar Sesión"
            >
              <span class="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>

        <!-- Mobile Navigation Pills -->
        <div class="flex md:hidden items-center gap-2 mt-3 overflow-x-auto pb-1">
          <button 
            @click="activeAdminTab = 'ventas'"
            class="px-3 py-1 rounded-full text-xs font-label uppercase tracking-wider flex-shrink-0"
            :class="activeAdminTab === 'ventas' ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-secondary'"
          >
            Ventas ({{ ordersStore.items.length }})
          </button>
          <button 
            @click="activeAdminTab = 'productos'"
            class="px-3 py-1 rounded-full text-xs font-label uppercase tracking-wider flex-shrink-0"
            :class="activeAdminTab === 'productos' ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-secondary'"
          >
            Perfumes ({{ productStore.items.length }})
          </button>
          <button 
            @click="activeAdminTab = 'finanzas'"
            class="px-3 py-1 rounded-full text-xs font-label uppercase tracking-wider flex-shrink-0"
            :class="activeAdminTab === 'finanzas' ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-secondary'"
          >
            Rentabilidad
          </button>
          <button 
            @click="activeAdminTab = 'diseno'"
            class="px-3 py-1 rounded-full text-xs font-label uppercase tracking-wider flex-shrink-0"
            :class="activeAdminTab === 'diseno' ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-secondary'"
          >
            Diseño & Contenido
          </button>
        </div>
      </header>

      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-8 space-y-8">

        <!-- ==================================================== -->
        <!-- TAB 1: VENTAS & PEDIDOS (TIENDA NUBE STYLE) -->
        <!-- ==================================================== -->
        <div v-if="activeAdminTab === 'ventas'" class="space-y-6">
          
          <!-- Sales Financial Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Facturación -->
            <div class="bg-surface border border-outline-variant rounded-xs p-5 shadow-xs">
              <div class="flex justify-between items-start mb-2">
                <span class="font-label text-xs uppercase tracking-wider text-secondary">Facturación Bruta</span>
                <span class="material-symbols-outlined text-xl text-primary">payments</span>
              </div>
              <p class="font-sans text-2xl sm:text-3xl font-bold text-primary">
                ${{ ordersStore.stats.totalRevenue.toLocaleString('es-AR') }}
              </p>
              <p class="text-xs text-secondary mt-1">{{ ordersStore.stats.paidOrdersCount }} ventas cobradas</p>
            </div>

            <!-- Costo de Mercadería -->
            <div class="bg-surface border border-outline-variant rounded-xs p-5 shadow-xs">
              <div class="flex justify-between items-start mb-2">
                <span class="font-label text-xs uppercase tracking-wider text-secondary">Costo de Mercadería</span>
                <span class="material-symbols-outlined text-xl text-secondary">inventory</span>
              </div>
              <p class="font-sans text-2xl sm:text-3xl font-bold text-secondary">
                ${{ ordersStore.stats.totalCost.toLocaleString('es-AR') }}
              </p>
              <p class="text-xs text-secondary mt-1">Costo reposición de frascos</p>
            </div>

            <!-- Ganancia Neta Real -->
            <div class="bg-emerald-50 border border-emerald-200 rounded-xs p-5 shadow-xs">
              <div class="flex justify-between items-start mb-2">
                <span class="font-label text-xs uppercase tracking-wider text-emerald-900 font-bold">Ganancia Neta Real</span>
                <span class="material-symbols-outlined text-xl text-emerald-700">savings</span>
              </div>
              <p class="font-sans text-2xl sm:text-3xl font-bold text-emerald-900">
                ${{ ordersStore.stats.totalProfit.toLocaleString('es-AR') }}
              </p>
              <p class="text-xs text-emerald-700 font-medium mt-1">Margen global: +{{ ordersStore.stats.overallProfitMargin }}%</p>
            </div>

            <!-- Ticket Promedio & Despachos -->
            <div class="bg-surface border border-outline-variant rounded-xs p-5 shadow-xs">
              <div class="flex justify-between items-start mb-2">
                <span class="font-label text-xs uppercase tracking-wider text-secondary">Ticket Promedio</span>
                <span class="material-symbols-outlined text-xl text-primary">local_shipping</span>
              </div>
              <p class="font-sans text-2xl sm:text-3xl font-bold text-primary">
                ${{ ordersStore.stats.averageTicket.toLocaleString('es-AR') }}
              </p>
              <p class="text-xs text-secondary mt-1">{{ ordersStore.stats.pendingShippingCount }} pedidos por despachar</p>
            </div>
          </div>

          <!-- Sales Filter & Action Bar (Tienda Nube) -->
          <div class="bg-surface border border-outline-variant rounded-xs p-4 sm:p-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-xs">
            <div class="flex flex-wrap items-center gap-3 flex-grow">
              <!-- Search -->
              <div class="relative min-w-[240px] flex-grow sm:flex-grow-0">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">search</span>
                <input 
                  v-model="orderSearchQuery"
                  type="text" 
                  placeholder="Buscar por Nº, cliente o ciudad..."
                  class="w-full bg-surface-container border border-outline-variant rounded-xs pl-9 pr-3 py-2 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <!-- Payment Filter -->
              <select 
                v-model="orderPaymentFilter"
                class="bg-surface-container border border-outline-variant rounded-xs px-3 py-2 text-xs font-sans focus:border-primary focus:outline-none"
              >
                <option value="all">Todos los Pagos</option>
                <option value="paid">Pagados</option>
                <option value="pending">Pendientes de Pago</option>
                <option value="cancelled">Cancelados</option>
              </select>

              <!-- Fulfillment Filter -->
              <select 
                v-model="orderFulfillmentFilter"
                class="bg-surface-container border border-outline-variant rounded-xs px-3 py-2 text-xs font-sans focus:border-primary focus:outline-none"
              >
                <option value="all">Todos los Despachos</option>
                <option value="unfulfilled">Sin empaquetar</option>
                <option value="packing">En preparación</option>
                <option value="shipped">Despachado Andreani</option>
                <option value="delivered">Entregado</option>
              </select>
            </div>

            <!-- Main Button: Nueva Venta Manual -->
            <button 
              @click="openCreateManualOrderModal"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-5 py-3 rounded-full hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md flex-shrink-0"
            >
              <span class="material-symbols-outlined text-base">add_circle</span>
              <span>+ Cargar Venta Manual (Tienda Nube)</span>
            </button>
          </div>

          <!-- Sales Table -->
          <div class="bg-surface border border-outline-variant rounded-xs overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-sans">
                <thead class="bg-surface-container-high border-b border-outline-variant text-[11px] font-label uppercase tracking-wider text-secondary">
                  <tr>
                    <th class="py-3.5 px-4">Nº Pedido / Fecha</th>
                    <th class="py-3.5 px-4">Cliente & Contacto</th>
                    <th class="py-3.5 px-4">Perfumes Comprados</th>
                    <th class="py-3.5 px-4">Venta ($) | Costo ($)</th>
                    <th class="py-3.5 px-4">Ganancia Neta</th>
                    <th class="py-3.5 px-4">Pago</th>
                    <th class="py-3.5 px-4">Despacho</th>
                    <th class="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/60">
                  <tr v-if="filteredOrders.length === 0">
                    <td colspan="8" class="text-center py-12 text-secondary">
                      No se encontraron ventas con los filtros seleccionados.
                    </td>
                  </tr>

                  <tr 
                    v-for="order in filteredOrders" 
                    :key="order.id"
                    class="hover:bg-surface-container-low transition-colors"
                  >
                    <!-- Order ID & Date -->
                    <td class="py-4 px-4 align-top">
                      <span class="font-mono font-bold text-primary block">#{{ order.orderNumber }}</span>
                      <span class="text-[11px] text-secondary">{{ new Date(order.date).toLocaleDateString('es-AR') }}</span>
                      <span class="text-[9px] font-label uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-surface-container block w-max mt-1">
                        {{ order.source === 'web' ? 'Tienda Web' : (order.source === 'whatsapp' ? 'WhatsApp' : 'Manual') }}
                      </span>
                    </td>

                    <!-- Customer -->
                    <td class="py-4 px-4 align-top">
                      <p class="font-medium text-primary">{{ order.customer?.firstName }} {{ order.customer?.lastName }}</p>
                      <p class="text-[11px] text-secondary">{{ order.customer?.city }}, {{ order.customer?.province }}</p>
                      <button 
                        @click="sendWhatsAppTracking(order)"
                        class="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 mt-1"
                        title="Abrir chat de WhatsApp"
                      >
                        <span class="material-symbols-outlined text-xs">chat</span>
                        <span>{{ order.customer?.phone }}</span>
                      </button>
                    </td>

                    <!-- Products list -->
                    <td class="py-4 px-4 align-top max-w-xs">
                      <div class="space-y-1">
                        <div 
                          v-for="item in order.items" 
                          :key="item.id"
                          class="flex items-center gap-1.5"
                        >
                          <span class="font-bold text-primary">{{ item.quantity }}x</span>
                          <span class="truncate text-secondary">{{ item.name }} ({{ item.size }})</span>
                        </div>
                      </div>
                    </td>

                    <!-- Revenue vs Cost -->
                    <td class="py-4 px-4 align-top">
                      <span class="font-bold text-primary block text-sm">${{ order.total.toLocaleString('es-AR') }}</span>
                      <span class="text-[11px] text-secondary">Costo: ${{ order.totalCost.toLocaleString('es-AR') }}</span>
                    </td>

                    <!-- Profit -->
                    <td class="py-4 px-4 align-top">
                      <span class="font-bold text-emerald-700 block text-sm">
                        +${{ order.profit.toLocaleString('es-AR') }}
                      </span>
                      <span class="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">
                        {{ order.profitMargin }}% Margen
                      </span>
                    </td>

                    <!-- Payment Status Select -->
                    <td class="py-4 px-4 align-top">
                      <select 
                        :value="order.paymentStatus" 
                        @change="updateOrderStatus(order, 'paymentStatus', $event.target.value)"
                        class="text-[11px] font-label uppercase font-bold px-2 py-1 rounded-full border border-outline-variant focus:outline-none"
                        :class="order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'"
                      >
                        <option value="paid">Pagado</option>
                        <option value="pending">Pendiente</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>

                    <!-- Fulfillment Status Select -->
                    <td class="py-4 px-4 align-top">
                      <select 
                        :value="order.fulfillmentStatus" 
                        @change="updateOrderStatus(order, 'fulfillmentStatus', $event.target.value)"
                        class="text-[11px] font-label uppercase font-bold px-2 py-1 rounded-full border border-outline-variant focus:outline-none"
                        :class="order.fulfillmentStatus === 'delivered' ? 'bg-blue-100 text-blue-900' : (order.fulfillmentStatus === 'shipped' ? 'bg-purple-100 text-purple-900' : 'bg-surface-container text-secondary')"
                      >
                        <option value="unfulfilled">Sin Empaque</option>
                        <option value="packing">Preparando</option>
                        <option value="shipped">Despachado</option>
                        <option value="delivered">Entregado</option>
                      </select>
                    </td>

                    <!-- Actions -->
                    <td class="py-4 px-4 align-top text-right space-x-1">
                      <button 
                        @click="viewOrderDetail(order)"
                        class="p-1.5 text-secondary hover:text-primary rounded-full hover:bg-surface-container transition-colors"
                        title="Ver Remito / Detalle"
                      >
                        <span class="material-symbols-outlined text-base">receipt_long</span>
                      </button>
                      <button 
                        @click="ordersStore.deleteOrder(order.id)"
                        class="p-1.5 text-secondary hover:text-error rounded-full hover:bg-surface-container transition-colors"
                        title="Eliminar Pedido"
                      >
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ==================================================== -->
        <!-- TAB 2: PERFUMES & CATÁLOGO (CON COSTO & VENTA) -->
        <!-- ==================================================== -->
        <div v-if="activeAdminTab === 'productos'" class="space-y-6">
          
          <!-- Header Actions for Products -->
          <div class="bg-surface border border-outline-variant rounded-xs p-4 sm:p-5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-xs">
            <div class="flex flex-wrap items-center gap-3 flex-grow">
              <div class="relative min-w-[240px] flex-grow sm:flex-grow-0">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">search</span>
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Buscar perfume o marca..."
                  class="w-full bg-surface-container border border-outline-variant rounded-xs pl-9 pr-3 py-2 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <select 
                v-model="filterGender"
                class="bg-surface-container border border-outline-variant rounded-xs px-3 py-2 text-xs font-sans focus:border-primary focus:outline-none"
              >
                <option value="all">Todos los Géneros</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
                <option value="unisex">Unisex</option>
              </select>

              <select 
                v-model="filterCategory"
                class="bg-surface-container border border-outline-variant rounded-xs px-3 py-2 text-xs font-sans focus:border-primary focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                <option value="disenador">Diseñador</option>
                <option value="nicho">Nicho</option>
                <option value="arabe">Árabe</option>
              </select>
            </div>

            <button 
              @click="openCreateModal"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-5 py-3 rounded-full hover:bg-inverse-surface transition-all flex items-center justify-center gap-2 shadow-md flex-shrink-0"
            >
              <span class="material-symbols-outlined text-base">add</span>
              <span>+ Nuevo Perfume</span>
            </button>
          </div>

          <!-- Products Table with Cost and Profit -->
          <div class="bg-surface border border-outline-variant rounded-xs overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-sans">
                <thead class="bg-surface-container-high border-b border-outline-variant text-[11px] font-label uppercase tracking-wider text-secondary">
                  <tr>
                    <th class="py-3.5 px-4">Fragancia</th>
                    <th class="py-3.5 px-4">Marca & Tipo</th>
                    <th class="py-3.5 px-4">Precio Venta</th>
                    <th class="py-3.5 px-4">Precio Costo</th>
                    <th class="py-3.5 px-4">Ganancia Unitaria</th>
                    <th class="py-3.5 px-4">Stock</th>
                    <th class="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/60">
                  <tr v-if="filteredProducts.length === 0">
                    <td colspan="7" class="text-center py-12 text-secondary">
                      No se encontraron perfumes en el catálogo.
                    </td>
                  </tr>

                  <tr 
                    v-for="p in filteredProducts" 
                    :key="p.id"
                    class="hover:bg-surface-container-low transition-colors"
                  >
                    <td class="py-3.5 px-4 flex items-center gap-3">
                      <img 
                        :src="p.images[0]" 
                        :alt="p.name"
                        class="w-10 h-12 object-cover rounded-xs border border-outline-variant flex-shrink-0 bg-surface-container"
                      />
                      <div>
                        <p class="font-medium text-primary text-sm">{{ p.name }}</p>
                        <p class="text-[11px] text-secondary">{{ p.sizes?.[0]?.size || '100 ml' }}</p>
                      </div>
                    </td>

                    <td class="py-3.5 px-4">
                      <span class="font-medium text-primary block">{{ p.brand }}</span>
                      <span class="text-[11px] text-secondary capitalize">{{ p.category }} • {{ p.concentration }}</span>
                    </td>

                    <td class="py-3.5 px-4 font-bold text-sm text-primary">
                      ${{ (p.price || 0).toLocaleString('es-AR') }}
                    </td>

                    <td class="py-3.5 px-4 text-secondary font-medium">
                      ${{ (p.costPrice || Math.round((p.price || 0) * 0.45)).toLocaleString('es-AR') }}
                    </td>

                    <td class="py-3.5 px-4">
                      <span class="font-bold text-emerald-700 block text-sm">
                        +${{ (p.profit || Math.max(0, (p.price || 0) - (p.costPrice || Math.round((p.price || 0) * 0.45)))).toLocaleString('es-AR') }}
                      </span>
                      <span class="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">
                        {{ p.profitMargin || 55 }}% Margen
                      </span>
                    </td>

                    <td class="py-3.5 px-4">
                      <span class="bg-surface-container px-2 py-1 rounded-full text-xs font-mono font-bold text-primary">
                        {{ p.stock ?? 10 }} un.
                      </span>
                    </td>

                    <td class="py-3.5 px-4 text-right space-x-1">
                      <button 
                        @click="openEditModal(p)"
                        class="p-1.5 text-secondary hover:text-primary rounded-full hover:bg-surface-container transition-colors"
                        title="Editar Perfume"
                      >
                        <span class="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button 
                        @click="confirmDeleteProduct(p)"
                        class="p-1.5 text-secondary hover:text-error rounded-full hover:bg-surface-container transition-colors"
                        title="Eliminar Perfume"
                      >
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ==================================================== -->
        <!-- TAB 3: FINANZAS & RENTABILIDAD -->
        <!-- ==================================================== -->
        <div v-if="activeAdminTab === 'finanzas'" class="space-y-6">
          <div class="bg-surface border border-outline-variant rounded-xs p-8 shadow-md space-y-6">
            <div class="border-b border-outline-variant pb-4">
              <h2 class="font-sans text-2xl text-primary font-normal">Métricas de Rentabilidad y Ganancias</h2>
              <p class="font-sans text-xs text-secondary mt-1">Análisis financiero de costos de adquisición vs ingresos por ventas.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="p-6 bg-surface-container rounded-xs border border-outline-variant space-y-2">
                <span class="font-label text-xs uppercase text-secondary">Ingresos Totales Brutos</span>
                <p class="font-sans text-3xl font-bold text-primary">
                  ${{ ordersStore.stats.totalRevenue.toLocaleString('es-AR') }}
                </p>
                <p class="text-xs text-secondary">100% de la facturación en órdenes cobradas</p>
              </div>

              <div class="p-6 bg-surface-container rounded-xs border border-outline-variant space-y-2">
                <span class="font-label text-xs uppercase text-secondary">Costos de Adquisición / Stock</span>
                <p class="font-sans text-3xl font-bold text-secondary">
                  ${{ ordersStore.stats.totalCost.toLocaleString('es-AR') }}
                </p>
                <p class="text-xs text-secondary">Costo directo de los frascos vendidos</p>
              </div>

              <div class="p-6 bg-emerald-50 border border-emerald-300 rounded-xs space-y-2">
                <span class="font-label text-xs uppercase text-emerald-900 font-bold">Ganancia Neta en Mano</span>
                <p class="font-sans text-3xl font-bold text-emerald-900">
                  ${{ ordersStore.stats.totalProfit.toLocaleString('es-AR') }}
                </p>
                <p class="text-xs text-emerald-800 font-bold">Margen neto promedio: {{ ordersStore.stats.overallProfitMargin }}%</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================================================== -->
        <!-- TAB 4: DISEÑO & PERSONALIZACIÓN DE CONTENIDO Y FOTOS -->
        <!-- ==================================================== -->
        <div v-if="activeAdminTab === 'diseno'" class="space-y-6 animate-in fade-in">
          
          <!-- Sub-header & Subtabs Navigation -->
          <div class="bg-surface border border-outline-variant rounded-xs p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 class="font-sans text-2xl text-primary font-normal">Personalización Visual de la Tienda</h2>
              <p class="font-sans text-xs text-secondary mt-1">
                Modificá todas las imágenes estáticas, tarjetas del Bento Grid de portada y familias olfativas en tiempo real.
              </p>
            </div>

            <!-- Subtabs -->
            <div class="flex flex-wrap items-center gap-1.5 bg-surface-container p-1 rounded-full border border-outline-variant text-xs font-label uppercase">
              <button 
                @click="activeDesignSubtab = 'categorias'"
                class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                :class="activeDesignSubtab === 'categorias' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span>Categorías</span>
                <span class="bg-surface text-primary px-1.5 py-0.2 text-[10px] rounded-full font-mono">{{ siteContentStore.mainCategories.length }}</span>
              </button>
              <button 
                @click="activeDesignSubtab = 'familias'"
                class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                :class="activeDesignSubtab === 'familias' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span>Familias Olfativas</span>
                <span class="bg-surface text-primary px-1.5 py-0.2 text-[10px] rounded-full font-mono">{{ siteContentStore.olfactiveFamilies.length }}</span>
              </button>
              <button 
                @click="activeDesignSubtab = 'banners'"
                class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                :class="activeDesignSubtab === 'banners' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span>Banners Portada</span>
                <span class="bg-surface text-primary px-1.5 py-0.2 text-[10px] rounded-full font-mono">{{ siteContentStore.heroSlides.length }}</span>
              </button>
              <button 
                @click="activeDesignSubtab = 'editorial'"
                class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                :class="activeDesignSubtab === 'editorial' ? 'bg-primary-container text-on-primary font-bold shadow-2xs' : 'text-secondary hover:text-primary'"
              >
                <span>Sobre Nosotros</span>
              </button>
            </div>
          </div>

          <!-- SUBTAB 1: CATEGORÍAS PRINCIPALES (BENTO GRID) -->
          <div v-if="activeDesignSubtab === 'categorias'" class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 class="font-sans text-xl font-normal text-primary">Categorías Principales (Bento Grid Portada)</h3>
                <p class="font-sans text-xs text-secondary mt-0.5">
                  Estas tarjetas aparecen destacadas en la página de inicio. Podés cambiar la foto, editar textos, agregar nuevas o eliminarlas.
                </p>
              </div>

              <button 
                @click="openCreateCategoryModal"
                class="bg-primary-container hover:bg-inverse-surface text-on-primary font-label text-xs uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span class="material-symbols-outlined text-sm">add</span>
                <span>Nueva Categoría</span>
              </button>
            </div>

            <!-- Categories Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                v-for="cat in siteContentStore.mainCategories" 
                :key="cat.id"
                class="bg-surface border border-outline-variant rounded-xs overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <!-- Image preview & quick upload -->
                  <div class="relative aspect-[16/9] bg-surface-container overflow-hidden group">
                    <img 
                      :src="cat.image" 
                      :alt="cat.title"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label class="bg-surface/90 hover:bg-surface text-primary font-label text-xs uppercase px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1 shadow-md">
                        <span class="material-symbols-outlined text-sm">upload</span>
                        <span>Cambiar Foto</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          class="hidden" 
                          @change="handleDirectImageUpload(cat, 'image', $event)" 
                        />
                      </label>
                    </div>

                    <div class="absolute top-2 left-2 bg-surface/90 backdrop-blur-xs font-label text-[10px] font-bold px-2 py-0.5 rounded-full text-primary border border-outline-variant shadow-xs">
                      {{ cat.subtitle || 'Categoría' }}
                    </div>

                    <div class="absolute top-2 right-2 bg-primary-container text-on-primary font-label text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      {{ cat.span === 12 ? 'Ancho Completo (12 cols)' : 'Media Pantalla (6 cols)' }}
                    </div>
                  </div>

                  <!-- Info -->
                  <div class="p-5 space-y-2">
                    <h4 class="font-sans text-xl text-primary font-normal">{{ cat.title }}</h4>
                    <p class="font-sans text-xs text-secondary line-clamp-2 leading-relaxed">{{ cat.description }}</p>
                    
                    <div class="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-secondary">
                      <span class="bg-surface-container px-2 py-0.5 rounded-xs border border-outline-variant">Enlace: {{ cat.link }}</span>
                      <span class="bg-surface-container px-2 py-0.5 rounded-xs border border-outline-variant">Botón: {{ cat.buttonText || 'Ver Colección' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="border-t border-outline-variant p-3 bg-surface-container flex justify-between items-center">
                  <label class="text-xs text-primary font-label uppercase flex items-center gap-1 cursor-pointer hover:text-primary-container">
                    <span class="material-symbols-outlined text-sm">photo_camera</span>
                    <span>Subir Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      class="hidden" 
                      @change="handleDirectImageUpload(cat, 'image', $event)" 
                    />
                  </label>

                  <div class="flex items-center gap-1">
                    <button 
                      @click="openEditCategoryModal(cat)"
                      class="p-1.5 text-secondary hover:text-primary rounded-full hover:bg-surface transition-colors"
                      title="Editar Categoría"
                    >
                      <span class="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button 
                      @click="confirmDeleteContentItem('category', cat, cat.title)"
                      class="p-1.5 text-secondary hover:text-error rounded-full hover:bg-surface transition-colors"
                      title="Eliminar Categoría"
                    >
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUBTAB 2: FAMILIAS OLFATIVAS -->
          <div v-if="activeDesignSubtab === 'familias'" class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 class="font-sans text-xl font-normal text-primary">Familias Olfativas (Guía Aromática & Filtros)</h3>
                <p class="font-sans text-xs text-secondary mt-0.5">
                  Familias aromáticas exhibidas en la portada y utilizadas como filtros aromáticos en el catálogo. Podés agregar notas como Gourmand, Acuática, Cuero, etc.
                </p>
              </div>

              <button 
                @click="openCreateFamilyModal"
                class="bg-primary-container hover:bg-inverse-surface text-on-primary font-label text-xs uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span class="material-symbols-outlined text-sm">add</span>
                <span>Nueva Familia Olfativa</span>
              </button>
            </div>

            <!-- Families Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div 
                v-for="fam in siteContentStore.olfactiveFamilies" 
                :key="fam.id || fam.name"
                class="bg-surface border border-outline-variant rounded-xs overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div class="relative aspect-square bg-surface-container overflow-hidden group">
                    <img 
                      :src="fam.image" 
                      :alt="fam.name"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label class="bg-surface/90 hover:bg-surface text-primary font-label text-xs uppercase px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1 shadow-md">
                        <span class="material-symbols-outlined text-sm">upload</span>
                        <span>Cambiar Foto</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          class="hidden" 
                          @change="handleDirectImageUpload(fam, 'image', $event)" 
                        />
                      </label>
                    </div>
                  </div>

                  <div class="p-4 space-y-1.5">
                    <h4 class="font-serif text-xl text-primary font-normal">{{ fam.name }}</h4>
                    <p class="font-sans text-xs text-secondary leading-relaxed line-clamp-3">{{ fam.description }}</p>
                  </div>
                </div>

                <div class="border-t border-outline-variant p-2.5 bg-surface-container flex justify-between items-center">
                  <label class="text-[11px] text-primary font-label uppercase flex items-center gap-1 cursor-pointer hover:text-primary-container">
                    <span class="material-symbols-outlined text-sm">photo_camera</span>
                    <span>Subir Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      class="hidden" 
                      @change="handleDirectImageUpload(fam, 'image', $event)" 
                    />
                  </label>

                  <div class="flex items-center gap-1">
                    <button 
                      @click="openEditFamilyModal(fam)"
                      class="p-1.5 text-secondary hover:text-primary rounded-full hover:bg-surface transition-colors"
                      title="Editar Familia"
                    >
                      <span class="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button 
                      @click="confirmDeleteContentItem('family', fam, fam.name)"
                      class="p-1.5 text-secondary hover:text-error rounded-full hover:bg-surface transition-colors"
                      title="Eliminar Familia"
                    >
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SUBTAB 3: BANNERS DE PORTADA (HERO SLIDER) -->
          <div v-if="activeDesignSubtab === 'banners'" class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 class="font-sans text-xl font-normal text-primary">Diapositivas del Banner Principal</h3>
                <p class="font-sans text-xs text-secondary mt-0.5">
                  Gestioná los fondos, frascos flotantes, títulos y botones del gran carrusel de inicio.
                </p>
              </div>

              <button 
                @click="openCreateSlideModal"
                class="bg-primary-container hover:bg-inverse-surface text-on-primary font-label text-xs uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span class="material-symbols-outlined text-sm">add</span>
                <span>Nuevo Slide</span>
              </button>
            </div>

            <!-- Slides List -->
            <div class="space-y-4">
              <div 
                v-for="(slide, idx) in siteContentStore.heroSlides" 
                :key="slide.id"
                class="bg-surface border border-outline-variant rounded-xs p-5 shadow-xs flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between"
              >
                <!-- Images previews -->
                <div class="flex items-center gap-4 flex-shrink-0">
                  <!-- Background preview -->
                  <div class="relative w-36 h-24 rounded-xs overflow-hidden border border-outline-variant group bg-surface-container">
                    <img :src="slide.image" :alt="slide.title" class="w-full h-full object-cover" />
                    <label class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-label uppercase cursor-pointer">
                      <span class="material-symbols-outlined text-base">upload</span>
                      <span>Fondo</span>
                      <input type="file" accept="image/*" class="hidden" @change="handleDirectImageUpload(slide, 'image', $event)" />
                    </label>
                  </div>

                  <!-- Bottle preview -->
                  <div class="relative w-20 h-24 rounded-xs overflow-hidden border border-outline-variant group bg-surface-container">
                    <img :src="slide.bottleImage" :alt="slide.featuredTitle" class="w-full h-full object-cover" />
                    <label class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-label uppercase cursor-pointer">
                      <span class="material-symbols-outlined text-base">upload</span>
                      <span>Frasco</span>
                      <input type="file" accept="image/*" class="hidden" @change="handleDirectImageUpload(slide, 'bottleImage', $event)" />
                    </label>
                  </div>
                </div>

                <!-- Text info -->
                <div class="flex-grow space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-secondary">#{{ idx + 1 }}</span>
                    <span class="bg-surface-container px-2 py-0.5 rounded-full text-[10px] font-label uppercase font-bold text-primary border border-outline-variant">
                      {{ slide.tag }}
                    </span>
                  </div>
                  <h4 class="font-sans text-lg font-medium text-primary">{{ slide.title }} <span class="italic font-serif">{{ slide.highlight }}</span></h4>
                  <p class="font-sans text-xs text-secondary line-clamp-1 max-w-xl">{{ slide.description }}</p>
                  <p class="text-[11px] text-secondary">Destacado: <strong>{{ slide.featuredTitle }}</strong> ({{ slide.featuredRating }})</p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button 
                    @click="openEditSlideModal(slide)"
                    class="bg-surface border border-outline hover:border-primary text-primary font-label text-xs uppercase px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                  >
                    <span class="material-symbols-outlined text-sm">edit</span>
                    <span>Editar Textos</span>
                  </button>
                  <button 
                    @click="confirmDeleteContentItem('slide', slide, slide.title)"
                    class="p-2 text-secondary hover:text-error rounded-full hover:bg-surface-container transition-colors"
                    title="Eliminar Slide"
                  >
                    <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- SUBTAB 4: IMÁGENES EDITORIALES (SOBRE NOSOTROS) -->
          <div v-if="activeDesignSubtab === 'editorial'" class="space-y-6">
            <div class="bg-surface border border-outline-variant rounded-xs p-6 shadow-xs space-y-6 max-w-3xl">
              <div>
                <h3 class="font-sans text-xl font-normal text-primary">Fotografía de "Sobre Nosotros"</h3>
                <p class="font-sans text-xs text-secondary mt-0.5">
                  Esta foto aparece en la sección editorial de la página <RouterLink to="/nosotros" target="_blank" class="underline text-primary font-bold">/nosotros</RouterLink>.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div class="aspect-[4/5] bg-surface-container border border-outline-variant rounded-xs overflow-hidden shadow-sm relative group">
                  <img 
                    :src="siteContentStore.editorial?.aboutImage || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85'" 
                    alt="Sobre Nosotros Preview"
                    class="w-full h-full object-cover"
                  />
                  <label class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-label uppercase cursor-pointer">
                    <span class="material-symbols-outlined text-2xl">upload</span>
                    <span>Cambiar Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      class="hidden" 
                      @change="handleDirectImageUpload(siteContentStore.editorial, 'aboutImage', $event)" 
                    />
                  </label>
                </div>

                <div class="space-y-4">
                  <div>
                    <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                      Subir archivo desde la PC
                    </label>
                    <label class="inline-flex items-center gap-2 bg-primary-container text-on-primary font-label text-xs uppercase px-4 py-2.5 rounded-full cursor-pointer hover:bg-inverse-surface transition-all shadow-xs">
                      <span class="material-symbols-outlined text-sm">upload</span>
                      <span>Seleccionar Archivo...</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        class="hidden" 
                        @change="handleDirectImageUpload(siteContentStore.editorial, 'aboutImage', $event)" 
                      />
                    </label>
                  </div>

                  <div>
                    <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
                      O ingresar URL directa de la imagen
                    </label>
                    <input 
                      v-model="siteContentStore.editorial.aboutImage" 
                      type="text" 
                      placeholder="https://..."
                      class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none"
                    />
                  </div>

                  <button 
                    @click="handleSaveEditorial"
                    :disabled="isSubmittingEditorial"
                    class="bg-surface border border-outline hover:border-primary text-primary font-label text-xs uppercase px-5 py-2.5 rounded-full flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  >
                    <span class="material-symbols-outlined text-sm">save</span>
                    <span>{{ isSubmittingEditorial ? 'Guardando...' : 'Guardar Cambios' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>

    <!-- ==================================================== -->
    <!-- MODAL: CARGAR VENTA MANUAL (TIENDA NUBE) -->
    <!-- ==================================================== -->
    <div v-if="isManualOrderModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6 sm:p-8">
        
        <div class="flex justify-between items-center border-b border-outline-variant pb-4">
          <div>
            <h2 class="font-sans text-2xl text-primary font-normal">+ Registrar Venta Manual</h2>
            <p class="font-sans text-xs text-secondary mt-0.5">Creá un pedido como en Tienda Nube y calculá la ganancia al instante.</p>
          </div>
          <button @click="closeManualOrderModal" class="p-2 text-secondary hover:text-primary rounded-full">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form @submit.prevent="handleSaveManualOrder" class="space-y-4">
          
          <!-- Product Selector -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-3">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">1. Producto & Precios</label>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-secondary mb-1">Perfume del Catálogo *</label>
                <select 
                  v-model="manualOrderForm.selectedProductId"
                  required
                  class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
                >
                  <option v-for="p in productStore.items" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.brand }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] text-secondary mb-1">Cantidad *</label>
                <input 
                  v-model.number="manualOrderForm.quantity"
                  type="number" 
                  min="1" 
                  required
                  class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label class="block text-[11px] text-secondary mb-1">Precio Unitario de Venta ($ ARS) *</label>
                <input 
                  v-model.number="manualOrderForm.unitPrice"
                  type="number" 
                  min="0" 
                  required
                  class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-[11px] text-secondary mb-1">Precio Unitario de Costo ($ ARS) *</label>
                <input 
                  v-model.number="manualOrderForm.unitCostPrice"
                  type="number" 
                  min="0" 
                  required
                  class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Customer Data -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-3">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">2. Datos del Cliente</label>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input 
                v-model="manualOrderForm.customer.firstName" 
                type="text" 
                required 
                placeholder="Nombre *" 
                class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans"
              />
              <input 
                v-model="manualOrderForm.customer.lastName" 
                type="text" 
                placeholder="Apellido" 
                class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input 
                v-model="manualOrderForm.customer.phone" 
                type="tel" 
                required 
                placeholder="WhatsApp / Teléfono *" 
                class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans"
              />
              <input 
                v-model="manualOrderForm.customer.email" 
                type="email" 
                placeholder="Email (opcional)" 
                class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input 
                v-model="manualOrderForm.customer.address" 
                type="text" 
                required 
                placeholder="Dirección y Número *" 
                class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans sm:col-span-2"
              />
              <input 
                v-model="manualOrderForm.customer.postalCode" 
                type="text" 
                required 
                placeholder="Código Postal *" 
                class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans"
              />
            </div>
          </div>

          <!-- Shipping & Payment Method -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-3">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">3. Logística & Pago</label>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-secondary mb-1">Método de Envío</label>
                <select v-model="manualOrderForm.shippingMethod" class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans">
                  <option>Andreani Estándar a Domicilio</option>
                  <option>Retiro en Sucursal Andreani</option>
                  <option>Retiro en Boutique / Local</option>
                  <option>Envío Personalizado</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] text-secondary mb-1">Medio de Pago</label>
                <select v-model="manualOrderForm.paymentMethod" class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans">
                  <option value="transfer">Transferencia Bancaria</option>
                  <option value="credit_card">Tarjeta de Crédito / Débito</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="cash">Efectivo en Tienda</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label class="block text-[11px] text-secondary mb-1">Estado de Pago</label>
                <select v-model="manualOrderForm.paymentStatus" class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans">
                  <option value="paid">Pagado (Abonado)</option>
                  <option value="pending">Pendiente de Pago</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] text-secondary mb-1">Descuento Manual ($ ARS)</label>
                <input 
                  v-model.number="manualOrderForm.discountAmount" 
                  type="number" 
                  min="0" 
                  placeholder="0"
                  class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans"
                />
              </div>
            </div>
          </div>

          <!-- Real-Time Profit Calculation Box -->
          <div class="bg-emerald-50 border border-emerald-300 rounded-xs p-4 flex justify-between items-center text-xs">
            <div>
              <span class="font-label uppercase font-bold text-emerald-900 block">Resumen de Rentabilidad:</span>
              <span class="text-emerald-800">Total Venta: ${{ manualOrderTotal.toLocaleString('es-AR') }} | Costo: ${{ manualOrderTotalCost.toLocaleString('es-AR') }}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-base text-emerald-900 block">+${{ manualOrderProfit.toLocaleString('es-AR') }}</span>
              <span class="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-2 py-0.5 rounded-full">
                {{ manualOrderProfitMargin }}% Margen
              </span>
            </div>
          </div>

          <!-- Submit Action -->
          <div class="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              @click="closeManualOrderModal"
              class="px-5 py-2.5 text-xs font-label uppercase rounded-full border border-outline-variant hover:bg-surface-container"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              :disabled="isSubmittingOrder"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-2.5 rounded-full hover:bg-inverse-surface transition-all shadow-md disabled:opacity-50"
            >
              <span>{{ isSubmittingOrder ? 'Guardando...' : 'Crear y Registrar Venta' }}</span>
            </button>
          </div>

        </form>

      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: DETALLE / REMITO DE ORDEN -->
    <!-- ==================================================== -->
    <div v-if="isOrderDetailModalOpen && selectedOrderForDetail" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        <div class="flex justify-between items-center border-b border-outline-variant pb-3">
          <div>
            <span class="font-label text-[10px] uppercase tracking-widest text-secondary">Comprobante de Venta</span>
            <h3 class="font-sans text-2xl text-primary font-bold">#{{ selectedOrderForDetail.orderNumber }}</h3>
          </div>
          <button @click="isOrderDetailModalOpen = false" class="p-2 text-secondary hover:text-primary rounded-full">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div class="space-y-3 text-xs font-sans">
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-1.5">
            <p class="font-bold text-primary text-sm">{{ selectedOrderForDetail.customer?.firstName }} {{ selectedOrderForDetail.customer?.lastName }}</p>
            <p class="text-secondary">{{ selectedOrderForDetail.customer?.address }} (CP {{ selectedOrderForDetail.customer?.postalCode }}), {{ selectedOrderForDetail.customer?.city }}</p>
            <p class="text-secondary">Tel: {{ selectedOrderForDetail.customer?.phone }}</p>
          </div>

          <div class="border border-outline-variant rounded-xs divide-y divide-outline-variant">
            <div 
              v-for="item in selectedOrderForDetail.items" 
              :key="item.id"
              class="p-3 flex justify-between items-center"
            >
              <div>
                <p class="font-medium text-primary">{{ item.quantity }}x {{ item.name }}</p>
                <p class="text-[11px] text-secondary">{{ item.brand }} • {{ item.size }}</p>
              </div>
              <span class="font-bold text-primary">${{ (item.price * item.quantity).toLocaleString('es-AR') }}</span>
            </div>
          </div>

          <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-xs space-y-1">
            <div class="flex justify-between text-secondary">
              <span>Total Venta:</span>
              <span class="font-bold text-primary text-sm">${{ selectedOrderForDetail.total.toLocaleString('es-AR') }}</span>
            </div>
            <div class="flex justify-between text-secondary">
              <span>Costo Total:</span>
              <span>${{ selectedOrderForDetail.totalCost.toLocaleString('es-AR') }}</span>
            </div>
            <div class="flex justify-between font-bold text-emerald-900 border-t border-emerald-200 pt-1 text-sm">
              <span>Ganancia Neta:</span>
              <span>+${{ selectedOrderForDetail.profit.toLocaleString('es-AR') }} ({{ selectedOrderForDetail.profitMargin }}%)</span>
            </div>
          </div>
          <!-- Andreani Shipping & Tracking Box -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-label text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">local_shipping</span>
                Envío & Logística Andreani
              </span>
              <span 
                class="px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase"
                :class="selectedOrderForDetail.fulfillmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' : (selectedOrderForDetail.fulfillmentStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')"
              >
                {{ selectedOrderForDetail.fulfillmentStatus === 'shipped' ? 'Despachado' : (selectedOrderForDetail.fulfillmentStatus === 'delivered' ? 'Entregado' : 'En Preparación') }}
              </span>
            </div>

            <p class="text-secondary font-medium">Servicio: {{ selectedOrderForDetail.shippingMethod || 'Andreani Estándar' }}</p>

            <div v-if="selectedOrderForDetail.pickupBranch" class="p-2.5 bg-surface rounded-xs border border-outline-variant/60 text-[11px] text-secondary">
              <p class="font-bold text-primary">Punto de Retiro: {{ selectedOrderForDetail.pickupBranch.name }}</p>
              <p>{{ selectedOrderForDetail.pickupBranch.address }} ({{ selectedOrderForDetail.pickupBranch.city }})</p>
            </div>

            <div v-if="selectedOrderForDetail.trackingCode" class="flex items-center justify-between pt-1">
              <div>
                <span class="text-[10px] text-secondary block">Nº de Seguimiento Andreani:</span>
                <span class="font-mono font-bold text-primary text-sm">{{ selectedOrderForDetail.trackingCode }}</span>
              </div>
              <button 
                @click="openAndreaniTracking(selectedOrderForDetail.trackingCode)" 
                type="button"
                class="text-xs text-primary underline hover:text-primary-container font-label uppercase"
              >
                Ver en Andreani →
              </button>
            </div>
            <div v-else class="flex justify-between items-center pt-1 text-[11px] text-secondary">
              <span>Aún no se ha emitido rótulo de despacho para este pedido.</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 justify-end pt-2">
          <!-- Generar Despacho Andreani Button -->
          <button 
            v-if="!selectedOrderForDetail.trackingCode"
            @click="handleGenerateShipment(selectedOrderForDetail)"
            :disabled="isGeneratingShipment"
            class="bg-primary-container hover:bg-inverse-surface text-on-primary font-label text-xs uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span class="material-symbols-outlined text-sm">local_shipping</span>
            <span>{{ isGeneratingShipment ? 'Conectando con Andreani...' : 'Generar Envío Andreani' }}</span>
          </button>

          <button 
            @click="sendWhatsAppTracking(selectedOrderForDetail)"
            class="bg-[#25D366] hover:bg-[#20ba5a] text-white font-label text-xs uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-sm">chat</span>
            <span>WhatsApp</span>
          </button>
          <button 
            @click="isOrderDetailModalOpen = false"
            class="bg-surface border border-outline font-label text-xs uppercase px-5 py-2.5 rounded-full"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: CREAR / EDITAR PERFUME (STEP BY STEP WIZARD) -->
    <!-- ==================================================== -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        
        <!-- Header -->
        <div class="flex justify-between items-center border-b border-outline-variant pb-4">
          <div>
            <h2 class="font-sans text-2xl text-primary font-normal">
              {{ isEditing ? 'Editar Perfume' : 'Crear Nuevo Perfume' }}
            </h2>
            <p class="font-sans text-xs text-secondary mt-0.5">Paso {{ currentFormStep }} de {{ steps.length }}: {{ steps[currentFormStep - 1]?.subtitle }}</p>
          </div>
          <button @click="closeModal" class="p-2 text-secondary hover:text-primary rounded-full">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Wizard Stepper Indicators -->
        <div class="grid grid-cols-5 gap-2 py-1">
          <div 
            v-for="st in steps" 
            :key="st.number"
            class="p-2 rounded-xs border text-center transition-all"
            :class="currentFormStep === st.number ? 'bg-primary-container text-on-primary border-primary-container font-bold' : (currentFormStep > st.number ? 'bg-surface-container text-primary border-outline' : 'bg-surface text-outline border-outline-variant')"
          >
            <span class="text-[10px] font-label uppercase block tracking-wider">{{ st.title }}</span>
          </div>
        </div>

        <!-- STEP 1: General Info -->
        <div v-if="currentFormStep === 1" class="space-y-4 animate-in fade-in">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Nombre de la Fragancia *</label>
              <input v-model="formData.name" type="text" placeholder="Ej. Baccarat Rouge 540" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none" />
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Marca / Casa Perfumista *</label>
              <input v-model="formData.brand" type="text" placeholder="Ej. Maison Francis Kurkdjian" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Concentración</label>
              <select v-model="formData.concentration" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans">
                <option>Eau de Parfum</option>
                <option>Extrait de Parfum</option>
                <option>Eau de Toilette</option>
                <option>Elixir</option>
                <option>Parfum</option>
              </select>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Género</label>
              <select v-model="formData.gender" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans">
                <option value="unisex">Unisex</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Categoría</label>
              <select v-model="formData.category" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans">
                <option value="disenador">Diseñador</option>
                <option value="nicho">Nicho</option>
                <option value="arabe">Árabe</option>
              </select>
            </div>
          </div>
        </div>

        <!-- STEP 2: Cost, Price & Sizes (With Profit Widget) -->
        <div v-if="currentFormStep === 2" class="space-y-4 animate-in fade-in">
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-3">
            <div class="flex justify-between items-center">
              <label class="font-label text-xs uppercase tracking-widest text-primary font-bold">Tamaño, Venta y Costo</label>
              <button @click="addSize" type="button" class="text-xs font-label uppercase text-primary underline">+ Agregar otra medida</button>
            </div>

            <div 
              v-for="(sizeObj, idx) in formData.sizes" 
              :key="idx"
              class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-surface p-3 rounded-xs border border-outline-variant"
            >
              <!-- Size input -->
              <div class="sm:col-span-3">
                <label class="block text-[10px] text-secondary mb-1">Volumen (ml)</label>
                <div class="flex items-center gap-1">
                  <input v-model.number="sizeObj.size" type="number" placeholder="100" class="w-full bg-surface-container border border-outline-variant rounded-xs p-2 text-xs font-sans text-center" />
                  <span class="text-xs text-secondary font-bold">ml</span>
                </div>
              </div>

              <!-- Sale price -->
              <div class="sm:col-span-4">
                <label class="block text-[10px] text-secondary mb-1">Precio Lista / Cuotas ($ ARS) *</label>
                <input v-model.number="sizeObj.price" type="number" placeholder="87500" class="w-full bg-surface-container border border-outline-variant rounded-xs p-2 text-xs font-sans font-bold text-primary" />
                <div class="mt-1 space-y-0.5 text-[10px]">
                  <span class="text-emerald-800 font-semibold block">
                    🏦 Transferencia (-20%): ${{ Math.round((sizeObj.price || 0) * 0.8).toLocaleString('es-AR') }}
                  </span>
                  <span class="text-secondary block">
                    💳 3 cuotas s/int: ${{ Math.round((sizeObj.price || 0) / 3).toLocaleString('es-AR') }}
                  </span>
                </div>
              </div>

              <!-- Cost price -->
              <div class="sm:col-span-4">
                <label class="block text-[10px] text-secondary mb-1">Precio Costo ($ ARS) *</label>
                <input v-model.number="sizeObj.costPrice" type="number" placeholder="82000" class="w-full bg-surface-container border border-outline-variant rounded-xs p-2 text-xs font-sans text-secondary" />
              </div>

              <!-- Remove button -->
              <div class="sm:col-span-1 text-right">
                <button v-if="formData.sizes.length > 1" @click="removeSize(idx)" type="button" class="p-1 text-secondary hover:text-error">
                  <span class="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>

            <!-- Calculadora Inversa Transferencia -> Precio Lista Cuotas -->
            <div class="p-3.5 bg-surface-container rounded-xs border border-outline-variant space-y-2 mt-2">
              <div class="flex items-center gap-1.5 text-xs text-primary font-bold">
                <span class="material-symbols-outlined text-sm text-primary">calculate</span>
                <span>Asistente de Precios: ¿Cuánto querés cobrar por Transferencia?</span>
              </div>
              <p class="text-[11px] text-secondary leading-relaxed">
                Ingresá tu precio deseado en transferencia (ej: $70.000). Se calculará automáticamente el precio de lista ($87.500) para ofrecer cuotas sin interés y que en transferencia quede en tu precio objetivo.
              </p>
              <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center pt-1">
                <div class="relative w-full sm:w-56">
                  <span class="absolute left-2.5 top-2 text-xs text-secondary font-bold">$</span>
                  <input 
                    v-model.number="targetTransferPrice" 
                    type="number" 
                    placeholder="Ej. 70000" 
                    class="w-full bg-surface border border-outline-variant rounded-xs pl-6 pr-2 py-2 text-xs font-sans text-primary font-bold focus:border-primary focus:outline-none"
                    @keyup.enter="calculateListPriceFromTransfer"
                  />
                </div>
                <button 
                  type="button" 
                  @click="calculateListPriceFromTransfer"
                  class="bg-primary-container text-on-primary font-label text-[11px] uppercase tracking-wider px-4 py-2 rounded-xs hover:bg-inverse-surface transition-colors flex-shrink-0"
                >
                  Fijar Precio de Lista ({{ targetTransferPrice ? `$${Math.round(targetTransferPrice / 0.8).toLocaleString('es-AR')}` : '...' }})
                </button>
              </div>
            </div>

            <!-- Live Profit Preview Widget -->
            <div class="bg-emerald-50 border border-emerald-300 p-4 rounded-xs flex justify-between items-center mt-3">
              <div>
                <span class="font-label text-xs uppercase font-bold text-emerald-900 block">Rentabilidad por Frasco:</span>
                <span class="text-xs text-emerald-800">Ganancia calculada automáticamente por unidad vendida.</span>
              </div>
              <div class="text-right">
                <span class="font-bold text-lg text-emerald-900 block">+${{ productUnitProfit.toLocaleString('es-AR') }}</span>
                <span class="text-[10px] font-bold bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full">
                  {{ productProfitMargin }}% Margen
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3: Gallery -->
        <div v-if="currentFormStep === 3" class="space-y-4 animate-in fade-in">
          <div class="bg-surface-container p-6 rounded-xs border-2 border-dashed border-outline-variant text-center space-y-3">
            <span class="material-symbols-outlined text-4xl text-secondary">cloud_upload</span>
            <div>
              <p class="font-sans text-sm font-medium text-primary">Cargar Fotos desde tu Computadora</p>
              <p class="text-xs text-secondary mt-1">Formato JPG, PNG o WEBP (Opcional)</p>
            </div>
            <label class="inline-block bg-surface border border-outline font-label text-xs uppercase tracking-wider px-5 py-2.5 rounded-full cursor-pointer hover:bg-surface-container transition-colors shadow-2xs">
              <span>Seleccionar Archivos</span>
              <input type="file" multiple accept="image/*" @change="handleFileUpload" class="hidden" />
            </label>
          </div>

          <!-- Uploaded images preview -->
          <div v-if="formData.images.length > 0" class="grid grid-cols-4 gap-3 pt-2">
            <div v-for="(img, idx) in formData.images" :key="idx" class="relative aspect-square rounded-xs border border-outline-variant overflow-hidden group">
              <img :src="img" class="w-full h-full object-cover" />
              <button @click="removeImage(idx)" type="button" class="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 4: Pyramid -->
        <div v-if="currentFormStep === 4" class="space-y-4 animate-in fade-in">
          <!-- Top Notes -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-2">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Salida</label>
            <div class="flex gap-2">
              <input v-model="topNoteInput" @keyup.enter="addTopNote" type="text" placeholder="Ej. Bergamota, Azafrán..." class="w-full bg-surface border border-outline-variant rounded-xs p-2 text-xs font-sans" />
              <button @click="addTopNote" type="button" class="bg-surface border border-outline font-label text-xs px-3 rounded-xs uppercase">Agregar</button>
            </div>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span v-for="(n, idx) in formData.olfactoryPyramid.topNotes" :key="idx" class="bg-surface border border-outline px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
                {{ n }}
                <span @click="removeTopNote(idx)" class="material-symbols-outlined text-xs cursor-pointer hover:text-error">close</span>
              </span>
            </div>
          </div>

          <!-- Heart Notes -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-2">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Corazón</label>
            <div class="flex gap-2">
              <input v-model="heartNoteInput" @keyup.enter="addHeartNote" type="text" placeholder="Ej. Jazmín de Grasse, Cedro..." class="w-full bg-surface border border-outline-variant rounded-xs p-2 text-xs font-sans" />
              <button @click="addHeartNote" type="button" class="bg-surface border border-outline font-label text-xs px-3 rounded-xs uppercase">Agregar</button>
            </div>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span v-for="(n, idx) in formData.olfactoryPyramid.heartNotes" :key="idx" class="bg-surface border border-outline px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
                {{ n }}
                <span @click="removeHeartNote(idx)" class="material-symbols-outlined text-xs cursor-pointer hover:text-error">close</span>
              </span>
            </div>
          </div>

          <!-- Base Notes -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-2">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Notas de Fondo</label>
            <div class="flex gap-2">
              <input v-model="baseNoteInput" @keyup.enter="addBaseNote" type="text" placeholder="Ej. Ámbar gris, Almizcle, Vainilla..." class="w-full bg-surface border border-outline-variant rounded-xs p-2 text-xs font-sans" />
              <button @click="addBaseNote" type="button" class="bg-surface border border-outline font-label text-xs px-3 rounded-xs uppercase">Agregar</button>
            </div>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span v-for="(n, idx) in formData.olfactoryPyramid.baseNotes" :key="idx" class="bg-surface border border-outline px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
                {{ n }}
                <span @click="removeBaseNote(idx)" class="material-symbols-outlined text-xs cursor-pointer hover:text-error">close</span>
              </span>
            </div>
          </div>
        </div>

        <!-- STEP 5: Specs & Description -->
        <div v-if="currentFormStep === 5" class="space-y-4 animate-in fade-in">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Duración en Piel</label>
              <select v-model="formData.characteristics.longevity" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans">
                <option v-for="opt in longevityOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>

            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Estela / Proyección</label>
              <select v-model="formData.characteristics.sillage" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans">
                <option v-for="opt in sillageOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
          </div>

          <!-- Season Multi-select -->
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-2">Estación Ideal (Multi-selección)</label>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="s in seasonOptions" 
                :key="s"
                type="button"
                @click="toggleSeason(s)"
                class="px-3.5 py-1.5 rounded-full text-xs font-sans border transition-all"
                :class="formData.characteristics.season?.includes(s) ? 'bg-primary-container text-on-primary border-primary font-bold shadow-2xs' : 'bg-surface text-secondary border-outline-variant'"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Descripción de la Fragancia</label>
            <textarea v-model="formData.description" rows="3" placeholder="Una creación opulenta y envolvente..." class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans"></textarea>
          </div>
        </div>

        <!-- Wizard Navigation Footer -->
        <div class="flex justify-between items-center border-t border-outline-variant pt-4">
          <button 
            v-if="currentFormStep > 1" 
            @click="goToPrevStep" 
            type="button" 
            class="px-5 py-2.5 text-xs font-label uppercase tracking-wider rounded-full border border-outline hover:bg-surface-container"
          >
            ← Anterior
          </button>
          <div v-else></div>

          <button 
            v-if="currentFormStep < steps.length" 
            @click="goToNextStep" 
            type="button" 
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-2.5 rounded-full hover:bg-inverse-surface transition-all shadow-md"
          >
            Siguiente →
          </button>

          <button 
            v-else 
            @click="handleSubmitProduct" 
            :disabled="isSubmitting"
            type="button" 
            class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-2.5 rounded-full hover:bg-inverse-surface transition-all shadow-md disabled:opacity-50"
          >
            <span>{{ isSubmitting ? 'Publicando...' : (isEditing ? 'Guardar Cambios' : 'Publicar Perfume') }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: CONFIRMAR ELIMINACIÓN -->
    <!-- ==================================================== -->
    <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
        <span class="material-symbols-outlined text-4xl text-error">warning</span>
        <h3 class="font-sans text-xl font-normal text-primary">¿Eliminar este perfume?</h3>
        <p class="text-xs text-secondary">Esta acción no se puede deshacer y el perfume se borrará del catálogo público.</p>
        <div class="flex gap-3 justify-center pt-2">
          <button @click="isDeleteConfirmOpen = false" class="px-5 py-2 text-xs font-label uppercase border rounded-full">Cancelar</button>
          <button @click="handleDeleteProduct" :disabled="isSubmitting" class="bg-red-600 text-white font-label text-xs uppercase px-5 py-2 rounded-full font-bold">
            {{ isSubmitting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: CREAR / EDITAR CATEGORÍA -->
    <!-- ==================================================== -->
    <div v-if="isCategoryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5">
        <div class="flex justify-between items-center border-b border-outline-variant pb-3">
          <h3 class="font-sans text-2xl text-primary font-normal">
            {{ isEditingCategory ? 'Editar Categoría' : 'Nueva Categoría' }}
          </h3>
          <button @click="isCategoryModalOpen = false" class="p-1.5 text-secondary hover:text-primary rounded-full">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form @submit.prevent="handleSaveCategory" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Título de la Categoría *</label>
              <input v-model="categoryForm.title" type="text" required placeholder="Ej. Perfumes de Mujer" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Subtítulo / Bajada</label>
              <input v-model="categoryForm.subtitle" type="text" placeholder="Ej. Para Ella / Tendencia Viral" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Descripción Breve</label>
            <textarea v-model="categoryForm.description" rows="2" placeholder="Fragancias florales, dulces y frescas..." class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none"></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Enlace / Destino</label>
              <input v-model="categoryForm.link" type="text" required placeholder="/catalogo?gender=woman" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none font-mono" />
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Texto del Botón</label>
              <input v-model="categoryForm.buttonText" type="text" placeholder="Ver Perfumes de Mujer" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Ancho en el Bento Grid</label>
              <select v-model.number="categoryForm.span" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans">
                <option :value="6">Media pantalla (6 columnas - Estándar)</option>
                <option :value="12">Ancho completo (12 columnas - Destacado grande)</option>
              </select>
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Etiqueta / Badge Opcional</label>
              <input v-model="categoryForm.badge" type="text" placeholder="Ej. Más Pedidos / Tendencia" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans" />
            </div>
          </div>

          <!-- Imagen -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-3">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Imagen de la Categoría</label>
            <div class="flex items-center gap-4">
              <div class="w-20 h-20 rounded-xs overflow-hidden border border-outline-variant bg-surface flex-shrink-0">
                <img v-if="categoryForm.image" :src="categoryForm.image" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-secondary text-xs">Sin foto</div>
              </div>
              <div class="space-y-2 flex-grow">
                <label class="inline-flex items-center gap-1.5 bg-primary-container text-on-primary font-label text-[11px] uppercase px-3.5 py-2 rounded-full cursor-pointer hover:bg-inverse-surface shadow-xs">
                  <span class="material-symbols-outlined text-sm">upload</span>
                  <span>Subir desde mi PC</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(categoryForm, 'image', $event)" />
                </label>
                <input v-model="categoryForm.image" type="text" placeholder="O pegar URL: https://..." class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="isCategoryModalOpen = false" type="button" class="px-5 py-2.5 text-xs font-label uppercase border rounded-full">Cancelar</button>
            <button :disabled="isSubmittingCategory" type="submit" class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-7 py-2.5 rounded-full hover:bg-inverse-surface shadow-md disabled:opacity-50">
              {{ isSubmittingCategory ? 'Guardando...' : (isEditingCategory ? 'Guardar Cambios' : 'Crear Categoría') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: CREAR / EDITAR FAMILIA OLFATIVA -->
    <!-- ==================================================== -->
    <div v-if="isFamilyModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5">
        <div class="flex justify-between items-center border-b border-outline-variant pb-3">
          <h3 class="font-sans text-2xl text-primary font-normal">
            {{ isEditingFamily ? 'Editar Familia Olfativa' : 'Nueva Familia Olfativa' }}
          </h3>
          <button @click="isFamilyModalOpen = false" class="p-1.5 text-secondary hover:text-primary rounded-full">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form @submit.prevent="handleSaveFamily" class="space-y-4">
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Nombre de la Familia Olfativa *</label>
            <input v-model="familyForm.name" type="text" required placeholder="Ej. Gourmand, Cuero, Aromática..." class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none" />
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Descripción de Notas Aromáticas</label>
            <textarea v-model="familyForm.description" rows="3" placeholder="Acordes seductores de vainilla negra, haba tonka y café tostado..." class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans focus:border-primary focus:outline-none"></textarea>
          </div>

          <!-- Imagen -->
          <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-3">
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Imagen Aromática</label>
            <div class="flex items-center gap-4">
              <div class="w-20 h-20 rounded-xs overflow-hidden border border-outline-variant bg-surface flex-shrink-0">
                <img v-if="familyForm.image" :src="familyForm.image" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-secondary text-xs">Sin foto</div>
              </div>
              <div class="space-y-2 flex-grow">
                <label class="inline-flex items-center gap-1.5 bg-primary-container text-on-primary font-label text-[11px] uppercase px-3.5 py-2 rounded-full cursor-pointer hover:bg-inverse-surface shadow-xs">
                  <span class="material-symbols-outlined text-sm">upload</span>
                  <span>Subir desde mi PC</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(familyForm, 'image', $event)" />
                </label>
                <input v-model="familyForm.image" type="text" placeholder="O pegar URL: https://..." class="w-full bg-surface border border-outline-variant rounded-xs p-2.5 text-xs font-sans" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="isFamilyModalOpen = false" type="button" class="px-5 py-2.5 text-xs font-label uppercase border rounded-full">Cancelar</button>
            <button :disabled="isSubmittingFamily" type="submit" class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-7 py-2.5 rounded-full hover:bg-inverse-surface shadow-md disabled:opacity-50">
              {{ isSubmittingFamily ? 'Guardando...' : (isEditingFamily ? 'Guardar Cambios' : 'Crear Familia') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: CREAR / EDITAR SLIDE DE PORTADA -->
    <!-- ==================================================== -->
    <div v-if="isSlideModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5">
        <div class="flex justify-between items-center border-b border-outline-variant pb-3">
          <h3 class="font-sans text-2xl text-primary font-normal">
            {{ isEditingSlide ? 'Editar Diapositiva de Portada' : 'Nuevo Slide de Portada' }}
          </h3>
          <button @click="isSlideModalOpen = false" class="p-1.5 text-secondary hover:text-primary rounded-full">
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form @submit.prevent="handleSaveSlide" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Etiqueta Superior (Tag)</label>
              <input v-model="slideForm.tag" type="text" placeholder="Ej. 100% Originales & Sellados" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans" />
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Rating / Badge del Frasco</label>
              <input v-model="slideForm.featuredRating" type="text" placeholder="Ej. 4.9 ★ Exclusivo" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Título Principal *</label>
              <input v-model="slideForm.title" type="text" required placeholder="Ej. Encontrá tu nueva" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans" />
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Texto en Cursiva / Resalte</label>
              <input v-model="slideForm.highlight" type="text" placeholder="Ej. fragancia favorita." class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans italic" />
            </div>
          </div>

          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Bajada / Descripción</label>
            <textarea v-model="slideForm.description" rows="2" class="w-full bg-surface-container border border-outline-variant rounded-xs p-3 text-xs font-sans"></textarea>
          </div>

          <!-- Slide Images (Background & Bottle) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Background Image -->
            <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-2">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Foto de Fondo Gran Formato</label>
              <div class="aspect-[16/9] rounded-xs overflow-hidden border border-outline-variant bg-surface mb-2">
                <img v-if="slideForm.image" :src="slideForm.image" class="w-full h-full object-cover" />
              </div>
              <label class="inline-flex items-center gap-1 bg-primary-container text-on-primary font-label text-[10px] uppercase px-3 py-1.5 rounded-full cursor-pointer hover:bg-inverse-surface">
                <span class="material-symbols-outlined text-sm">upload</span>
                <span>Subir Fondo</span>
                <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(slideForm, 'image', $event)" />
              </label>
              <input v-model="slideForm.image" type="text" placeholder="URL Fondo: https://..." class="w-full bg-surface border border-outline-variant rounded-xs p-2 text-xs font-sans" />
            </div>

            <!-- Bottle Image -->
            <div class="bg-surface-container p-4 rounded-xs border border-outline-variant space-y-2">
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">Foto Frasco Destacado</label>
              <div class="aspect-[3/4] max-h-36 rounded-xs overflow-hidden border border-outline-variant bg-surface mb-2 mx-auto">
                <img v-if="slideForm.bottleImage" :src="slideForm.bottleImage" class="w-full h-full object-cover" />
              </div>
              <label class="inline-flex items-center gap-1 bg-primary-container text-on-primary font-label text-[10px] uppercase px-3 py-1.5 rounded-full cursor-pointer hover:bg-inverse-surface">
                <span class="material-symbols-outlined text-sm">upload</span>
                <span>Subir Frasco</span>
                <input type="file" accept="image/*" class="hidden" @change="handleModalImageUpload(slideForm, 'bottleImage', $event)" />
              </label>
              <input v-model="slideForm.bottleImage" type="text" placeholder="URL Frasco: https://..." class="w-full bg-surface border border-outline-variant rounded-xs p-2 text-xs font-sans" />
            </div>
          </div>

          <!-- Buttons CTAs -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Botón Principal (Texto & Link)</label>
              <div class="grid grid-cols-2 gap-2">
                <input v-model="slideForm.primaryCtaText" type="text" placeholder="Texto Botón" class="bg-surface-container border border-outline-variant rounded-xs p-2.5 text-xs font-sans" />
                <input v-model="slideForm.primaryCtaLink" type="text" placeholder="/catalogo" class="bg-surface-container border border-outline-variant rounded-xs p-2.5 text-xs font-sans font-mono" />
              </div>
            </div>
            <div>
              <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Botón Secundario (Texto & Link)</label>
              <div class="grid grid-cols-2 gap-2">
                <input v-model="slideForm.secondaryCtaText" type="text" placeholder="Texto Secundario" class="bg-surface-container border border-outline-variant rounded-xs p-2.5 text-xs font-sans" />
                <input v-model="slideForm.secondaryCtaLink" type="text" placeholder="/quiz" class="bg-surface-container border border-outline-variant rounded-xs p-2.5 text-xs font-sans font-mono" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="isSlideModalOpen = false" type="button" class="px-5 py-2.5 text-xs font-label uppercase border rounded-full">Cancelar</button>
            <button :disabled="isSubmittingSlide" type="submit" class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-7 py-2.5 rounded-full hover:bg-inverse-surface shadow-md disabled:opacity-50">
              {{ isSubmittingSlide ? 'Guardando...' : 'Guardar Diapositiva' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: CONFIRMAR ELIMINACIÓN DE CONTENIDO / FOTOS -->
    <!-- ==================================================== -->
    <div v-if="isDeleteContentModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div class="bg-surface border border-outline-variant rounded-xs max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
        <span class="material-symbols-outlined text-4xl text-error">delete</span>
        <h3 class="font-sans text-xl font-normal text-primary">¿Eliminar "{{ contentToDelete?.title }}"?</h3>
        <p class="text-xs text-secondary">
          Este elemento dejará de mostrarse en la web inmediatamente.
        </p>
        <div class="flex gap-3 justify-center pt-2">
          <button @click="isDeleteContentModalOpen = false" class="px-5 py-2 text-xs font-label uppercase border rounded-full">Cancelar</button>
          <button @click="handleExecuteDeleteContent" class="bg-red-600 text-white font-label text-xs uppercase px-5 py-2 rounded-full font-bold">
            Eliminar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
