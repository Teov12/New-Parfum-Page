import { defineStore } from 'pinia'

const DEFAULT_SLIDES = [
  {
    id: 'slide_1',
    tag: '100% Originales & Sellados',
    title: 'Encontrá tu nueva',
    highlight: 'fragancia favorita.',
    description: 'Perfumes importados de diseñador y las últimas tendencias árabes. Encontrá tu fragancia favorita con envíos seguros a todo el país.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=2000&q=85',
    bottleImage: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=85',
    featuredTitle: 'YSL Libre Eau de Parfum',
    featuredSub: 'Notas de Lavanda, Azahar & Vainilla',
    featuredRating: '4.9 ★ Exclusivo',
    primaryCtaText: 'Explorar Catálogo',
    primaryCtaLink: '/catalogo',
    secondaryCtaText: 'Test de Fragancia',
    secondaryCtaLink: '/quiz',
    secondaryCtaIcon: 'auto_awesome'
  },
  {
    id: 'slide_2',
    tag: 'Tendencia Mundial',
    title: 'Perfumes Árabes &',
    highlight: 'estelas infinitas.',
    description: 'Las fragancias más virales de Dubai: notas especiadas, maderas y vainillas con fijación y duración increíble en piel.',
    image: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=2000&q=85',
    bottleImage: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=85',
    featuredTitle: 'Lattafa Khamrah & Asad',
    featuredSub: 'Canela, Praliné Dulce & Maderas Nobles',
    featuredRating: '5.0 ★ Más Vendido',
    primaryCtaText: 'Ver Perfumería Árabe',
    primaryCtaLink: '/catalogo?category=arabes',
    secondaryCtaText: 'Explorar Todo',
    secondaryCtaLink: '/catalogo'
  },
  {
    id: 'slide_3',
    tag: 'Test Rápido de Perfumes',
    title: 'Descubrí tu aroma',
    highlight: 'para todos los días.',
    description: 'Respondé 4 preguntas simples sobre tus gustos y te recomendamos las mejores fragancias según tu estilo y ocasión.',
    image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=2000&q=85',
    bottleImage: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=85',
    featuredTitle: 'Quiz Olfativo Personalizado',
    featuredSub: 'Descubrí tu fragancia firma en 60 segundos',
    featuredRating: 'Top Recomendación',
    primaryCtaText: 'Hacer el Quiz Olfativo',
    primaryCtaLink: '/quiz',
    secondaryCtaText: 'Colección Mujer',
    secondaryCtaLink: '/catalogo?gender=woman'
  }
]

const DEFAULT_CATEGORIES = [
  {
    id: 'cat_mujer',
    title: 'Perfumes de Mujer',
    subtitle: 'Para Ella',
    description: 'Fragancias florales, dulces y frescas de primeras marcas para todos los días o salidas de noche.',
    link: '/catalogo?gender=woman',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85',
    badge: 'Colección Mujer',
    buttonText: 'Ver Perfumes de Mujer',
    span: 6
  },
  {
    id: 'cat_hombre',
    title: 'Perfumes de Hombre',
    subtitle: 'Para Él',
    description: 'Maderas, cítricos y aromas con presencia y alta duración para el trabajo o el fin de semana.',
    link: '/catalogo?gender=man',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=85',
    badge: 'Colección Hombre',
    buttonText: 'Ver Perfumes de Hombre',
    span: 6
  },
  {
    id: 'cat_unisex',
    title: 'Perfumes Unisex',
    subtitle: 'Para Todos • Versátiles',
    description: 'Aromas modernos y equilibrados que combinan notas frescas y amaderadas ideales para compartir.',
    link: '/catalogo?gender=unisex',
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85',
    badge: 'Versátiles',
    buttonText: 'Ver Selección Unisex',
    span: 6
  },
  {
    id: 'cat_arabes',
    title: 'Perfumería Árabe',
    subtitle: 'Tendencia Viral',
    description: 'Las fragancias orientales de Dubái con estela infinita y frascos de diseño.',
    link: '/catalogo?category=arabes',
    image: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1200&q=85',
    badge: 'Más Pedidos',
    buttonText: 'Explorar Perfumes Árabes',
    span: 6
  }
]

const DEFAULT_FAMILIES = [
  {
    id: 'fam_floral',
    name: 'Floral',
    description: 'Bouquets refinados de rosas, jazmines y azahar con frescura primaveral.',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'fam_amaderada',
    name: 'Amaderada',
    description: 'Maderas nobles de sándalo, cedro, vetiver y resinas cálidas.',
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'fam_oriental',
    name: 'Oriental',
    description: 'Especias voluptuosas, azafrán, vainilla de Madagascar y ámbar profundo.',
    image: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'fam_citrica',
    name: 'Cítrica',
    description: 'Chispeantes acordes de bergamota de Calabria, mandarina y notas marinas.',
    image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=600&q=80'
  }
]

const DEFAULT_EDITORIAL = {
  aboutImage: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85'
}

