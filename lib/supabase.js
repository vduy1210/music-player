import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database table structure:
// Table: tracks
// - id: uuid (primary key)
// - title: text
// - artist: text
// - duration: text
// - audio_url: text
// - cover_image_url: text (optional)
// - created_at: timestamp
// - updated_at: timestamp

export const getTracks = async () => {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const addTrack = async (trackData) => {
  const { data, error } = await supabase
    .from('tracks')
    .insert([trackData])
    .select()
  
  if (error) throw error
  return data[0]
}

export const updateTrack = async (id, trackData) => {
  const { data, error } = await supabase
    .from('tracks')
    .update(trackData)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export const deleteTrack = async (id) => {
  const { error } = await supabase
    .from('tracks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  return true
}

// Upload audio file to Supabase Storage
export const uploadAudio = async (file) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `audio/${fileName}`

  const { data, error } = await supabase.storage
    .from('music-files')
    .upload(filePath, file)

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('music-files')
    .getPublicUrl(filePath)

  return publicUrl
}

// Subscribe to real-time changes
export const subscribeToTracks = (callback) => {
  const subscription = supabase
    .channel('tracks-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tracks' },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  return subscription
}

// Unsubscribe from real-time updates
export const unsubscribeFromTracks = (subscription) => {
  supabase.removeChannel(subscription)
}
