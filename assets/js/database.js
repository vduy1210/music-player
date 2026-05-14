// Database Manager - Handles all database operations and real-time updates
class DatabaseManager {
    constructor() {
        this.supabaseUrl = null;
        this.supabaseKey = null;
        this.supabase = null;
        this.subscription = null;
        this.onTrackChangeCallback = null;
    }

    // Initialize Supabase client
    async initialize(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        
        try {
            // Import Supabase client
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            this.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('✅ Supabase initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            return false;
        }
    }

    // Fetch all tracks from database
    async getTracks() {
        if (!this.supabase) {
            throw new Error('Database not initialized');
        }

        const { data, error } = await this.supabase
            .from('tracks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Add new track to database
    async addTrack(trackData) {
        if (!this.supabase) {
            throw new Error('Database not initialized');
        }

        const { data, error } = await this.supabase
            .from('tracks')
            .insert([trackData])
            .select();

        if (error) throw error;
        return data[0];
    }

    // Update existing track
    async updateTrack(id, trackData) {
        if (!this.supabase) {
            throw new Error('Database not initialized');
        }

        const { data, error } = await this.supabase
            .from('tracks')
            .update(trackData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    }

    // Delete track from database
    async deleteTrack(id) {
        if (!this.supabase) {
            throw new Error('Database not initialized');
        }

        const { error } = await this.supabase
            .from('tracks')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // Delete audio file from Supabase Storage
    async deleteAudioFile(fileName) {
        if (!this.supabaseUrl || !this.supabaseKey) return;

        try {
            const deleteUrl = `${this.supabaseUrl}/storage/v1/object/music-files/${fileName}`;
            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'apikey': this.supabaseKey
                }
            });
            console.log('🗑️ Storage delete status:', response.status);
        } catch (error) {
            console.warn('⚠️ Failed to delete file from storage:', error.message);
        }
    }

    // Upload audio file to Supabase Storage
    async uploadAudio(file) {
        if (!this.supabase) {
            throw new Error('Database not initialized');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log('📤 Uploading file:', fileName, 'Size:', file.size);

        // First try using Supabase client SDK (recommended for browsers)
        const filePath = `audio/${fileName}`;
        try {
            const { data: uploadData, error: uploadErr } = await this.supabase.storage
                .from('music-files')
                .upload(filePath, file, { contentType: file.type, cacheControl: '3600' });

            if (uploadErr) {
                throw uploadErr;
            }

            // Get public URL via SDK
            const { data: publicData, error: publicErr } = this.supabase.storage
                .from('music-files')
                .getPublicUrl(filePath);

            if (publicErr) {
                console.warn('⚠️ Public URL retrieval failed via SDK:', publicErr.message);
            }

            const publicUrl = publicData?.publicUrl || `${this.supabaseUrl}/storage/v1/object/public/music-files/${filePath}`;
            console.log('🔗 Public URL:', publicUrl);
            return publicUrl;
        } catch (sdkError) {
            console.warn('⚠️ SDK upload failed, falling back to REST upload:', sdkError.message);

            // Fallback to REST upload (some environments may allow this)
            const uploadUrl = `${this.supabaseUrl}/storage/v1/object/music-files/${filePath}`;
            try {
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'apikey': this.supabaseKey,
                        'Content-Type': file.type,
                        'x-upsert': 'false'
                    },
                    body: file
                });

                console.log('📡 Upload response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Upload response error:', errorText);
                    throw new Error(`Storage upload failed (${response.status}): ${errorText}`);
                }

                const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/music-files/${filePath}`;
                console.log('🔗 Public URL (REST):', publicUrl);
                return publicUrl;
            } catch (fetchError) {
                console.error('❌ REST upload failed:', fetchError.message);
                throw fetchError;
            }
        }
    }

    // Subscribe to real-time updates
    subscribeToChanges(callback) {
        if (!this.supabase) {
            console.error('Database not initialized');
            return null;
        }

        this.onTrackChangeCallback = callback;

        this.subscription = this.supabase
            .channel('tracks-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tracks'
                },
                (payload) => {
                    console.log('🔄 Real-time update received:', payload);
                    if (this.onTrackChangeCallback) {
                        this.onTrackChangeCallback(payload);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time subscription active');
                }
            });

        return this.subscription;
    }

    // Unsubscribe from real-time updates
    unsubscribe() {
        if (this.subscription) {
            this.supabase.removeChannel(this.subscription);
            this.subscription = null;
            console.log('🔴 Real-time subscription closed');
        }
    }
}

// Export for use in other files
window.DatabaseManager = DatabaseManager;
