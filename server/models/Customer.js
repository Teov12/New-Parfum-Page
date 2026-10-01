import mongoose from 'mongoose'

// Cuenta de comprador de una tienda (cada tienda tiene sus propios clientes)
const customerSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  phone: { type: String, default: '' },
  dni: { type: String, default: '' },
  address: {
    address: { type: String, default: '' },
    apartment: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    postalCode: { type: String, default: '' }
  },
  emailVerified: { type: Boolean, default: false },
  // Código de 6 dígitos (hasheado) para verificar el email o recuperar la contraseña
  codeHash: { type: String, default: '' },
  codePurpose: { type: String, default: '' },
  codeExpiresAt: { type: Date },
  codeAttempts: { type: Number, default: 0 }
}, { timestamps: true })

customerSchema.index({ tenantId: 1, email: 1 }, { unique: true })

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema)
