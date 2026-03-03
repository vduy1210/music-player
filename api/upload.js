// API Route: Upload audio file
// Usage: POST /api/upload

import { uploadAudio } from '../../lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'POST') {
    try {
      // Note: File upload needs multipart/form-data handling
      // For Vercel, consider using @vercel/blob or Supabase Storage directly from frontend
      const { file } = req.body
      const audioUrl = await uploadAudio(file)
      res.status(201).json({ success: true, url: audioUrl })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
