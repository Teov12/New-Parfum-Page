import dotenv from 'dotenv'

// Carga las variables de entorno. ENV_FILE permite usar otro archivo (ej. .env.test para pruebas)
// sin tocar el .env real: `npm run dev:test` arranca con node --env-file=.env.test.
dotenv.config({ path: process.env.ENV_FILE || '.env' })
