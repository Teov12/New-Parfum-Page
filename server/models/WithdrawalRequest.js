import mongoose from 'mongoose'

// Solicitudes del "Botón de arrepentimiento" (Res. 424/2020 de la Secretaría de Comercio Interior)
const withdrawalRequestSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  orderNumber: { type: String, default: '' },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
  notes: { type: String, default: '' }
}, { timestamps: true })

export const WithdrawalRequest = mongoose.models.WithdrawalRequest || mongoose.model('WithdrawalRequest', withdrawalRequestSchema)
