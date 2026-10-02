/**
 * Crea (o reinicia con --reset) las tiendas de ejemplo para mostrar la plataforma.
 *
 *   npm run seed:demo            crea las tiendas demo que falten
 *   npm run seed:demo -- --reset borra y recrea las tiendas demo
 *
 * Usá SIEMPRE una base de datos de prueba: MONGODB_URI tiene que apuntar a la base del entorno demo.
 */
import '../loadEnv.js'
import mongoose from 'mongoose'
import { connectDatabase, isMongoConnected } from '../dbConnection.js'
import { seedDemoStores, DEMO_STORES, getDemoEmail, getDemoPassword } from '../services/demoSeed.js'

const reset = process.argv.includes('--reset')

const main = async () => {
  if (process.env.DEMO_MODE !== 'true') {
    console.error('Por seguridad este script solo corre con DEMO_MODE=true (y una base de datos de prueba en MONGODB_URI).')
    process.exit(1)
  }

  await connectDatabase()
  if (!isMongoConnected()) {
    console.error('No se pudo conectar a MongoDB. Revisá MONGODB_URI.')
    process.exit(1)
  }

  const created = await seedDemoStores({ reset })
  console.log(created.length ? `\nTiendas demo ${reset ? 'reiniciadas' : 'creadas'}: ${created.join(', ')}` : '\nLas tiendas demo ya existían (usá --reset para recrearlas).')
  console.log('\nAccesos al panel (también podés entrar sin contraseña desde la landing):')
  for (const store of DEMO_STORES) {
    console.log(`  ${store.name.padEnd(22)} ${getDemoEmail(store.tenantId)}  /  ${getDemoPassword()}`)
  }
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('Error creando las tiendas demo:', err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
