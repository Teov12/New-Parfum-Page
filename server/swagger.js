export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Gicca Perfumes Boutique API',
    version: '1.0.0',
    description: 'Documentación interactiva de la API para el eCommerce y Panel Administrativo de Gicca Perfumes Boutique. Permite explorar y probar todos los endpoints disponibles.',
    contact: {
      name: 'Soporte Gicca Perfumes'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor Local de Desarrollo'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Introduce el token JWT obtenido desde `/api/auth/login` (sin la palabra Bearer).'
      }
    }
  },
  tags: [
    { name: 'Diagnóstico', description: 'Comprobación de estado y salud del servidor' },
    { name: 'Autenticación', description: 'Inicio de sesión de administradores y verificación de tokens' },
    { name: 'Productos', description: 'Gestión y consulta del catálogo de perfumes' },
    { name: 'Pedidos', description: 'Registro de compras, checkout y control de órdenes' },
    { name: 'Logística Andreani', description: 'Cotizaciones, sucursales, seguimiento en vivo y despacho' },
    { name: 'Contenido del Sitio', description: 'Banners, categorías, familias olfativas y textos' },
    { name: 'Multimedia', description: 'Subida de imágenes a Cloudinary o disco local' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Diagnóstico'],
        summary: 'Verifica el estado del backend',
        responses: {
          200: {
            description: 'Servidor operando correctamente',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  service: 'Gicca Perfumes Backend API',
                  timestamp: '2026-09-18T19:30:00.000Z'
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión de administrador',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  password: {
                    type: 'string',
                    example: 'Gicca2026!AdminBoutique'
                  }
                },
                required: ['password']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login exitoso, devuelve el token JWT',
            content: {
              'application/json': {
                example: {
                  success: true,
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: {
                    username: 'Admin Gicca',
                    role: 'superadmin'
                  }
                }
              }
            }
          },
          400: { description: 'Contraseña no provista' },
          401: { description: 'Contraseña incorrecta' }
        }
      }
    },
    '/api/auth/verify': {
      get: {
        tags: ['Autenticación'],
        summary: 'Verificar validez del token JWT',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Token válido',
            content: {
              'application/json': {
                example: {
                  valid: true,
                  user: { username: 'Admin Gicca', role: 'superadmin' }
                }
              }
            }
          },
          401: { description: 'No autorizado o token vencido/inválido' }
        }
      }
    },
    '/api/products': {
      get: {
        tags: ['Productos'],
        summary: 'Listar todos los perfumes con filtros opcionales',
        parameters: [
          { name: 'gender', in: 'query', schema: { type: 'string' }, description: 'Filtro por género (masculino, femenino, unisex)' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filtro por categoría' },
          { name: 'family', in: 'query', schema: { type: 'string' }, description: 'Filtro por familia olfativa' },
          { name: 'brand', in: 'query', schema: { type: 'string' }, description: 'Filtro por marca' },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por texto (nombre, notas, marca)' }
        ],
        responses: {
          200: { description: 'Listado de productos devuelto' }
        }
      },
      post: {
        tags: ['Productos'],
        summary: 'Crear nuevo perfume',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Sauvage Elixir' },
                  brand: { type: 'string', example: 'Dior' },
                  price: { type: 'number', example: 185000 },
                  gender: { type: 'string', example: 'Masculino' },
                  category: { type: 'string', example: 'Perfumes Diseñador' },
                  fragranceFamily: { type: 'string', example: 'Amaderada Aromática' },
                  stock: { type: 'number', example: 10 },
                  description: { type: 'string', example: 'Una fragancia concentrada e intensa...' },
                  isFeatured: { type: 'boolean', example: true },
                  isBestSeller: { type: 'boolean', example: false },
                  images: { type: 'array', items: { type: 'string' }, example: ['https://ejemplo.com/sauvage.jpg'] }
                },
                required: ['name', 'brand', 'price']
              }
            }
          }
        },
        responses: {
          201: { description: 'Perfume creado con éxito' },
          400: { description: 'Datos requeridos faltantes' },
          401: { description: 'No autorizado' }
        }
      }
    },
    '/api/products/stats': {
      get: {
        tags: ['Productos'],
        summary: 'Métricas y estadísticas del catálogo de perfumes',
        responses: {
          200: {
            description: 'Métricas de perfumes',
            content: {
              'application/json': {
                example: {
                  totalProducts: 45,
                  totalBrands: 12,
                  featuredCount: 6,
                  bestSellerCount: 8,
                  averagePrice: 125000
                }
              }
            }
          }
        }
      }
    },
    '/api/products/{idOrSlug}': {
      get: {
        tags: ['Productos'],
        summary: 'Obtener un perfume por ID o Slug',
        parameters: [
          { name: 'idOrSlug', in: 'path', required: true, schema: { type: 'string' }, description: 'ID de Mongo o slug del perfume' }
        ],
        responses: {
          200: { description: 'Perfume encontrado' },
          404: { description: 'Perfume no encontrado' }
        }
      }
    },
    '/api/products/{id}': {
      put: {
        tags: ['Productos'],
        summary: 'Actualizar un perfume existente',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID del producto' }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          200: { description: 'Perfume actualizado con éxito' },
          404: { description: 'Perfume no encontrado' }
        }
      },
      delete: {
        tags: ['Productos'],
        summary: 'Eliminar un perfume',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID del producto' }
        ],
        responses: {
          200: { description: 'Perfume eliminado' },
          404: { description: 'Perfume no encontrado' }
        }
      }
    },
    '/api/orders': {
      get: {
        tags: ['Pedidos'],
        summary: 'Listar todos los pedidos con filtros',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'paymentStatus', in: 'query', schema: { type: 'string' }, description: 'Filtro de pago (pending, paid, failed, all)' },
          { name: 'fulfillmentStatus', in: 'query', schema: { type: 'string' }, description: 'Filtro de despacho (unfulfilled, shipped, delivered, all)' },
          { name: 'source', in: 'query', schema: { type: 'string' }, description: 'Origen (web, pos, all)' },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por cliente, orden, email o tracking' }
        ],
        responses: {
          200: { description: 'Listado de pedidos' },
          401: { description: 'No autorizado' }
        }
      },
      post: {
        tags: ['Pedidos'],
        summary: 'Registrar un nuevo pedido (Checkout web o venta manual)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customer: {
                    type: 'object',
                    properties: {
                      firstName: { type: 'string', example: 'Juan' },
                      lastName: { type: 'string', example: 'Pérez' },
                      email: { type: 'string', example: 'juan.perez@gmail.com' },
                      phone: { type: 'string', example: '1198765432' },
                      address: { type: 'string', example: 'Av. Santa Fe 1234' },
                      city: { type: 'string', example: 'Buenos Aires' },
                      postalCode: { type: 'string', example: '1425' }
                    }
                  },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string', example: 'prod_1' },
                        name: { type: 'string', example: 'Sauvage Elixir' },
                        price: { type: 'number', example: 185000 },
                        quantity: { type: 'number', example: 1 }
                      }
                    }
                  },
                  total: { type: 'number', example: 185000 },
                  paymentMethod: { type: 'string', example: 'mercadopago' },
                  shippingMethod: { type: 'string', example: 'andreani_domicilio' }
                },
                required: ['items']
              }
            }
          }
        },
        responses: {
          201: { description: 'Pedido creado exitosamente' },
          400: { description: 'Datos inválidos' }
        }
      }
    },
    '/api/orders/stats': {
      get: {
        tags: ['Pedidos'],
        summary: 'Métricas financieras y comerciales de pedidos',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Métricas de ventas y pedidos' },
          401: { description: 'No autorizado' }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Obtener un pedido por ID o código de orden',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Pedido encontrado' },
          404: { description: 'Pedido no encontrado' }
        }
      },
      put: {
        tags: ['Pedidos'],
        summary: 'Actualizar pedido (estado, notas, despacho)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          200: { description: 'Pedido actualizado' },
          404: { description: 'Pedido no encontrado' }
        }
      },
      delete: {
        tags: ['Pedidos'],
        summary: 'Eliminar pedido',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Pedido eliminado' },
          404: { description: 'Pedido no encontrado' }
        }
      }
    },
    '/api/shipping/status': {
      get: {
        tags: ['Logística Andreani'],
        summary: 'Verificar conexión con API de Andreani',
        responses: {
          200: { description: 'Estado de conexión retornado' }
        }
      }
    },
    '/api/shipping/quote': {
      post: {
        tags: ['Logística Andreani'],
        summary: 'Cotizar opciones de envío por Andreani',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  postalCode: { type: 'string', example: '1425' },
                  cartTotal: { type: 'number', example: 120000 },
                  weightGrams: { type: 'number', example: 600 },
                  volumeCm3: { type: 'number', example: 1200 }
                },
                required: ['postalCode']
              }
            }
          }
        },
        responses: {
          200: { description: 'Opciones de cotización (domicilio, sucursal, urgente)' },
          400: { description: 'Código postal faltante o error de cotización' }
        }
      }
    },
    '/api/shipping/estimate': {
      get: {
        tags: ['Logística Andreani'],
        summary: 'Cotización rápida mediante parámetros URL',
        parameters: [
          { name: 'cp', in: 'query', required: true, schema: { type: 'string' }, example: '2400' },
          { name: 'total', in: 'query', schema: { type: 'number' }, example: 85000 }
        ],
        responses: {
          200: { description: 'Cotización calculada' }
        }
      }
    },
    '/api/shipping/sucursales': {
      get: {
        tags: ['Logística Andreani'],
        summary: 'Buscar sucursales de Andreani cercanas a un CP',
        parameters: [
          { name: 'cp', in: 'query', required: true, schema: { type: 'string' }, example: '1425' }
        ],
        responses: {
          200: { description: 'Listado de sucursales devuelto' }
        }
      }
    },
    '/api/shipping/tracking/{trackingCode}': {
      get: {
        tags: ['Logística Andreani'],
        summary: 'Consultar seguimiento en tiempo real de un envío',
        parameters: [
          { name: 'trackingCode', in: 'path', required: true, schema: { type: 'string' }, example: 'ANDR-984218' }
        ],
        responses: {
          200: { description: 'Historial y estado de la entrega' }
        }
      }
    },
    '/api/shipping/generate': {
      post: {
        tags: ['Logística Andreani'],
        summary: 'Generar orden de despacho y etiqueta en Andreani para una orden',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderId: { type: 'string', example: 'GIC-1001' }
                },
                required: ['orderId']
              }
            }
          }
        },
        responses: {
          200: { description: 'Despacho generado y número de tracking asignado' }
        }
      }
    },
    '/api/site-content': {
      get: {
        tags: ['Contenido del Sitio'],
        summary: 'Obtener toda la configuración de contenido del sitio',
        responses: {
          200: { description: 'Contenido retornado (hero, banners, footer, etc.)' }
        }
      },
      put: {
        tags: ['Contenido del Sitio'],
        summary: 'Actualizar la configuración de contenido del sitio',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          200: { description: 'Contenido actualizado exitosamente' }
        }
      }
    },
    '/api/site-content/categories': {
      post: {
        tags: ['Contenido del Sitio'],
        summary: 'Crear nueva categoría de productos',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Nicho Exclusivos' },
                  slug: { type: 'string', example: 'nicho-exclusivos' },
                  description: { type: 'string', example: 'Perfumería de autor y tiradas limitadas' }
                },
                required: ['name']
              }
            }
          }
        },
        responses: {
          201: { description: 'Categoría creada' }
        }
      }
    },
    '/api/site-content/categories/{id}': {
      put: {
        tags: ['Contenido del Sitio'],
        summary: 'Editar categoría',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } }
        },
        responses: { 200: { description: 'Categoría actualizada' } }
      },
      delete: {
        tags: ['Contenido del Sitio'],
        summary: 'Eliminar categoría',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Categoría eliminada' } }
      }
    },
    '/api/site-content/families': {
      post: {
        tags: ['Contenido del Sitio'],
        summary: 'Crear familia olfativa',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Oriental Especiada' },
                  description: { type: 'string', example: 'Notas cálidas con canela, clavo y ámbar' }
                },
                required: ['name']
              }
            }
          }
        },
        responses: { 201: { description: 'Familia olfativa creada' } }
      }
    },
    '/api/site-content/families/{id}': {
      put: {
        tags: ['Contenido del Sitio'],
        summary: 'Editar familia olfativa',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } }
        },
        responses: { 200: { description: 'Familia olfativa actualizada' } }
      },
      delete: {
        tags: ['Contenido del Sitio'],
        summary: 'Eliminar familia olfativa',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Familia olfativa eliminada' } }
      }
    },
    '/api/upload': {
      post: {
        tags: ['Multimedia'],
        summary: 'Subir archivos multimedia (imágenes de perfumes / banners)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: {
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'binary'
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Archivos subidos exitosamente',
            content: {
              'application/json': {
                example: {
                  success: true,
                  url: 'https://res.cloudinary.com/.../perfume.webp',
                  urls: ['https://res.cloudinary.com/.../perfume.webp']
                }
              }
            }
          }
        }
      }
    }
  }
}
