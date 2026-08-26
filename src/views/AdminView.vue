<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProductStore } from '@/stores/products'
import { useToastStore } from '@/stores/toast'
import { olfactiveFamilies } from '@/data/products'

const productStore = useProductStore()
const toastStore = useToastStore()

// Authentication State
const isAuthenticated = ref(false)
const adminPassword = ref('')
const loginError = ref('')

// Dashboard & Filter State
const searchQuery = ref('')
const filterGender = ref('all')
const filterCategory = ref('all')
const isModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const productToDelete = ref(null)
const isSubmitting = ref(false)
const isUploadingImage = ref(false)
const activeFormTab = ref('general')

// Form State for Create / Edit
const defaultForm = () => ({
  id: '',
  name: '',
  brand: '',
  concentration: 'Eau de Parfum',
  gender: 'unisex',
  category: 'disenador',
  fragranceFamily: 'Floral',
  price: 150000,
  originalPrice: 0,
  badge: '',
  isFeatured: false,
  isBestSeller: false,
  isNew: false,
  shortDescription: '',
  description: '',
  usageTips: 'Para una estela envolvente, pulverizá sobre los puntos de pulso: cuello y muñecas.',
  images: ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85'],
  sizes: [
    { size: '50 ml', price: 150000, default: true },
    { size: '100 ml', price: 215000, default: false }
  ],
  olfactoryPyramid: {
    topNotes: ['Mandarina', 'Bergamota'],
    heartNotes: ['Jazmín', 'Rosa'],
    baseNotes: ['Vainilla', 'Cedro']
  },
  characteristics: {
    longevity: '8 a 12 horas',
    sillage: 'Moderada / Alta',
    season: 'Todo el año',
    occasion: 'Uso Diario & Ocasiones Especiales'
  }
})

const formData = ref(defaultForm())
const isEditing = computed(() => !!formData.value.id)

// Input tags helpers
const topNoteInput = ref('')
const heartNoteInput = ref('')
const baseNoteInput = ref('')
const newImageUrl = ref('')

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
    toastStore.show('¡Bienvenido al Panel de Administración Gicca!', 'success')
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
    productStore.fetchStats()
  ])
}

// Filtered list for the admin table
const filteredProducts = computed(() => {
  return productStore.items.filter(p => {
    if (filterGender.value !== 'all' && p.gender !== filterGender.value) return false
    if (filterCategory.value !== 'all' && p.category !== filterCategory.value) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      return (
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.fragranceFamily?.toLowerCase().includes(q)
      )
    }
    return true
  })
})

// Modal Open Handlers
const openCreateModal = () => {
  formData.value = defaultForm()
  activeFormTab.value = 'general'
  isModalOpen.value = true
}

const openEditModal = (product) => {
  formData.value = JSON.parse(JSON.stringify(product))
  if (!formData.value.sizes || formData.value.sizes.length === 0) {
    formData.value.sizes = [{ size: '100 ml', price: formData.value.price || 0, default: true }]
  }
  if (!formData.value.images || formData.value.images.length === 0) {
    formData.value.images = ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85']
  }
  if (!formData.value.olfactoryPyramid) {
    formData.value.olfactoryPyramid = { topNotes: [], heartNotes: [], baseNotes: [] }
  }
  if (!formData.value.characteristics) {
    formData.value.characteristics = {
      longevity: '8 a 12 horas',
      sillage: 'Moderada',
      season: 'Todo el año',
      occasion: 'Uso Diario'
    }
  }
  activeFormTab.value = 'general'
  isModalOpen.value = true
}

// Tag Management
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

// Sizes Management
const addSizeRow = () => {
  formData.value.sizes.push({
    size: '100 ml',
    price: formData.value.price || 150000,
    default: formData.value.sizes.length === 0
  })
}
const removeSizeRow = (idx) => {
  formData.value.sizes.splice(idx, 1)
  if (formData.value.sizes.length > 0 && !formData.value.sizes.some(s => s.default)) {
    formData.value.sizes[0].default = true
  }
}
const setDefaultSize = (index) => {
  formData.value.sizes.forEach((s, idx) => {
    s.default = idx === index
  })
  formData.value.price = formData.value.sizes[index].price
}

// Images Management
const addImageUrl = () => {
  if (newImageUrl.value.trim()) {
    formData.value.images.push(newImageUrl.value.trim())
    newImageUrl.value = ''
  }
}
const removeImage = (idx) => formData.value.images.splice(idx, 1)

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isUploadingImage.value = true
  const res = await productStore.uploadImage(file)
  isUploadingImage.value = false

  if (res.success) {
    formData.value.images.push(res.url)
    toastStore.show('¡Imagen subida con éxito!', 'success')
  } else {
    toastStore.show(res.error || 'Error al subir la imagen', 'error')
  }
}

