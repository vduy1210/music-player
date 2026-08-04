-- Supabase Auth & Row Level Security (RLS) Setup
-- Execute this script in your Supabase SQL Editor (https://app.supabase.com)

-- 1. Ensure RLS is enabled on tracks table
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing loose policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tracks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.tracks;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.tracks;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.tracks;

-- 3. Policy: EVERYONE can view/read tracks (public access)
CREATE POLICY "Public Read Access" ON public.tracks
    FOR SELECT USING (true);

-- 4. Policy: ONLY AUTHENTICATED USERS can insert tracks
CREATE POLICY "Authenticated Insert Access" ON public.tracks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Policy: ONLY AUTHENTICATED USERS can update tracks
CREATE POLICY "Authenticated Update Access" ON public.tracks
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 6. Policy: ONLY AUTHENTICATED USERS can delete tracks
CREATE POLICY "Authenticated Delete Access" ON public.tracks
    FOR DELETE USING (auth.role() = 'authenticated');

-- Storage Policies for 'music-files' bucket
-- Public read, Authenticated insert/delete
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

CREATE POLICY "Public Storage Read" ON storage.objects
    FOR SELECT USING (bucket_id = 'music-files');

CREATE POLICY "Authenticated Storage Upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'music-files' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated Storage Delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'music-files' 
        AND auth.role() = 'authenticated'
    );
