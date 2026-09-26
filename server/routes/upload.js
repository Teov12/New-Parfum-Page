import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { requireAuth } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

let uploadStorage

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })

  uploadStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'gicca_perfumes',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'ico', 'avif'],
      resource_type: 'auto'
    }
  })
  console.log('[Uploads] Almacenamiento activo: Cloudinary Cloud CDN')
} else {
  uploadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOADS_DIR)
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname) || '.jpg'
      const uniqueName = `perfume_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`
      cb(null, uniqueName)
    }
  })
  console.log('[Uploads] Almacenamiento activo: Disco local (server/uploads)')
}

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const isImageMime = file.mimetype.startsWith('image/') || 
      file.mimetype === 'image/x-icon' || 
      file.mimetype === 'image/vnd.microsoft.icon' ||
      file.mimetype === 'image/svg+xml'
    const isImageExt = /\.(jpg|jpeg|png|webp|svg|ico|avif)$/i.test(file.originalname)

    if (isImageMime || isImageExt) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos de imagen (PNG, JPG, SVG, ICO, WEBP)'))
    }
  }
})

const router = express.Router()

router.post('/', requireAuth, (req, res) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('[Upload Error]', err)
      return res.status(400).json({ error: err.message || 'Error al procesar el archivo subido' })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subió ningún archivo' })
    }

    const urls = req.files.map(file => {
      if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
        return file.path
      }
      return `/uploads/${file.filename}`
    })
    
    res.json({
      success: true,
      url: urls[0],
      urls: urls,
      files: req.files.map((f, i) => ({ url: urls[i], filename: f.filename || f.originalname }))
    })
  })
})

export default router