// Submit Product Form
const handleSubmitProduct = async () => {
  if (!formData.value.name.trim() || !formData.value.brand.trim()) {
    toastStore.show('Por favor completá el nombre y la marca del perfume.', 'error')
    return
  }

  // Ensure default size price matches main price
  const defSize = formData.value.sizes.find(s => s.default) || formData.value.sizes[0]
  if (defSize) {
    formData.value.price = defSize.price
  }

  isSubmitting.value = true
  let res
  if (isEditing.value) {
    res = await productStore.updateProduct(formData.value.id, formData.value)
  } else {
    res = await productStore.addProduct(formData.value)
  }
  isSubmitting.value = false

  if (res.success) {
    toastStore.show(
      isEditing.value ? `Perfume "${formData.value.name}" actualizado con éxito` : `Perfume "${formData.value.name}" agregado al catálogo`,
      'success'
    )
    isModalOpen.value = false
  } else {
    toastStore.show(res.error || 'Error al guardar el perfume', 'error')
  }
}

// Delete Confirmation
const confirmDelete = (product) => {
  productToDelete.value = product
  isDeleteConfirmOpen.value = true
}

const executeDelete = async () => {
  if (!productToDelete.value) return
  const res = await productStore.deleteProduct(productToDelete.value.id)
  isDeleteConfirmOpen.value = false
  if (res.success) {
    toastStore.show(`"${productToDelete.value.name}" eliminado del catálogo.`, 'info')
    productToDelete.value = null
  } else {
    toastStore.show(res.error || 'Error al eliminar', 'error')
  }
}

// Seed Demo Collection helper
const seedSamples = async () => {
  const samples = [
    {
      brand: 'Yves Saint Laurent',
      name: 'Libre Eau de Parfum',
      concentration: 'Eau de Parfum',
      gender: 'woman',
      category: 'disenador',
      fragranceFamily: 'Floral',
      price: 150000,
      originalPrice: 175000,
      badge: 'Best Seller',
      isFeatured: true,
      isBestSeller: true,
      shortDescription: 'La fragancia de la libertad. Fusión floral audaz de lavanda francesa y flor de azahar marroquí.',
      description: 'Una reinvención del perfume floral donde la lavanda francesa se funde con el azahar de Marruecos y extracto de vainilla de Madagascar.',
      images: [
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85'
      ],
      sizes: [
        { size: '30 ml', price: 98000, default: false },
        { size: '50 ml', price: 150000, default: true },
        { size: '90 ml', price: 215000, default: false }
      ],
      olfactoryPyramid: {
        topNotes: ['Lavanda Francesa', 'Mandarina Italiana', 'Grosella'],
        heartNotes: ['Azahar de Marruecos', 'Jazmín Sambac'],
        baseNotes: ['Vainilla de Madagascar', 'Madera de Cedro', 'Ámbar Gris']
      },
      characteristics: {
        longevity: '8 a 12 horas',
        sillage: 'Moderada / Alta',
        season: 'Todo el año / Noche',
        occasion: 'Elegancia y Uso Diario Sofisticado'
      },
      usageTips: 'Pulverizá sobre los puntos de pulso sin frotar.'
    },
    {
      brand: 'Dior',
      name: 'Sauvage Parfum',
      concentration: 'Parfum',
      gender: 'man',
      category: 'disenador',
      fragranceFamily: 'Amaderada',
      price: 185000,
      originalPrice: 205000,
      badge: 'Favorito',
      isFeatured: true,
      isBestSeller: true,
      shortDescription: 'Interpretación concentrada con mandarina ahumada y sándalo puro de Sri Lanka.',
      description: 'Frescura extrema teñida de cálidos tonos ambarinos y maderas nobles que cobran vida en la piel.',
      images: [
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85'
      ],
      sizes: [
        { size: '60 ml', price: 145000, default: false },
        { size: '100 ml', price: 185000, default: true },
        { size: '200 ml', price: 285000, default: false }
      ],
      olfactoryPyramid: {
        topNotes: ['Bergamota de Calabria', 'Mandarina Especiada'],
        heartNotes: ['Sándalo de Sri Lanka', 'Cedro de Virginia'],
        baseNotes: ['Haba Tonka', 'Incienso Olibanum', 'Vainilla']
      },
      characteristics: {
        longevity: '12+ horas',
        sillage: 'Poderosa',
        season: 'Otoño / Invierno / Noche',
        occasion: 'Noche, Citas y Eventos de Gala'
      },
      usageTips: 'Aplicar directamente en el cuello y pecho.'
    },
    {
      brand: 'Lattafa',
      name: 'Khamrah Eau de Parfum',
      concentration: 'Eau de Parfum',
      gender: 'unisex',
      category: 'arabes',
      fragranceFamily: 'Oriental',
      price: 95000,
      originalPrice: 110000,
      badge: 'Lujo de Dubai',
      isFeatured: true,
      isBestSeller: true,
      shortDescription: 'Opulencia oriental con canela, dátiles dulces, praliné y madera de agar oud.',
      description: 'Una fragancia dulce, cálida y licorosa de altísima proyección importada directamente de los Emiratos Árabes.',
      images: [
        'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1000&q=85'
      ],
      sizes: [
        { size: '100 ml', price: 95000, default: true }
      ],
      olfactoryPyramid: {
        topNotes: ['Canela', 'Nuez Moscada', 'Bergamota'],
        heartNotes: ['Dátiles', 'Praliné', 'Tuberosa'],
        baseNotes: ['Vainilla', 'Haba Tonka', 'Madera de Agar', 'Mirra']
      },
      characteristics: {
        longevity: '14+ horas',
        sillage: 'Pesada e Imponente',
        season: 'Otoño / Invierno',
        occasion: 'Noches Frías y Celebraciones Especiales'
      },
      usageTips: '2 a 3 pulverizaciones bastan para todo el día.'
    }
  ]

  for (const s of samples) {
    await productStore.addProduct(s)
  }
  toastStore.show('¡Se cargaron los 3 perfumes de ejemplo con éxito!', 'success')
}
</script>

