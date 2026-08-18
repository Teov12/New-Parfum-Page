export const products = [
  {
    id: 'ysl-libre',
    slug: 'ysl-libre-eau-de-parfum',
    brand: 'Yves Saint Laurent',
    name: 'Libre Eau de Parfum',
    concentration: 'Eau de Parfum',
    gender: 'woman',
    fragranceFamily: 'Floral',
    price: 150000,
    originalPrice: 175000,
    discountPercentage: 14,
    rating: 4.9,
    reviewCount: 48,
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    badge: 'Best Seller',
    shortDescription: 'La fragancia de la libertad. Una fusión floral audaz entre la lavanda francesa y la flor de azahar marroquí.',
    description: 'Libre Eau de Parfum es la fragancia de la libertad, una declaración para aquellos que viven según sus propias reglas. Una reinvención del perfume floral, combina la esencia de lavanda de Francia con la sensualidad del azahar marroquí, para una fusión floral única complementada por una nota audaz de extracto de vainilla de Madagascar.',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '30 ml', price: 98000 },
      { size: '50 ml', price: 150000, default: true },
      { size: '90 ml', price: 215000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Lavanda Francesa', 'Mandarina Italiana', 'Grosella Negra', 'Petitgrain'],
      heartNotes: ['Flor de Azahar de Marruecos', 'Jazmín Sambac', 'Lavanda'],
      baseNotes: ['Vainilla de Madagascar', 'Madera de Cedro', 'Ámbar Gris', 'Almizcle Blanco']
    },
    characteristics: {
      longevity: '8 a 12 horas',
      sillage: 'Moderada / Alta',
      season: 'Todo el año / Noche',
      occasion: 'Elegancia, Eventos y Uso Diario Sofisticado'
    },
    usageTips: 'Para una estela envolvente, pulverizá sobre los puntos de pulso: cuello, muñecas y detrás del lóbulo de las orejas. Evitá frotar las muñecas para preservar la estructura pura de las notas.',
    reviews: [
      {
        id: 1,
        author: 'Valentina M.',
        rating: 5,
        date: '14 de Agosto, 2026',
        comment: 'Un perfume inolvidable. La combinación de lavanda y vainilla es exquisita y dura todo el día sin abrumar. El empaque llegó impecable.',
        verified: true
      },
      {
        id: 2,
        author: 'Sofía G.',
        rating: 5,
        date: '02 de Agosto, 2026',
        comment: '100% original. Compré el de 90ml y vino con muestras de cortesía de regalo. La presentación de Gicca es una maravilla.',
        verified: true
      }
    ]
  },
  {
    id: 'dior-sauvage',
    slug: 'dior-sauvage-parfum',
    brand: 'Dior',
    name: 'Sauvage Parfum',
    concentration: 'Parfum',
    gender: 'man',
    fragranceFamily: 'Amaderada',
    price: 185000,
    originalPrice: 205000,
    discountPercentage: 10,
    rating: 5.0,
    reviewCount: 64,
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    badge: 'Favorito',
    shortDescription: 'Una interpretación concentrada y ardiente con notas nocturnas de mandarina ahumada y sándalo de Sri Lanka.',
    description: 'Sauvage Parfum es una nueva interpretación altamente concentrada de Sauvage, en la que la frescura extrema se tiñe de cálidos tonos ambarinos y una belleza salvaje que cobra vida en la piel. François Demachy, Perfumista-Creador de Dior, se inspiró en espacios vírgenes bajo un cielo azul noche mientras los intensos aromas de un fuego crepitante se elevan en el aire.',
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '60 ml', price: 145000 },
      { size: '100 ml', price: 185000, default: true },
      { size: '200 ml', price: 285000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Bergamota de Calabria', 'Mandarina Especiada', 'Elemí'],
      heartNotes: ['Sándalo de Sri Lanka', 'Cedro de Virginia'],
      baseNotes: ['Haba Tonka', 'Incienso Olibanum', 'Vainilla Ahumada']
    },
    characteristics: {
      longevity: '12+ horas',
      sillage: 'Poderosa',
      season: 'Otoño / Invierno / Noche',
      occasion: 'Declaración personal, Noche y Eventos Exclusivos'
    },
    usageTips: 'Aplicar a 10 cm sobre la piel limpia, preferentemente en pecho y laterales del cuello.',
    reviews: [
      {
        id: 3,
        author: 'Martín R.',
        rating: 5,
        date: '28 de Julio, 2026',
        comment: 'La versión Parfum es sublime. Menos chillona que el EDT, mucho más madura, resinosa y elegante.',
        verified: true
      }
    ]
  },
  {
    id: 'baccarat-rouge-540',
    slug: 'maison-francis-kurkdjian-baccarat-rouge-540',
    brand: 'Maison Francis Kurkdjian',
    name: 'Baccarat Rouge 540 Extrait',
    concentration: 'Parfum',
    gender: 'unisex',
    fragranceFamily: 'Oriental',
    price: 320000,
    originalPrice: 350000,
    discountPercentage: 9,
    rating: 5.0,
    reviewCount: 32,
    isFeatured: true,
    isNew: true,
    isBestSeller: true,
    badge: 'Nicho Exclusivo',
    shortDescription: 'La alquimia pura de los sentidos. Azafrán luminoso, jazmín grandiflorum y notas minerales ambarinas.',
    description: 'Baccarat Rouge 540 Extrait de Parfum aumenta la fuerza y el resplandor del aura floral leñosa ambarina de la fragancia. En esta versión exaltada de un aroma característico, las flores de jazmín y los susurros amaderados participan en una alquimia de los sentidos.',
    images: [
      'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '35 ml', price: 210000 },
      { size: '70 ml', price: 320000, default: true },
      { size: '200 ml', price: 590000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Almendra Amarga de Marruecos', 'Azafrán Rojo'],
      heartNotes: ['Jazmín Grandiflorum de Egipto', 'Madera de Cedro'],
      baseNotes: ['Ámbar Gris Mineral', 'Almizcles Amaderados']
    },
    characteristics: {
      longevity: '14+ horas',
      sillage: 'Proyección Monumental',
      season: 'Todo el año',
      occasion: 'Gala, Momentos Inolvidables'
    },
    usageTips: 'Una o dos atomizaciones bastan para dejar una estela magnética inconfundible durante todo el día.',
    reviews: [
      {
        id: 4,
        author: 'Camila P.',
        rating: 5,
        date: '10 de Agosto, 2026',
        comment: 'Una obra de arte líquida. Recibo cumplidos constantemente. Gicca es la única tienda donde lo conseguí 100% garantizado en Argentina.',
        verified: true
      }
    ]
  },
  {
    id: 'coco-mademoiselle',
    slug: 'chanel-coco-mademoiselle',
    brand: 'Chanel',
    name: 'Coco Mademoiselle',
    concentration: 'Eau de Parfum',
    gender: 'woman',
    fragranceFamily: 'Floral',
    price: 165000,
    originalPrice: 165000,
    discountPercentage: 0,
    rating: 4.8,
    reviewCount: 53,
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    badge: 'Clásico Icónico',
    shortDescription: 'La esencia de una mujer libre y audaz. Un oriental femenino con un carácter fresco y chispeante.',
    description: 'Coco Mademoiselle se inspira en la personalidad inusual de Gabrielle Chanel. La fragancia es el reflejo olfativo de un espíritu independiente que rompe las reglas para escribir su propio destino. El retrato de una mujer dispuesta a reinventarse.',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '50 ml', price: 165000, default: true },
      { size: '100 ml', price: 235000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Naranja de Sicilia', 'Mandarina', 'Bergamota'],
      heartNotes: ['Rosa de Mayo', 'Jazmín de Grasse', 'Ylang-Ylang'],
      baseNotes: ['Pachulí de Indonesia', 'Vetiver', 'Vainilla Bourbon', 'Almizcle Blanco']
    },
    characteristics: {
      longevity: '8 a 10 horas',
      sillage: 'Elegante y Notoria',
      season: 'Primavera / Otoño / Todo el año',
      occasion: 'Día a Día de Lujo, Reuniones y Cenas'
    },
    usageTips: 'Pulverizar en las muñecas, cuello y escote para una presencia sutil y cautivante.',
    reviews: [
      {
        id: 5,
        author: 'Lucía B.',
        rating: 5,
        date: '05 de Agosto, 2026',
        comment: 'Mi perfume insignia desde hace años. Llegó rapidísimo en caja de regalo hermosa.',
        verified: true
      }
    ]
  },
  {
    id: 'tom-ford-black-orchid',
    slug: 'tom-ford-black-orchid',
    brand: 'Tom Ford',
    name: 'Black Orchid Parfum',
    concentration: 'Parfum',
    gender: 'unisex',
    fragranceFamily: 'Oriental',
    price: 195000,
    originalPrice: 220000,
    discountPercentage: 11,
    rating: 4.9,
    reviewCount: 29,
    isFeatured: false,
    isNew: true,
    isBestSeller: false,
    badge: 'Novedad',
    shortDescription: 'Un elixir seductor de orquídeas negras, especias ricas y notas oscuras intensificadas.',
    description: 'Black Orchid Parfum es la versión más potente de Black Orchid jamás creada. Su efecto afrodisíaco amplifica la esquiva flor con notas de ylang-ylang bañadas en ron dorado y ciruela negra aterciopelada.',
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '50 ml', price: 195000, default: true },
      { size: '100 ml', price: 275000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Trufa Negra', 'Ylang-Ylang Dorado', 'Grosella Negra', 'Bergamota'],
      heartNotes: ['Orquídea Negra Exclusiva', 'Ciruela Negra', 'Especias Orientales'],
      baseNotes: ['Pachulí Tostado', 'Madera de Ámbar', 'Vainilla Cremosa', 'Ron']
    },
    characteristics: {
      longevity: '12+ horas',
      sillage: 'Intensa y Enigmática',
      season: 'Otoño / Invierno / Noche',
      occasion: 'Eventos Nocturnos, Citas Formales'
    },
    usageTips: 'Aplicar con moderación; su concentración exige solo dos toques para una permanencia de ensueño.',
    reviews: []
  },
  {
    id: 'dior-jadore',
    slug: 'dior-jadore-eau-de-parfum',
    brand: 'Dior',
    name: "J'adore Eau de Parfum",
    concentration: 'Eau de Parfum',
    gender: 'woman',
    fragranceFamily: 'Floral',
    price: 148000,
    originalPrice: 168000,
    discountPercentage: 12,
    rating: 4.9,
    reviewCount: 41,
    isFeatured: true,
    isNew: false,
    isBestSeller: true,
    badge: 'Oferta Especial',
    shortDescription: 'Un ramo floral generoso y equilibrado. Ylang-ylang de las Comoras, rosa damascena y jazmín sambac.',
    description: 'J’adore es el gran bouquet floral femenino de Dior. Tallado al milímetro como una flor hecha a medida, combina las flores más hermosas de todo el mundo en una estela radiante, sensual y envolvente.',
    images: [
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '50 ml', price: 148000, default: true },
      { size: '100 ml', price: 210000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Esencia de Ylang-Ylang', 'Pera', 'Melón', 'Magnolia'],
      heartNotes: ['Rosa Damascena de Turquía', 'Jazmín Grandiflorum de Grasse'],
      baseNotes: ['Almizcles Blancos', 'Cedro', 'Mora']
    },
    characteristics: {
      longevity: '8 a 10 horas',
      sillage: 'Luminosa y Femenina',
      season: 'Primavera / Verano / Día',
      occasion: 'Celebraciones, Fiestas al Aire Libre'
    },
    usageTips: 'Pulverizar en círculos alrededor del cuerpo para crear una nube olfativa sedosa.',
    reviews: []
  },
  {
    id: 'byredo-gypsy-water',
    slug: 'byredo-gypsy-water-eau-de-parfum',
    brand: 'Byredo',
    name: 'Gypsy Water',
    concentration: 'Eau de Parfum',
    gender: 'unisex',
    fragranceFamily: 'Amaderada',
    price: 240000,
    originalPrice: 240000,
    discountPercentage: 0,
    rating: 4.8,
    reviewCount: 22,
    isFeatured: false,
    isNew: true,
    isBestSeller: false,
    badge: 'Nicho Estocolmo',
    shortDescription: 'Una oda a la belleza de la cultura gitana y sus costumbres. Notas de pino, incienso y ámbar fresco.',
    description: 'Gypsy Water es una glamurización del estilo de vida nómada, basada en una fascinación por el mito. El aroma del suelo fresco, los bosques profundos y las fogatas evoca el sueño de un estilo de vida libre en estrecho contacto con la naturaleza.',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '50 ml', price: 240000, default: true },
      { size: '100 ml', price: 340000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Bergamota', 'Limón', 'Pimienta', 'Bayas de Enebro'],
      heartNotes: ['Agujas de Pino', 'Incienso', 'Raíz de Lirio'],
      baseNotes: ['Ámbar', 'Vainilla', 'Sándalo']
    },
    characteristics: {
      longevity: '7 a 9 horas',
      sillage: 'Íntima y Sofisticada',
      season: 'Todo el año',
      occasion: 'Uso Diario Creativo, Momentos Íntimos'
    },
    usageTips: 'Aplicar generosamente en cuello y bufandas o prendas de lana y algodón.',
    reviews: []
  },
  {
    id: 'armani-acqua-di-gio-profondo',
    slug: 'giorgio-armani-acqua-di-gio-profondo',
    brand: 'Giorgio Armani',
    name: 'Acqua Di Giò Profondo',
    concentration: 'Eau de Parfum',
    gender: 'man',
    fragranceFamily: 'Cítrica',
    price: 142000,
    originalPrice: 160000,
    discountPercentage: 11,
    rating: 4.9,
    reviewCount: 37,
    isFeatured: true,
    isNew: false,
    isBestSeller: false,
    badge: 'Acuático Puro',
    shortDescription: 'La inmersión en las profundidades del océano. Notas marinas ultramarinas, romero y pachulí de Guatemala.',
    description: 'Acqua Di Giò Profondo es la intensa interpretación marina de Acqua Di Giò. Más que una fragancia, es una cautivadora inmersión en la profundidad del alma, abrazando los valores de libertad, sensorialidad y masculinidad moderna.',
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85'
    ],
    sizes: [
      { size: '75 ml', price: 142000, default: true },
      { size: '125 ml', price: 198000 }
    ],
    olfactoryPyramid: {
      topNotes: ['Notas Marinas', 'Mandarina Verde', 'Bergamota'],
      heartNotes: ['Romero', 'Lavanda', 'Ciprés', 'Lentisco'],
      baseNotes: ['Pachulí Mineral', 'Almizcle', 'Ámbar Mineral']
    },
    characteristics: {
      longevity: '8 a 10 horas',
      sillage: 'Fresco y Radiante',
      season: 'Primavera / Verano / Día',
      occasion: 'Deportes, Oficina, Salidas de Verano'
    },
    usageTips: 'Perfecto para aplicar justo después de una ducha revitalizante.',
    reviews: []
  }
];

export const olfactiveFamilies = [
  {
    name: 'Floral',
    description: 'Bouquets refinados de rosas, jazmines y azahar con frescura primaveral.',
    count: 38,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Amaderada',
    description: 'Maderas nobles de sándalo, cedro, vetiver y resinas cálidas.',
    count: 29,
    image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Oriental',
    description: 'Especias voluptuosas, azafrán, vainilla de Madagascar y ámbar profundo.',
    count: 24,
    image: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Cítrica',
    description: 'Chispeantes acordes de bergamota de Calabria, mandarina y notas marinas.',
    count: 18,
    image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=600&q=80'
  }
];

export const brandsList = [
  'Yves Saint Laurent',
  'Dior',
  'Chanel',
  'Maison Francis Kurkdjian',
  'Tom Ford',
  'Byredo',
  'Giorgio Armani'
];
