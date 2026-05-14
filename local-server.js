import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ytsr from '@distube/ytsr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Manually parse .env file
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
            env[parts[0].trim()] = parts[1].trim();
        }
    });
    console.log('✅ Loaded .env file');
}

// API: YouTube Search
app.get('/api/youtube-search', async (req, res) => {
    const query = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit) || 12, 30);

    if (!query.trim()) {
        return res.status(400).json({ success: false, error: 'Missing search query' });
    }

    try {
        console.log(`🔍 Searching YouTube for: "${query}"`);
        const searchResults = await ytsr(query, { limit: limit + 5 });
        const videos = searchResults.items
            .filter(item => item.type === 'video' && item.id)
            .slice(0, limit)
            .map(item => ({
                id: item.id,
                title: item.name || item.title || 'Untitled',
                thumbnail: item.thumbnail || (item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[item.thumbnails.length - 1].url : ''),
                duration: item.duration || '',
                views: item.views || '',
                author: item.author ? (item.author.name || '') : '',
                uploadedAt: item.uploadedAt || '',
                url: `https://www.youtube.com/watch?v=${item.id}`
            }));

        res.json({ success: true, videos, query });
    } catch (err) {
        console.error('YouTube search error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Config (Supabase)
app.get('/api/config', (req, res) => {
    const supabaseUrl = env.SUPABASE_URL || '';
    const supabaseKey = env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            success: false,
            error: 'Supabase credentials not found in .env'
        });
    }

    res.json({
        success: true,
        supabaseUrl,
        supabaseKey
    });
});

// Serve static files
app.use(express.static(__dirname));

// Fallback to index.html for SPA-like behavior (Express 5 safe)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
🚀 Music Player server is running!
🔗 Local URL: http://localhost:${PORT}
    `);
});
