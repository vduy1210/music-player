// API Route: Upload audio file
// Usage: POST /api/upload

import { supabase } from '../lib/supabase.js'

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
      // Accept JSON body with base64, filename, contentType
      const { base64, filename, contentType } = req.body || {}
      if (!base64) {
        res.status(400).json({ success: false, error: 'Missing base64 payload' })
        return
      }

      const buffer = Buffer.from(base64, 'base64')
      const ext = (filename || 'file').split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `audio/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('music-files')
        .upload(filePath, buffer, { contentType: contentType || 'application/octet-stream' })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('music-files').getPublicUrl(filePath)
      const publicUrl = publicData?.publicUrl || null

      res.status(201).json({ success: true, url: publicUrl, publicUrl })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
