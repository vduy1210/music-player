// API Route: Search YouTube videos
// Usage: GET /api/youtube-search?q=search+term&limit=12
// Uses @distube/ytsr - no API key required

import ytsr from '@distube/ytsr';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const query = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit) || 12, 30);

  if (!query.trim()) {
    res.status(400).json({ success: false, error: 'Missing search query parameter "q"' });
    return;
  }

  try {
    const searchResults = await ytsr(query, { limit: limit + 5 }); // fetch a few extra to filter

    const videos = searchResults.items
      .filter(item => item.type === 'video' && item.id)
      .slice(0, limit)
      .map(item => ({
        id: item.id,
        title: item.name || item.title || 'Untitled',
        thumbnail: item.thumbnail || (item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[item.thumbnails.length - 1].url : ''),
        duration: item.duration || '',
        views: item.views != null ? formatViews(item.views) : '',
        author: item.author ? (item.author.name || '') : '',
        authorAvatar: item.author && item.author.bestAvatar ? item.author.bestAvatar.url : '',
        uploadedAt: item.uploadedAt || '',
        url: `https://www.youtube.com/watch?v=${item.id}`
      }));

    res.status(200).json({ success: true, videos, query });
  } catch (err) {
    console.error('YouTube search error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

function formatViews(views) {
  if (typeof views === 'string') return views;
  if (views >= 1_000_000_000) return (views / 1_000_000_000).toFixed(1) + 'B views';
  if (views >= 1_000_000) return (views / 1_000_000).toFixed(1) + 'M views';
  if (views >= 1_000) return (views / 1_000).toFixed(1) + 'K views';
  return views + ' views';
}
