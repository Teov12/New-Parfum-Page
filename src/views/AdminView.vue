<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'
import { useProductStore } from '@/stores/products'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toast'

const productStore = useProductStore()
const ordersStore = useOrdersStore()
const toastStore = useToastStore()

// Navigation Tabs in Admin
const activeAdminTab = ref('ventas') // 'ventas', 'productos', 'finanzas'

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

// Check existing login session
onMounted(() => {
  const token = localStorage.getItem('gicca_admin_token')
  if (token) {
    isAuthenticated.value = true
    loadData()
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
    ordersStore.fetchStats()
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
    const res = await fetch('/api/upload', {
      method: 'POST',
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
        name: prod?.name || 'Perfume Exclusivo',
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

const sendWhatsAppTracking = (order) => {
  const text = `Hola ${order.customer?.firstName}! ✨ Te escribimos de Gicca Perfumes sobre tu orden #${order.orderNumber}.\n\nTu pedido se encuentra: *${order.fulfillmentStatus === 'shipped' ? 'DESPACHADO EN ANDREANI' : (order.fulfillmentStatus === 'delivered' ? 'ENTREGADO' : 'EN PREPARACIÓN')}*.\n${order.trackingCode ? `Código de Seguimiento Andreani: *${order.trackingCode}*` : ''}\n\n¡Cualquier consulta estamos a tu disposición!`
  const url = `https://wa.me/${order.customer?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank')
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
          <p class="font-sans text-xs text-secondary">Acceso exclusivo a gestión de ventas y catálogo</p>
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
                  <option>Andreani Urgente Prioritario</option>
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
        </div>

        <div class="flex gap-2 justify-end pt-2">
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
                <label class="block text-[10px] text-secondary mb-1">Precio Venta ($ ARS) *</label>
                <input v-model.number="sizeObj.price" type="number" placeholder="185000" class="w-full bg-surface-container border border-outline-variant rounded-xs p-2 text-xs font-sans font-bold text-primary" />
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

  </div>
</template>
