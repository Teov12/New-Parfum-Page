# Probar la plataforma y mostrarla a perfumerías

Hay dos formas de usar el **modo demo** (`DEMO_MODE=true`):

1. **En tu compu**, para probar altas de tiendas, el panel y el checkout sin tocar producción.
2. **Online**, como sitio de demostración para mandarle el link a una perfumería o mostrarlo en una reunión.

En modo demo:

- Se crean solas 3 tiendas de ejemplo (Maison Aurora, Oud Al Sahra y Flor de Lis), cada una con su estilo, 8 perfumes, 28 ventas de los últimos 45 días, cupones, envíos propios y datos legales.
- La landing muestra esas tiendas con dos botones: **Ver tienda** (como cliente) y **Ver el panel** (como dueño, sin contraseña).
- En las tiendas de ejemplo se bloquea lo sensible: credenciales, equipo, suscripción, conectar Mercado Pago, subir archivos, dominio y facturación. Se puede cargar perfumes, cambiar el diseño, crear cupones y vender.
- Las tiendas de ejemplo se reinician solas cada `DEMO_RESET_HOURS` (por defecto 6 h).
- No se importan los datos reales de Gicca (`server/data/*.json`).
- Se muestra un aviso de "tienda de demostración" en la tienda y en el panel.

> ⚠️ Usá **siempre una base de datos propia** para el modo demo. Nunca la de producción.

---

## 1. Probar en tu compu

1. Creá una base de pruebas, por ejemplo un cluster gratis (M0) en [MongoDB Atlas](https://www.mongodb.com/atlas), y usá una base llamada `perfumerias_test`.
2. Copiá `.env.test.example` como `.env.test` y completá `MONGODB_URI`. El archivo no se sube a git.
3. Arrancá con:

   ```bash
   npm run dev:test
   ```

4. Abrí:

| Dirección | Qué ves |
| --- | --- |
| http://localhost:5173 | Landing de la plataforma con las tiendas demo |
| http://maison-aurora.localhost:5173 | Una tienda demo |
| http://localhost:5173/crear-tienda | Alta de una tienda nueva (queda en `http://<nombre>.localhost:5173`) |
| http://localhost:5173/admin/login | Panel. Con `super@prueba.com` / `superprueba123` entrás a la consola `/superadmin` |

Chrome, Edge y Firefox resuelven `*.localhost` solos: no hay que tocar nada de Windows.

Para volver a dejar las tiendas demo como nuevas: `npm run seed:demo:test`.

Los emails no se envían: aparecen en la consola del servidor como `[Mailer:Simulado]`. Ahí ves los códigos de verificación de las cuentas de cliente.

---

## 2. Demo online para mostrar a perfumerías

Es un segundo servidor (Render, Railway o un VPS) con el mismo código, pero con su propia base de datos.

### Variables mínimas

```
NODE_ENV=production
DEMO_MODE=true
DEFAULT_TENANT=plataforma
MONGODB_URI=<base SOLO para la demo>
JWT_SECRET=<clave larga>
DATA_ENCRYPTION_KEY=<64 caracteres hex>
SUPERADMIN_EMAIL=<tu email>
SUPERADMIN_PASSWORD=<clave>
PLATFORM_NAME=<nombre de tu plataforma>
```

Comandos: build `npm install && npm run build`, start `npm start`. Las tiendas demo se crean solas al arrancar.

### Con o sin subdominios

- **Sin dominio propio** (más simple, sirve en cualquier hosting): la dirección del servidor muestra la landing y las tiendas se abren con `?tenant=<id>`, por ejemplo `https://tu-demo.onrender.com/?tenant=maison-aurora`. Las tiendas creadas desde "Crear tienda" también funcionan así.
- **Con dominio** (más prolijo): DNS `demo.tuplataforma.com` y `*.demo.tuplataforma.com` apuntando al servidor, `PLATFORM_DOMAIN=demo.tuplataforma.com` y el `deploy/Caddyfile` para el SSL. Cada tienda queda en `https://<tienda>.demo.tuplataforma.com`.

### Pagos de prueba (opcional)

Con credenciales de **prueba** de Mercado Pago en `DEMO_MP_ACCESS_TOKEN` y `DEMO_MP_PUBLIC_KEY`, el checkout de las tiendas demo lleva al sandbox de Mercado Pago y se puede pagar con las [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards). Sin ellas, el checkout ofrece cerrar la compra por WhatsApp.

---

## Guion sugerido para una reunión (10 minutos)

1. **Landing** (1 min): qué es, planes en pesos y prueba gratis.
2. **Tienda como cliente** (3 min): entrar a *Oud Al Sahra*, buscar por nota olfativa, abrir un perfume (pirámide olfativa, decants), hacer el test de perfume ideal y una compra hasta el pago.
3. **Panel como dueño** (4 min), con "Ver el panel":
   - Ventas con estados de pago y envío, y exportar a CSV.
   - Finanzas: margen por venta.
   - Cargar un perfume en 1 minuto y ajustar precios en masa.
   - Cambiar la paleta de colores en Diseño.
   - Cupones y envíos propios.
4. **Su propia tienda en vivo** (2 min): en "Crear tienda" escribís el nombre de **su** perfumería. En segundos tiene su tienda con catálogo de ejemplo y entra a su panel. Le queda el link para seguir probando durante la prueba gratis.

Para limpiar las tiendas que crees en reuniones, borralas desde `/superadmin`. Las de ejemplo se reinician solas.