function getAuthHeaders() {
  const token = localStorage.getItem('gicca_admin_token') || 'gicca_admin_token_secure_2026'
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export const useSiteContentStore = defineStore('siteContent', {
  state: () => ({
    heroSlides: [...DEFAULT_SLIDES],
    mainCategories: [...DEFAULT_CATEGORIES],
    olfactiveFamilies: [...DEFAULT_FAMILIES],
    editorial: { ...DEFAULT_EDITORIAL },
    loading: false,
    error: null,
    isLoaded: false
  }),

  getters: {
    activeSlides: (state) => state.heroSlides.filter(s => s.active !== false),
    activeCategories: (state) => state.mainCategories.filter(c => c.active !== false),
    familiesList: (state) => state.olfactiveFamilies
  },

  actions: {
    async fetchSiteContent() {
      this.loading = true
      this.error = null
      try {
        const res = await fetch('/api/site-content')
        if (!res.ok) throw new Error('Error al cargar contenido del sitio')
        const data = await res.json()
        if (data) {
          if (Array.isArray(data.heroSlides) && data.heroSlides.length > 0) {
            this.heroSlides = data.heroSlides
          }
          if (Array.isArray(data.mainCategories) && data.mainCategories.length > 0) {
            this.mainCategories = data.mainCategories
          }
          if (Array.isArray(data.olfactiveFamilies) && data.olfactiveFamilies.length > 0) {
            this.olfactiveFamilies = data.olfactiveFamilies
          }
          if (data.editorial) {
            this.editorial = { ...this.editorial, ...data.editorial }
          }
        }
        this.isLoaded = true
        return data
      } catch (err) {
        console.warn('Usando valores predeterminados para contenido visual:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async saveFullContent(payload) {
      this.loading = true
      try {
        const body = {
          heroSlides: payload.heroSlides || this.heroSlides,
          mainCategories: payload.mainCategories || this.mainCategories,
          olfactiveFamilies: payload.olfactiveFamilies || this.olfactiveFamilies,
          editorial: payload.editorial || this.editorial
        }
        const res = await fetch('/api/site-content', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al guardar cambios')
        if (data.data) {
          this.heroSlides = data.data.heroSlides
          this.mainCategories = data.data.mainCategories
          this.olfactiveFamilies = data.data.olfactiveFamilies
          this.editorial = data.data.editorial
        }
        return { success: true }
      } catch (err) {
        console.error(err)
        throw err
      } finally {
        this.loading = false
      }
    },

    // ==========================================
    // CATEGORÍAS PRINCIPALES
    // ==========================================
    async addCategory(catData) {
      try {
        const res = await fetch('/api/site-content/categories', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(catData)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al agregar categoría')
        if (data.category) {
          this.mainCategories.push(data.category)
        }
        return data.category
      } catch (err) {
        console.error(err)
        throw err
      }
    },

    async updateCategory(id, catData) {
      try {
        const res = await fetch(`/api/site-content/categories/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(catData)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al actualizar categoría')
        const idx = this.mainCategories.findIndex(c => c.id === id)
        if (idx !== -1 && data.category) {
          this.mainCategories[idx] = data.category
        }
        return data.category
      } catch (err) {
        console.error(err)
        throw err
      }
    },

    async deleteCategory(id) {
      try {
        const res = await fetch(`/api/site-content/categories/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al eliminar categoría')
        this.mainCategories = this.mainCategories.filter(c => c.id !== id)
        return true
      } catch (err) {
        console.error(err)
        throw err
      }
    },

    // ==========================================
    // FAMILIAS OLFATIVAS
    // ==========================================
    async addOlfactiveFamily(familyData) {
      try {
        const res = await fetch('/api/site-content/families', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(familyData)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al agregar familia olfativa')
        if (data.family) {
          this.olfactiveFamilies.push(data.family)
        }
        return data.family
      } catch (err) {
        console.error(err)
        throw err
      }
    },

    async updateOlfactiveFamily(id, familyData) {
      try {
        const res = await fetch(`/api/site-content/families/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(familyData)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al actualizar familia olfativa')
        const idx = this.olfactiveFamilies.findIndex(f => f.id === id)
        if (idx !== -1 && data.family) {
          this.olfactiveFamilies[idx] = data.family
        }
        return data.family
      } catch (err) {
        console.error(err)
        throw err
      }
    },

    async deleteOlfactiveFamily(id) {
      try {
        const res = await fetch(`/api/site-content/families/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al eliminar familia olfativa')
        this.olfactiveFamilies = this.olfactiveFamilies.filter(f => f.id !== id && f.name !== id)
        return true
      } catch (err) {
        console.error(err)
        throw err
      }
    },

    // Subir imagen (desde PC) y devolver URL accesible
    async uploadImage(file) {
      const formData = new FormData()
      formData.append('images', file)
      const token = localStorage.getItem('gicca_admin_token') || 'gicca_admin_token_secure_2026'

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir la imagen')
      return data.url || (data.urls && data.urls[0])
    }
  }
})
