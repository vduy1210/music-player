// API Route: Get Supabase configuration from environment variables
// Usage: GET /api/config
// This allows the static frontend to access Supabase credentials
// stored securely in Vercel environment variables

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Environment Variables.'
      });
    }

    return res.status(200).json({
      success: true,
      supabaseUrl,
      supabaseKey
    });
  }

  res.status(405).json({ success: false, message: 'Method not allowed' });
}
