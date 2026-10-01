/**
 * Presets de Paletas de Colores de Alta Gama para Perfumerías y Boutiques
 * Permite cambiar la identidad visual de la tienda en tiempo real.
 */

export const THEME_PRESETS = [
  {
    id: 'amber',
    name: 'Ámbar & Café Boutique',
    subtitle: 'Estilo Byredo / Aesop Cálido',
    description: 'Tonos terracota, café tostado y fondos manteca. Una identidad clásica y distinguida.',
    previewColors: ['#2e1911', '#784233', '#fffdfa', '#d4af37'],
    primary: '#2e1911',
    primaryRgb: '46 25 17',
    primaryContainer: '#784233',
    primaryContainerRgb: '120 66 51',
    surface: '#fffdfa',
    surfaceRgb: '255 253 250',
    surfaceContainer: '#fcf7f1',
    surfaceContainerRgb: '252 247 241',
    surfaceContainerLow: '#fefbf7',
    surfaceContainerLowRgb: '254 251 247',
    surfaceContainerHigh: '#f7eee3',
    surfaceContainerHighRgb: '247 238 227',
    accent: '#d4af37',
    accentRgb: '212 175 55'
  },
  {
    id: 'obsidian',
    name: 'Negro Obsidiana & Oro',
    subtitle: 'Estilo Le Labo / Chanel Haute Parfumerie',
    description: 'Elegancia arquitectónica con negros puros, fondos marfil pulido y acentos dorados.',
    previewColors: ['#141414', '#2b2623', '#faf9f8', '#c5a059'],
    primary: '#141414',
    primaryRgb: '20 20 20',
    primaryContainer: '#2b2623',
    primaryContainerRgb: '43 38 35',
    surface: '#faf9f8',
    surfaceRgb: '250 249 248',
    surfaceContainer: '#f4f2f0',
    surfaceContainerRgb: '244 242 240',
    surfaceContainerLow: '#fcfbfb',
    surfaceContainerLowRgb: '252 251 251',
    surfaceContainerHigh: '#ece8e5',
    surfaceContainerHighRgb: '236 232 229',
    accent: '#c5a059',
    accentRgb: '197 160 89'
  },
  {
    id: 'emerald',
    name: 'Verde Esmeralda Real',
    subtitle: 'Estilo Creed / Perfumería Árabe Imperial',
    description: 'Verde bosque profundo y majestuoso con acentos dorados y fondos frescos.',
    previewColors: ['#0c2621', '#19473e', '#fafaf7', '#d4af37'],
    primary: '#0c2621',
    primaryRgb: '12 38 33',
    primaryContainer: '#19473e',
    primaryContainerRgb: '25 71 62',
    surface: '#fafaf7',
    surfaceRgb: '250 250 247',
    surfaceContainer: '#f2f4f1',
    surfaceContainerRgb: '242 244 241',
    surfaceContainerLow: '#f8f9f7',
    surfaceContainerLowRgb: '248 249 247',
    surfaceContainerHigh: '#e5eae3',
    surfaceContainerHighRgb: '229 234 227',
    accent: '#d4af37',
    accentRgb: '212 175 55'
  },
  {
    id: 'midnight',
    name: 'Azul Medianoche & Plata',
    subtitle: 'Estilo Dior Privée / Acqua di Parma',
    description: 'Azules marinos intensos y contemporáneos. Sobrio, fresco y de impecable porte.',
    previewColors: ['#0d1b2a', '#1f354d', '#f8f9fb', '#a8b4c4'],
    primary: '#0d1b2a',
    primaryRgb: '13 27 42',
    primaryContainer: '#1f354d',
    primaryContainerRgb: '31 53 77',
    surface: '#f8f9fb',
    surfaceRgb: '248 249 251',
    surfaceContainer: '#eff2f6',
    surfaceContainerRgb: '239 242 246',
    surfaceContainerLow: '#fbfcfd',
    surfaceContainerLowRgb: '251 252 253',
    surfaceContainerHigh: '#e2e7ee',
    surfaceContainerHighRgb: '226 231 238',
    accent: '#a8b4c4',
    accentRgb: '168 180 196'
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux & Terciopelo',
    subtitle: 'Estilo Tom Ford Private Blend',
    description: 'Vino tinto oscuro, notas cálidas de licor y cuero con fondos ruborizados.',
    previewColors: ['#2b111b', '#542034', '#fcf9fa', '#c97b84'],
    primary: '#2b111b',
    primaryRgb: '43 17 27',
    primaryContainer: '#542034',
    primaryContainerRgb: '84 32 52',
    surface: '#fcf9fa',
    surfaceRgb: '252 249 250',
    surfaceContainer: '#f6eff2',
    surfaceContainerRgb: '246 239 242',
    surfaceContainerLow: '#fefbfc',
    surfaceContainerLowRgb: '254 251 252',
    surfaceContainerHigh: '#eee2e7',
    surfaceContainerHighRgb: '238 226 231',
    accent: '#c97b84',
    accentRgb: '201 123 132'
  }
]

export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return '46 25 17'
  let c = hex.replace('#', '').trim()
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('')
  }
  if (c.length !== 6) return '46 25 17'
  const num = parseInt(c, 16)
  if (isNaN(num)) return '46 25 17'
  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`
}

export function adjustBrightness(hex, percent) {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  if (c.length !== 6) return hex
  let num = parseInt(c, 16)
  let r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 255) * (1 + percent))))
  let g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 255) * (1 + percent))))
  let b = Math.min(255, Math.max(0, Math.round((num & 255) * (1 + percent))))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Aplica la paleta de colores dinámicamente en el documento HTML
 */
export function applyTheme(branding) {
  if (typeof document === 'undefined') return

  const paletteId = branding?.paletteId || 'amber'
  let preset = THEME_PRESETS.find(p => p.id === paletteId)

  // Si no hay preset o es personalizado con colores directos
  const primary = branding?.primaryColor || preset?.primary || '#2e1911'
  const primaryContainer = branding?.primaryContainer || preset?.primaryContainer || adjustBrightness(primary, 0.4)
  const surface = branding?.surface || preset?.surface || '#fffdfa'
  const surfaceContainer = branding?.surfaceContainer || preset?.surfaceContainer || '#fcf7f1'
  const surfaceContainerLow = preset?.surfaceContainerLow || '#fefbf7'
  const surfaceContainerHigh = preset?.surfaceContainerHigh || '#f7eee3'

  const root = document.documentElement

  root.style.setProperty('--color-primary-rgb', hexToRgb(primary))
  root.style.setProperty('--color-primary', primary)
  root.style.setProperty('--color-primary-container-rgb', hexToRgb(primaryContainer))
  root.style.setProperty('--color-primary-container', primaryContainer)

  root.style.setProperty('--color-surface-rgb', hexToRgb(surface))
  root.style.setProperty('--color-surface', surface)
  root.style.setProperty('--color-surface-container-rgb', hexToRgb(surfaceContainer))
  root.style.setProperty('--color-surface-container', surfaceContainer)
  root.style.setProperty('--color-surface-container-low-rgb', hexToRgb(surfaceContainerLow))
  root.style.setProperty('--color-surface-container-low', surfaceContainerLow)
  root.style.setProperty('--color-surface-container-high-rgb', hexToRgb(surfaceContainerHigh))
  root.style.setProperty('--color-surface-container-high', surfaceContainerHigh)
}