<template>
  <div class="min-h-screen bg-surface">
    
    <!-- LOGIN SCREEN (If Not Authenticated) -->
    <div v-if="!isAuthenticated" class="min-h-[85vh] flex items-center justify-center px-4 py-16">
      <div class="bg-surface-container border border-outline-variant rounded-2xl p-8 sm:p-12 max-w-md w-full shadow-2xl space-y-6">
        <div class="text-center space-y-2">
          <div class="w-14 h-14 bg-primary-container text-on-primary rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <span class="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>
          <h1 class="font-sans text-2xl sm:text-3xl text-primary font-normal">Panel de Administración</h1>
          <p class="font-sans text-xs text-secondary">Ingresá la clave de acceso para gestionar el catálogo de Gicca Perfumes.</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1.5">
              Contraseña de Administrador
            </label>
            <div class="relative flex items-center bg-surface border border-outline-variant rounded-xl overflow-hidden focus-within:border-primary">
              <span class="material-symbols-outlined text-secondary ml-3 text-xl">lock</span>
              <input 
                v-model="adminPassword"
                type="password"
                required
                placeholder="Contraseña..."
                class="w-full bg-transparent px-3 py-3 font-sans text-sm text-primary focus:outline-none"
              />
            </div>
            <p class="text-[11px] text-secondary mt-1">Clave por defecto: <code class="text-primary font-bold">admin123</code></p>
          </div>

          <div v-if="loginError" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-sans">
            {{ loginError }}
          </div>

          <button 
            type="submit"
            class="w-full bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest py-3.5 rounded-xl hover:bg-inverse-surface transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Ingresar al Panel</span>
            <span class="material-symbols-outlined text-sm">login</span>
          </button>
        </form>

        <div class="pt-4 border-t border-outline-variant text-center">
          <RouterLink to="/" class="text-xs font-label text-secondary hover:text-primary uppercase tracking-wider underline">
            ← Volver a la Tienda
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- AUTHENTICATED ADMIN DASHBOARD -->
    <div v-else class="py-8">
      <div class="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop space-y-8">
        
        <!-- Admin Top Bar -->
        <div class="bg-surface-container border border-outline-variant rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-label text-[10px] uppercase tracking-widest text-primary font-bold bg-primary-container text-on-primary px-3 py-0.5 rounded-full">
                Modo Administrador
              </span>
              <span class="text-xs text-secondary">Sesión Activa</span>
            </div>
            <h1 class="font-sans text-3xl text-primary font-normal">Gestión de Catálogo</h1>
          </div>

          <div class="flex flex-wrap gap-3">
            <button 
              @click="openCreateModal"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-inverse-surface transition-all flex items-center gap-2 shadow-md"
            >
              <span class="material-symbols-outlined text-base">add</span>
              <span>Nueva Fragancia</span>
            </button>

            <button 
              v-if="productStore.items.length === 0"
              @click="seedSamples"
              class="bg-surface text-primary border border-outline font-label text-xs uppercase tracking-widest px-5 py-3 rounded-full hover:bg-surface-container transition-all flex items-center gap-1.5 shadow-2xs"
              title="Cargar 3 perfumes de prueba con datos completos"
            >
              <span class="material-symbols-outlined text-base">dataset</span>
              <span>Cargar Ejemplos</span>
            </button>

            <button 
              @click="handleLogout"
              class="bg-surface text-rose-700 border border-rose-200 font-label text-xs uppercase tracking-widest px-4 py-3 rounded-full hover:bg-rose-50 transition-all flex items-center gap-1 shadow-2xs"
            >
              <span class="material-symbols-outlined text-base">logout</span>
              <span>Salir</span>
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-surface-container border border-outline-variant rounded-2xl p-5 shadow-xs">
            <p class="font-label text-[11px] uppercase tracking-wider text-secondary">Total Fragancias</p>
            <p class="font-sans text-3xl font-bold text-primary mt-1">{{ productStore.items.length }}</p>
          </div>
          <div class="bg-surface-container border border-outline-variant rounded-2xl p-5 shadow-xs">
            <p class="font-label text-[11px] uppercase tracking-wider text-secondary">Marcas Registradas</p>
            <p class="font-sans text-3xl font-bold text-primary mt-1">{{ productStore.brandsList.length }}</p>
          </div>
          <div class="bg-surface-container border border-outline-variant rounded-2xl p-5 shadow-xs">
            <p class="font-label text-[11px] uppercase tracking-wider text-secondary">Destacados en Home</p>
            <p class="font-sans text-3xl font-bold text-primary mt-1">{{ productStore.stats.featuredCount || productStore.items.filter(p => p.isFeatured).length }}</p>
          </div>
          <div class="bg-surface-container border border-outline-variant rounded-2xl p-5 shadow-xs">
            <p class="font-label text-[11px] uppercase tracking-wider text-secondary">Precio Promedio</p>
            <p class="font-sans text-3xl font-bold text-primary mt-1">
              ${{ (productStore.stats.averagePrice || 0).toLocaleString('es-AR') }}
            </p>
          </div>
        </div>

        <!-- Search & Quick Filters Bar -->
        <div class="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-2xs">
          <div class="relative w-full md:max-w-md">
            <span class="material-symbols-outlined absolute left-3.5 top-2.5 text-secondary text-xl">search</span>
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre, marca o familia..."
              class="w-full bg-surface border border-outline-variant rounded-full pl-10 pr-4 py-2 text-xs font-sans text-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div class="flex flex-wrap gap-2 w-full md:w-auto">
            <select 
              v-model="filterGender"
              class="bg-surface border border-outline-variant rounded-full px-4 py-2 text-xs font-sans text-primary focus:outline-none"
            >
              <option value="all">Todos los Géneros</option>
              <option value="woman">Mujer</option>
              <option value="man">Hombre</option>
              <option value="unisex">Unisex</option>
            </select>

            <select 
              v-model="filterCategory"
              class="bg-surface border border-outline-variant rounded-full px-4 py-2 text-xs font-sans text-primary focus:outline-none"
            >
              <option value="all">Todas las Categorías</option>
              <option value="disenador">Diseñador</option>
              <option value="arabes">Perfumería Árabe</option>
            </select>
          </div>
        </div>

        <!-- Products Table -->
        <div class="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden shadow-xs">
          <div v-if="filteredProducts.length > 0" class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-outline-variant bg-surface-container-high text-xs font-label uppercase tracking-wider text-secondary">
                  <th class="py-4 px-6">Fragancia</th>
                  <th class="py-4 px-6">Marca & Familia</th>
                  <th class="py-4 px-6">Género / Cat.</th>
                  <th class="py-4 px-6">Tamaños & Precios</th>
                  <th class="py-4 px-6">Badges</th>
                  <th class="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant text-sm font-sans text-primary">
                <tr 
                  v-for="p in filteredProducts" 
                  :key="p.id"
                  class="hover:bg-surface-container-low transition-colors"
                >
                  <!-- Fragrance image & name -->
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-3">
                      <img 
                        :src="p.images?.[0] || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=200&q=80'" 
                        :alt="p.name"
                        class="w-12 h-14 object-cover bg-surface rounded-lg border border-outline-variant flex-shrink-0"
                      />
                      <div>
                        <h4 class="font-bold text-primary">{{ p.name }}</h4>
                        <span class="text-xs text-secondary">{{ p.concentration }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- Brand & Family -->
                  <td class="py-4 px-6">
                    <p class="font-medium text-primary">{{ p.brand }}</p>
                    <span class="text-xs text-secondary">Familia {{ p.fragranceFamily }}</span>
                  </td>

                  <!-- Gender / Category -->
                  <td class="py-4 px-6">
                    <div class="flex flex-col gap-1 items-start">
                      <span class="font-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-outline-variant">
                        {{ p.gender === 'woman' ? 'Mujer' : p.gender === 'man' ? 'Hombre' : 'Unisex' }}
                      </span>
                      <span class="text-xs text-secondary">
                        {{ p.category === 'arabes' ? 'Perfume Árabe' : 'Diseñador' }}
                      </span>
                    </div>
                  </td>

                  <!-- Sizes & Prices -->
                  <td class="py-4 px-6">
                    <div class="flex flex-wrap gap-1.5 max-w-xs">
                      <span 
                        v-for="s in p.sizes" 
                        :key="s.size"
                        class="text-[11px] font-sans px-2.5 py-0.5 rounded-md bg-surface border border-outline-variant font-medium"
                        :class="s.default ? 'border-primary ring-1 ring-primary/40' : ''"
                      >
                        {{ s.size }}: ${{ (s.price || 0).toLocaleString('es-AR') }}
                      </span>
                    </div>
                  </td>

                  <!-- Badges -->
                  <td class="py-4 px-6">
                    <div class="flex flex-wrap gap-1">
                      <span v-if="p.badge" class="bg-primary-container text-on-primary text-[10px] font-label px-2 py-0.5 rounded-full uppercase">
                        {{ p.badge }}
                      </span>
                      <span v-if="p.isFeatured" class="bg-surface text-tertiary text-[10px] font-label px-2 py-0.5 rounded-full border border-outline-variant">
                        Destacado
                      </span>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <RouterLink 
                        :to="`/producto/${p.slug}`"
                        target="_blank"
                        class="w-9 h-9 rounded-full bg-surface border border-outline-variant hover:border-primary flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        title="Ver en la tienda"
                      >
                        <span class="material-symbols-outlined text-base">visibility</span>
                      </RouterLink>

                      <button 
                        @click="openEditModal(p)"
                        class="w-9 h-9 rounded-full bg-surface border border-outline-variant hover:border-primary flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        title="Editar perfume"
                      >
                        <span class="material-symbols-outlined text-base">edit</span>
                      </button>

                      <button 
                        @click="confirmDelete(p)"
                        class="w-9 h-9 rounded-full bg-surface border border-outline-variant hover:border-rose-500 hover:text-rose-600 flex items-center justify-center text-secondary transition-colors"
                        title="Eliminar perfume"
                      >
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty Table State -->
          <div v-else class="py-16 text-center space-y-4">
            <span class="material-symbols-outlined text-6xl text-neutral-300">inventory_2</span>
            <div>
              <h3 class="font-sans text-xl text-primary font-normal">No hay fragancias registradas</h3>
              <p class="font-sans text-xs text-secondary max-w-sm mx-auto mt-1">
                Creá tu primer perfume o cargá los ejemplos iniciales para comenzar a vender.
              </p>
            </div>
            <div class="flex justify-center gap-3 pt-2">
              <button 
                @click="openCreateModal"
                class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-inverse-surface transition-all shadow-xs"
              >
                + Crear Fragancia
              </button>
              <button 
                @click="seedSamples"
                class="bg-surface text-primary border border-outline font-label text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-surface-container transition-all shadow-2xs"
              >
                Cargar Ejemplos
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- CREATE / EDIT PRODUCT MODAL -->
    <Teleport to="body">
      <div 
        v-if="isModalOpen"
        class="fixed inset-0 z-50 bg-primary/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="isModalOpen = false"
      >
        <div class="bg-surface w-full max-w-4xl max-h-[90vh] border border-outline rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container">
            <div>
              <h3 class="font-sans text-2xl text-primary font-normal">
                {{ isEditing ? `Editar: ${formData.name}` : 'Agregar Nueva Fragancia' }}
              </h3>
              <p class="font-sans text-xs text-secondary">Completá la información técnica, precios e imágenes.</p>
            </div>
            <button @click="isModalOpen = false" class="w-8 h-8 rounded-full hover:bg-surface flex items-center justify-center text-secondary hover:text-primary">
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <!-- Form Navigation Tabs: Píldoras -->
          <div class="px-6 py-3 border-b border-outline-variant bg-surface flex gap-2 overflow-x-auto">
            <button 
              @click="activeFormTab = 'general'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="activeFormTab === 'general' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-secondary hover:text-primary'"
            >
              1. General & Marca
            </button>
            <button 
              @click="activeFormTab = 'sizes'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="activeFormTab === 'sizes' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-secondary hover:text-primary'"
            >
              2. Tamaños & Precios
            </button>
            <button 
              @click="activeFormTab = 'images'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="activeFormTab === 'images' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-secondary hover:text-primary'"
            >
              3. Fotos & Galería
            </button>
            <button 
              @click="activeFormTab = 'notes'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="activeFormTab === 'notes' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-secondary hover:text-primary'"
            >
              4. Pirámide Olfativa
            </button>
            <button 
              @click="activeFormTab = 'details'"
              class="font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
              :class="activeFormTab === 'details' ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-secondary hover:text-primary'"
            >
              5. Ficha & Ritual
            </button>
          </div>

          <!-- Form Content Body (Scrollable) -->
          <div class="p-6 md:p-8 overflow-y-auto flex-grow space-y-6">
            
            <!-- TAB 1: GENERAL & BRAND -->
            <div v-show="activeFormTab === 'general'" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Nombre del Perfume *</label>
                  <input 
                    v-model="formData.name"
                    type="text"
                    required
                    placeholder="Ej. Baccarat Rouge 540"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Casa / Marca *</label>
                  <input 
                    v-model="formData.brand"
                    type="text"
                    required
                    placeholder="Ej. Maison Francis Kurkdjian"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Concentración</label>
                  <select 
                    v-model="formData.concentration"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  >
                    <option>Parfum</option>
                    <option>Eau de Parfum</option>
                    <option>Eau de Toilette</option>
                    <option>Extrait de Parfum</option>
                    <option>Eau de Cologne</option>
                  </select>
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Género</label>
                  <select 
                    v-model="formData.gender"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  >
                    <option value="woman">Mujer</option>
                    <option value="man">Hombre</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Categoría</label>
                  <select 
                    v-model="formData.category"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  >
                    <option value="disenador">Diseñador</option>
                    <option value="arabes">Perfumería Árabe</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Familia Olfativa</label>
                  <select 
                    v-model="formData.fragranceFamily"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  >
                    <option v-for="f in olfactiveFamilies" :key="f.name" :value="f.name">{{ f.name }}</option>
                  </select>
                </div>

                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Badge / Distintivo (Opcional)</label>
                  <input 
                    v-model="formData.badge"
                    type="text"
                    placeholder="Ej. Best Seller, Nuevo, Exclusivo"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <!-- Badges Checkboxes -->
              <div class="pt-2 flex flex-wrap gap-6 bg-surface-container p-4 rounded-xl border border-outline-variant">
                <label class="flex items-center gap-2 cursor-pointer text-xs font-sans text-primary">
                  <input type="checkbox" v-model="formData.isFeatured" class="accent-primary w-4 h-4 rounded-xs" />
                  <span>Destacar en Inicio</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer text-xs font-sans text-primary">
                  <input type="checkbox" v-model="formData.isBestSeller" class="accent-primary w-4 h-4 rounded-xs" />
                  <span>Marcar como Best Seller</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer text-xs font-sans text-primary">
                  <input type="checkbox" v-model="formData.isNew" class="accent-primary w-4 h-4 rounded-xs" />
                  <span>Nuevo Lanzamiento</span>
                </label>
              </div>
            </div>

            <!-- TAB 2: SIZES & PRICING -->
            <div v-show="activeFormTab === 'sizes'" class="space-y-4">
              <div class="flex justify-between items-center mb-2">
                <div>
                  <h4 class="font-sans text-lg font-medium text-primary">Variantes de Tamaño y Precios</h4>
                  <p class="text-xs text-secondary">Configurá las presentaciones disponibles en pesos argentinos (ARS).</p>
                </div>
                <button 
                  type="button" 
                  @click="addSizeRow"
                  class="bg-surface text-primary border border-outline font-label text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:bg-surface-container"
                >
                  + Agregar Tamaño
                </button>
              </div>

              <div class="space-y-3">
                <div 
                  v-for="(s, idx) in formData.sizes" 
                  :key="idx"
                  class="flex items-center gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant"
                >
                  <div class="w-1/3">
                    <label class="block text-[10px] font-label uppercase text-secondary mb-0.5">Tamaño</label>
                    <input 
                      v-model="s.size" 
                      type="text" 
                      placeholder="Ej. 100 ml"
                      class="w-full bg-surface border border-outline-variant rounded-lg p-2 text-xs font-sans"
                    />
                  </div>
                  <div class="w-1/3">
                    <label class="block text-[10px] font-label uppercase text-secondary mb-0.5">Precio ($ ARS)</label>
                    <input 
                      v-model.number="s.price" 
                      type="number" 
                      placeholder="150000"
                      class="w-full bg-surface border border-outline-variant rounded-lg p-2 text-xs font-sans font-bold"
                    />
                  </div>
                  <div class="w-1/4 flex items-center gap-2 pt-4">
                    <button 
                      type="button"
                      @click="setDefaultSize(idx)"
                      class="px-3 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider border transition-colors"
                      :class="s.default ? 'bg-primary-container text-on-primary border-primary-container' : 'bg-surface text-secondary border-outline-variant'"
                    >
                      {{ s.default ? 'Por Defecto' : 'Fijar' }}
                    </button>
                  </div>
                  <div class="pt-4">
                    <button 
                      type="button" 
                      @click="removeSizeRow(idx)"
                      class="w-8 h-8 rounded-full hover:bg-rose-50 text-secondary hover:text-rose-600 flex items-center justify-center"
                    >
                      <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: IMAGES GALLERY -->
            <div v-show="activeFormTab === 'images'" class="space-y-4">
              <div>
                <h4 class="font-sans text-lg font-medium text-primary">Imágenes del Producto</h4>
                <p class="text-xs text-secondary">Subí fotos desde tu computadora o pegá enlaces de imagen.</p>
              </div>

              <!-- Upload or Add URL -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-surface-container border border-dashed border-outline-variant rounded-xl text-center space-y-2">
                  <span class="material-symbols-outlined text-3xl text-secondary">cloud_upload</span>
                  <p class="text-xs font-sans text-secondary">Subir archivo de imagen desde tu equipo</p>
                  <label class="inline-block bg-primary-container text-on-primary font-label text-xs uppercase tracking-wider px-5 py-2 rounded-full cursor-pointer hover:bg-inverse-surface">
                    <span>Seleccionar Archivo</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
                  </label>
                  <p v-if="isUploadingImage" class="text-xs text-primary font-bold">Subiendo imagen...</p>
                </div>

                <div class="p-4 bg-surface-container border border-outline-variant rounded-xl space-y-2">
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">O ingresar URL de Imagen</label>
                  <div class="flex gap-2">
                    <input 
                      v-model="newImageUrl"
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      class="w-full bg-surface border border-outline-variant rounded-lg p-2 text-xs font-sans"
                      @keyup.enter="addImageUrl"
                    />
                    <button 
                      type="button"
                      @click="addImageUrl"
                      class="bg-surface text-primary border border-outline font-label text-xs px-3 rounded-lg hover:bg-surface-container flex-shrink-0"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>

              <!-- Preview Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div 
                  v-for="(img, idx) in formData.images" 
                  :key="idx"
                  class="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-container border border-outline-variant group shadow-2xs"
                >
                  <img :src="img" :alt="`Foto ${idx+1}`" class="w-full h-full object-cover" />
                  <span v-if="idx === 0" class="absolute top-2 left-2 bg-primary-container text-on-primary font-label text-[9px] uppercase px-2 py-0.5 rounded-full">
                    Principal
                  </span>
                  <button 
                    type="button"
                    @click="removeImage(idx)"
                    class="absolute top-2 right-2 w-7 h-7 bg-surface/90 hover:bg-rose-600 hover:text-white rounded-full flex items-center justify-center text-primary transition-colors shadow-sm"
                  >
                    <span class="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB 4: OLFACTORY PYRAMID -->
            <div v-show="activeFormTab === 'notes'" class="space-y-4">
              <div>
                <h4 class="font-sans text-lg font-medium text-primary">Pirámide Olfativa</h4>
                <p class="text-xs text-secondary">Escribí una nota y presioná Enter o el botón + para agregarla.</p>
              </div>

              <!-- Top Notes -->
              <div class="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">1. Notas de Salida (Top Notes)</label>
                <div class="flex gap-2">
                  <input 
                    v-model="topNoteInput"
                    type="text"
                    placeholder="Ej. Bergamota, Mandarina, Lavanda..."
                    class="w-full bg-surface border border-outline-variant rounded-lg p-2 text-xs font-sans"
                    @keyup.enter="addTopNote"
                  />
                  <button type="button" @click="addTopNote" class="bg-surface text-primary border border-outline font-label text-xs px-3 rounded-lg hover:bg-surface-container">+ Agregar</button>
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                  <span 
                    v-for="(n, idx) in formData.olfactoryPyramid.topNotes" 
                    :key="idx"
                    class="bg-surface text-primary border border-outline-variant text-xs font-sans px-3 py-1 rounded-full flex items-center gap-1.5"
                  >
                    <span>{{ n }}</span>
                    <button type="button" @click="removeTopNote(idx)" class="text-secondary hover:text-rose-600">✕</button>
                  </span>
                </div>
              </div>

              <!-- Heart Notes -->
              <div class="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">2. Notas de Corazón (Heart Notes)</label>
                <div class="flex gap-2">
                  <input 
                    v-model="heartNoteInput"
                    type="text"
                    placeholder="Ej. Jazmín, Flor de Azahar, Rosa..."
                    class="w-full bg-surface border border-outline-variant rounded-lg p-2 text-xs font-sans"
                    @keyup.enter="addHeartNote"
                  />
                  <button type="button" @click="addHeartNote" class="bg-surface text-primary border border-outline font-label text-xs px-3 rounded-lg hover:bg-surface-container">+ Agregar</button>
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                  <span 
                    v-for="(n, idx) in formData.olfactoryPyramid.heartNotes" 
                    :key="idx"
                    class="bg-surface text-primary border border-outline-variant text-xs font-sans px-3 py-1 rounded-full flex items-center gap-1.5"
                  >
                    <span>{{ n }}</span>
                    <button type="button" @click="removeHeartNote(idx)" class="text-secondary hover:text-rose-600">✕</button>
                  </span>
                </div>
              </div>

              <!-- Base Notes -->
              <div class="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-2">
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold">3. Notas de Fondo (Base Notes)</label>
                <div class="flex gap-2">
                  <input 
                    v-model="baseNoteInput"
                    type="text"
                    placeholder="Ej. Vainilla, Cedro, Ámbar, Almizcle..."
                    class="w-full bg-surface border border-outline-variant rounded-lg p-2 text-xs font-sans"
                    @keyup.enter="addBaseNote"
                  />
                  <button type="button" @click="addBaseNote" class="bg-surface text-primary border border-outline font-label text-xs px-3 rounded-lg hover:bg-surface-container">+ Agregar</button>
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                  <span 
                    v-for="(n, idx) in formData.olfactoryPyramid.baseNotes" 
                    :key="idx"
                    class="bg-surface text-primary border border-outline-variant text-xs font-sans px-3 py-1 rounded-full flex items-center gap-1.5"
                  >
                    <span>{{ n }}</span>
                    <button type="button" @click="removeBaseNote(idx)" class="text-secondary hover:text-rose-600">✕</button>
                  </span>
                </div>
              </div>
            </div>

            <!-- TAB 5: TECHNICAL SPECS & DESCRIPTIONS -->
            <div v-show="activeFormTab === 'details'" class="space-y-4">
              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Resumen Corto (Para tarjetas)</label>
                <input 
                  v-model="formData.shortDescription"
                  type="text"
                  placeholder="Una síntesis de 1 o 2 oraciones que define la fragancia..."
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Historia / Descripción Completa</label>
                <textarea 
                  v-model="formData.description"
                  rows="4"
                  placeholder="Descripción editorial sobre la concepción, acordes y carácter de la fragancia..."
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans focus:border-primary focus:outline-none"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Duración en Piel</label>
                  <input 
                    v-model="formData.characteristics.longevity"
                    type="text"
                    placeholder="Ej. 8 a 12 horas"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Estela / Proyección</label>
                  <input 
                    v-model="formData.characteristics.sillage"
                    type="text"
                    placeholder="Ej. Moderada / Alta"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Estación Ideal</label>
                  <input 
                    v-model="formData.characteristics.season"
                    type="text"
                    placeholder="Ej. Otoño / Invierno"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans"
                  />
                </div>
                <div>
                  <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Ocasión Sugerida</label>
                  <input 
                    v-model="formData.characteristics.occasion"
                    type="text"
                    placeholder="Ej. Noche, Eventos y Gala"
                    class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans"
                  />
                </div>
              </div>

              <div>
                <label class="block font-label text-xs uppercase tracking-widest text-primary font-bold mb-1">Ritual de Aplicación</label>
                <input 
                  v-model="formData.usageTips"
                  type="text"
                  placeholder="Instrucciones recomendadas de uso..."
                  class="w-full bg-surface-container border border-outline-variant rounded-xl p-3 text-sm font-sans"
                />
              </div>
            </div>

          </div>

          <!-- Modal Footer Actions -->
          <div class="px-6 py-4 border-t border-outline-variant bg-surface-container flex justify-between items-center">
            <button 
              type="button" 
              @click="isModalOpen = false"
              class="font-label text-xs uppercase tracking-widest px-6 py-3 rounded-full border border-outline text-secondary hover:text-primary"
            >
              Cancelar
            </button>

            <button 
              type="button" 
              @click="handleSubmitProduct"
              :disabled="isSubmitting"
              class="bg-primary-container text-on-primary font-label text-xs uppercase tracking-widest px-8 py-3 rounded-full hover:bg-inverse-surface transition-all shadow-md flex items-center gap-2"
            >
              <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-sm">sync</span>
              <span>{{ isEditing ? 'Guardar Cambios' : 'Publicar Perfume' }}</span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- DELETE CONFIRMATION MODAL -->
    <Teleport to="body">
      <div 
        v-if="isDeleteConfirmOpen"
        class="fixed inset-0 z-50 bg-primary/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="isDeleteConfirmOpen = false"
      >
        <div class="bg-surface w-full max-w-md border border-outline rounded-2xl p-6 shadow-2xl space-y-4">
          <div class="flex items-center gap-3 text-rose-600">
            <span class="material-symbols-outlined text-3xl">warning</span>
            <h3 class="font-sans text-xl font-bold text-primary">¿Eliminar Fragancia?</h3>
          </div>
          <p class="font-sans text-sm text-secondary leading-relaxed">
            ¿Estás seguro de que deseás eliminar permanentemente <strong>"{{ productToDelete?.name }}"</strong>? Esta acción no se puede deshacer.
          </p>
          <div class="flex justify-end gap-3 pt-2">
            <button 
              @click="isDeleteConfirmOpen = false"
              class="font-label text-xs uppercase tracking-widest px-5 py-2.5 rounded-full border border-outline text-secondary"
            >
              Cancelar
            </button>
            <button 
              @click="executeDelete"
              class="bg-rose-600 hover:bg-rose-700 text-white font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-full shadow-sm"
            >
              Sí, Eliminar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
