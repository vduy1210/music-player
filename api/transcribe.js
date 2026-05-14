// API Route: Transcribe audio/video using Groq Whisper (free) or OpenAI Whisper (paid)
// Usage: POST /api/transcribe  with JSON body { "url": "https://.../file.mp4" }
// Supports: { "url": "..." } or { "base64": "...", "filename": "...", "contentType": "..." }
//           or { "youtubeId": "dQw4w9WgXcQ" } for YouTube videos
// Priority: GROQ_API_KEY (free) → OPENAI_API_KEY (paid fallback)
// Groq free: https://console.groq.com  — whisper-large-v3-turbo model

import ytdl from '@distube/ytdl-core';

export const config = {
  maxDuration: 60 // allow up to 60s for YouTube download + transcription
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  const { url, base64, filename, contentType, youtubeId } = req.body || {};
  if (!url && !base64 && !youtubeId) {
    res.status(400).json({ success: false, error: 'Missing url, base64, or youtubeId in request body.' });
    return;
  }

  // Determine which provider to use: Groq (free) takes priority
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  let apiUrl, apiKey, model, provider;
  if (groqKey) {
    apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
    apiKey = groqKey;
    model = 'whisper-large-v3-turbo';
    provider = 'Groq';
  } else if (openaiKey) {
    apiUrl = 'https://api.openai.com/v1/audio/transcriptions';
    apiKey = openaiKey;
    model = 'whisper-1';
    provider = 'OpenAI';
  } else {
    res.status(500).json({ success: false, error: 'No transcription API key configured. Set GROQ_API_KEY (free) or OPENAI_API_KEY in environment.' });
    return;
  }

  try {
    let form = new FormData();
    if (youtubeId) {
      // Download audio from YouTube using ytdl-core
      console.log(`🎬 Downloading YouTube audio for: ${youtubeId}`);
      const ytUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      const info = await ytdl.getInfo(ytUrl);
      // Pick best audio-only format
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      if (!audioFormats || audioFormats.length === 0) {
        throw new Error('No audio stream found for this YouTube video');
      }
      // Pick lowest bitrate audio to stay under 25MB limit
      const format = audioFormats.sort((a, b) => (a.contentLength || Infinity) - (b.contentLength || Infinity))[0];
      
      // Download audio stream to buffer
      const chunks = [];
      const stream = ytdl(ytUrl, { format });
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);
      console.log(`📦 YouTube audio downloaded: ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB`);
      
      if (audioBuffer.length > 24 * 1024 * 1024) {
        throw new Error('YouTube audio too large (>24MB). Try a shorter video.');
      }
      
      const ext = format.container || 'webm';
      const mimeType = format.mimeType ? format.mimeType.split(';')[0] : 'audio/webm';
      const blob = new Blob([audioBuffer], { type: mimeType });
      form.append('file', blob, `youtube-audio.${ext}`);
    } else if (url) {
      // Download remote media
      const mediaResp = await fetch(url);
      if (!mediaResp.ok) throw new Error('Failed to download media: ' + mediaResp.statusText);
      const arrayBuffer = await mediaResp.arrayBuffer();
      const blob = new Blob([new Uint8Array(arrayBuffer)]);
      form.append('file', blob, 'media.mp4');
    } else {
      // base64 payload path
      const buf = Buffer.from(base64, 'base64');
      const blob = new Blob([buf], { type: contentType || 'application/octet-stream' });
      form.append('file', blob, filename || 'media.mp4');
    }
    form.append('model', model);
    // Request verbose JSON to get segments for line-by-line lyrics
    form.append('response_format', 'verbose_json');

    console.log(`🎙️ Transcribing via ${provider} (${model})...`);

    const transcribeRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: form
    });

    if (!transcribeRes.ok) {
      const text = await transcribeRes.text();
      throw new Error(`${provider} transcription failed: ${text}`);
    }

    const result = await transcribeRes.json();

    // Build formatted lyrics from segments (each segment = one line)
    let formattedLyrics = result.text || '';
    const segments = result.segments;
    if (segments && Array.isArray(segments) && segments.length > 0) {
      formattedLyrics = segments.map(seg => {
        const mins = Math.floor(seg.start / 60);
        const secs = Math.floor(seg.start % 60).toString().padStart(2, '0');
        const text = (seg.text || '').trim();
        return `[${mins}:${secs}] ${text}`;
      }).join('\n');
    } else {
      // Fallback: split long text into sentences
      formattedLyrics = formattedLyrics
        .replace(/([.!?])\s+/g, '$1\n')
        .replace(/([,;])\s+/g, '$1\n');
    }

    // Return both formatted text and raw segments for karaoke sync
    const segmentsData = (segments && Array.isArray(segments)) ? segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: (seg.text || '').trim()
    })) : [];

    res.status(200).json({ success: true, lyrics: formattedLyrics, segments: segmentsData, provider });
  } catch (err) {
    console.error('Transcribe error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
