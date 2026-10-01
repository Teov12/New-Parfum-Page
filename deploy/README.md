# Puesta en marcha de la plataforma

Guía para pasar de una sola tienda (Gicca) a la plataforma multi-tienda. Todas las variables están documentadas en `.env.example`.

## 1. Antes del primer deploy

| Variable | Para qué |
| --- | --- |
| `JWT_SECRET` | Obligatoria en producción: sin ella el servidor no arranca. |
| `MONGODB_URI` | Obligatoria para tener más de una tienda. |
| `DATA_ENCRYPTION_KEY` | Cifra las credenciales de las tiendas. Generala una vez y guardala: si se pierde, hay que volver a cargar los tokens. |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Acceso a `/superadmin`. |
| `ADMIN_PASSWORD` | Acceso inicial de la tienda principal. Después definí email y contraseña propios en Admin > Ajustes & Pagos > Acceso al Panel. |

Al actualizar, **todas las sesiones del panel se cierran** (cambió el formato del token): hay que volver a ingresar.

## 2. Dominio y SSL

1. DNS: registros `A` para `tuplataforma.com` y `*.tuplataforma.com` apuntando al servidor.
2. Variables: `PLATFORM_DOMAIN=tuplataforma.com` y `PLATFORM_DNS_TARGET=<IP del servidor>`.
3. Usá `deploy/Caddyfile`: emite certificados automáticamente para la plataforma, los subdominios y los dominios propios de las tiendas (solo para dominios que existen en la base, vía `/api/platform/tls-check`).
4. Si la tienda principal tiene dominio propio, cargalo en su configuración o definí `SITE_URL`.

## 3. Mercado Pago

- **Cobro de suscripciones**: `PLATFORM_MP_ACCESS_TOKEN` (tu cuenta). En Mercado Pago Developers configurá el webhook `https://tuplataforma.com/api/billing/webhook` con los eventos de *Planes y suscripciones*. El email del pagador debe coincidir con su cuenta de Mercado Pago.
- **Conexión en un clic (OAuth)**: creá una aplicación, registrá la URL de redirección `https://tuplataforma.com/api/mercadopago/oauth/callback` y completá `MP_CLIENT_ID`, `MP_CLIENT_SECRET` y `MP_OAUTH_REDIRECT_URI`. Sin esto, cada tienda pega su Access Token manualmente.
- **Comisión por venta** (opcional): `PLAN_*_COMMISSION` en %, solo para tiendas conectadas por OAuth.

## 4. Emails

Recomendado: [Resend](https://resend.com) con un dominio verificado (`RESEND_API_KEY`, `MAIL_FROM_ADDRESS`). Los emails salen con el nombre de cada tienda y responden al email de la tienda. Alternativa: SMTP.

## 5. Facturación ARCA

Cada tienda la configura en Admin > Facturación con su CUIT, punto de venta, certificado y un access token de [Afip SDK](https://afipsdk.com). Probala primero en homologación.

## 6. Planes y precios

`PLAN_BASIC_PRICE`, `PLAN_PRO_PRICE`, `PLAN_ENTERPRISE_PRICE` (ARS/mes), límites de perfumes y días de prueba (`TRIAL_DAYS`). La tienda principal nunca paga ni tiene límites.

## 7. Checklist después del deploy

- [ ] Ingresar a `/superadmin` y ver la tienda principal listada.
- [ ] Crear una tienda de prueba desde `/crear-tienda` en el dominio de la plataforma.
- [ ] Hacer una compra de prueba con Mercado Pago en modo sandbox y verificar que el pedido pase a pagado.
- [ ] Revisar que llegue el email de confirmación y el aviso de venta.
- [ ] Cargar los datos legales y el Data Fiscal de la tienda principal (Admin > Legales).
