/**
 * Textos legales base para tiendas que todavía no cargaron los suyos (Admin > Legales).
 * Son un punto de partida general para comercio electrónico en Argentina: cada tienda
 * debería revisarlos con su asesor legal.
 */
const sellerLine = ({ storeName, legal }) => {
  const parts = [legal.legalName || storeName]
  if (legal.cuit) parts.push(`CUIT ${legal.cuit}`)
  if (legal.address) parts.push(`con domicilio en ${legal.address}`)
  return parts.join(', ')
}

export const legalTemplates = {
  terminos: ({ storeName, legal }) => `Estos términos regulan las compras realizadas en la tienda online de ${storeName}. El vendedor es ${sellerLine({ storeName, legal })}.

Productos y precios
Todos los perfumes que comercializamos son originales. Los precios se expresan en pesos argentinos e incluyen impuestos. Las ofertas son válidas hasta agotar stock. Si un producto se quedara sin stock luego de la compra, te reintegramos el importe pagado.

Medios de pago
Aceptamos pagos con Mercado Pago (tarjetas de crédito y débito, dinero en cuenta y otros medios disponibles) y transferencia bancaria. Los pedidos por transferencia se confirman al acreditarse el pago.

Envíos
Los envíos se realizan a través de los operadores logísticos informados al momento de la compra. Los plazos de entrega son estimados y comienzan a contarse desde la acreditación del pago.

Derecho de revocación
Tenés derecho a revocar la compra dentro de los 10 (diez) días corridos contados a partir de la entrega del producto o de la celebración del contrato, lo último que ocurra, sin responsabilidad alguna (art. 34 de la Ley 24.240). Podés hacerlo desde el "Botón de arrepentimiento" de nuestro sitio. El producto debe devolverse en las mismas condiciones en que fue recibido; los gastos de devolución están a nuestro cargo.

Garantía
Los productos cuentan con la garantía legal prevista en la Ley 24.240 de Defensa del Consumidor.

Defensa del consumidor
Para reclamos podés comunicarte con nosotros por los medios de contacto del sitio. También podés acudir a la Dirección Nacional de Defensa del Consumidor y Arbitraje del Consumo: https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario`,

  privacidad: ({ storeName, legal }) => `${sellerLine({ storeName, legal })} es responsable del tratamiento de los datos personales que nos brindás al comprar o registrarte en ${storeName}.

Qué datos usamos y para qué
Usamos tu nombre, email, teléfono, DNI y dirección para procesar tus pedidos, coordinar el envío, emitir comprobantes y contactarte por tu compra. Los pagos con tarjeta los procesa Mercado Pago: no almacenamos los datos de tu tarjeta.

Con quién los compartimos
Solo con los proveedores necesarios para cumplir tu pedido (procesador de pagos, empresa de envíos y plataforma de la tienda). No vendemos tus datos.

Tus derechos
Podés solicitar el acceso, la rectificación o la supresión de tus datos escribiéndonos por los medios de contacto del sitio, de acuerdo con la Ley 25.326 de Protección de los Datos Personales.

La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.`,

  devoluciones: ({ storeName }) => `Botón de arrepentimiento
Podés arrepentirte de tu compra dentro de los 10 días corridos desde que recibiste el producto. Completá el formulario del "Botón de arrepentimiento" y te enviaremos un código de seguimiento. ${storeName} se hace cargo de los costos de devolución.

Cambios
Si tu perfume llegó dañado, con fallas o no corresponde a lo que compraste, escribinos dentro de los 10 días de recibido con fotos del producto y del embalaje y lo resolvemos sin costo.

Estado del producto
Para cambios y devoluciones el producto debe estar en las mismas condiciones en que lo recibiste, con su caja y celofán.

Reintegros
Los reintegros se realizan por el mismo medio de pago utilizado en la compra una vez recibido el producto.`
}

export const LEGAL_TITLES = {
  terminos: 'Términos y condiciones',
  privacidad: 'Política de privacidad',
  devoluciones: 'Cambios y devoluciones'
}

export const LEGAL_FIELDS = {
  terminos: 'termsText',
  privacidad: 'privacyText',
  devoluciones: 'returnsText'
}
