-- Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create tracks table
CREATE TABLE IF NOT EXISTS public.tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration TEXT,
    audio_url TEXT NOT NULL,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.tracks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Enable read access for all users" ON public.tracks
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.tracks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.tracks
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.tracks
    FOR DELETE USING (true);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('music-files', 'music-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'music-files');

CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'music-files');

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'music-files');

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (bucket_id = 'music-files');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS tracks_created_at_idx ON public.tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS tracks_artist_idx ON public.tracks(artist);
CREATE INDEX IF NOT EXISTS tracks_title_idx ON public.tracks(title);

-- Insert sample data (optional)
INSERT INTO public.tracks (title, artist, duration, audio_url)
VALUES 
    ('Summer Vibes', 'DJ Sunshine', '3:45', 'https://example.com/sample1.mp3'),
    ('Night Drive', 'The Midnight', '4:20', 'https://example.com/sample2.mp3'),
    ('Ocean Waves', 'Chill Masters', '5:12', 'https://example.com/sample3.mp3')
ON CONFLICT DO NOTHING;
