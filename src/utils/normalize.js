/**
 * Normaliza el género a claves canónicas ('woman', 'man', 'unisex')
 * Acepta variantes en español e inglés ('mujer', 'woman', 'femenino', 'hombre', 'man', 'masculino', 'unisex', etc.)
 */
export const normalizeGender = (g) => {
  if (!g) return ''
  const val = String(g).toLowerCase().trim()
  if (['woman', 'mujer', 'femenino', 'mujeres', 'female', 'f'].includes(val)) return 'woman'
  if (['man', 'hombre', 'masculino', 'hombres', 'male', 'm'].includes(val)) return 'man'
  if (['unisex', 'ambos', 'todos', 'all'].includes(val)) return 'unisex'
  return val
}

/**
 * Normaliza la categoría a claves canónicas ('arabe', 'disenador', 'nicho')
 */
export const normalizeCategory = (c) => {
  if (!c) return ''
  const val = String(c).toLowerCase().trim()
  if (['arabe', 'arabes', 'árabe', 'árabes'].includes(val)) return 'arabe'
  if (['disenador', 'diseñador', 'designer', 'diseñadores'].includes(val)) return 'disenador'
  if (['nicho', 'niche'].includes(val)) return 'nicho'
  return val
}

/**
 * Devuelve la etiqueta visual para un género
 */
export const formatGenderLabel = (g) => {
  const norm = normalizeGender(g)
  if (norm === 'woman') return 'Mujer'
  if (norm === 'man') return 'Hombre'
  if (norm === 'unisex') return 'Unisex'
  return g || ''
}

/**
 * Devuelve la etiqueta visual para una categoría
 */
export const formatCategoryLabel = (c) => {
  const norm = normalizeCategory(c)
  if (norm === 'disenador') return 'Diseñador'
  if (norm === 'arabe') return 'Perfumes Árabes'
  if (norm === 'nicho') return 'Perfumes de Nicho'
  return c || ''
}
