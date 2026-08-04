// Audio Compressor - Compresses audio files in the browser using ffmpeg.wasm
// Converts large WAV/FLAC/high-bitrate files to MP3 192kbps before upload
// This saves ~87-95% storage space on Supabase

class AudioCompressor {
    constructor() {
        this.ffmpeg = null;
        this.loaded = false;
        this._loadingPromise = null;
    }

    // Check if a file should be compressed
    // Returns true for large files or lossless formats
    shouldCompress(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const sizeMB = file.size / (1024 * 1024);

        // Lossless formats - always compress (they are huge)
        const alwaysCompress = ['wav', 'flac', 'aiff', 'aif', 'wma', 'pcm'];
        if (alwaysCompress.includes(ext)) return true;

        // Lossy formats - only compress if file is large (> 10MB = likely high bitrate)
        const conditionalCompress = ['mp3', 'aac', 'ogg', 'm4a', 'mp4', 'webm'];
        if (conditionalCompress.includes(ext) && sizeMB > 10) return true;

        // Small files or unknown formats - skip compression
        return false;
    }

    // Load ffmpeg.wasm engine (cached after first load)
    // Uses single-threaded core for maximum browser compatibility
    async load(onStatusChange) {
        if (this.loaded) return;

        // If already loading, wait for the existing load to finish
        if (this._loadingPromise) {
            await this._loadingPromise;
            return;
        }

        this._loadingPromise = this._doLoad(onStatusChange);
        await this._loadingPromise;
    }

    async _doLoad(onStatusChange) {
        try {
            if (onStatusChange) onStatusChange('Loading audio compressor...');
            console.log('⏳ Loading ffmpeg.wasm...');

            // Dynamic import ffmpeg from CDN
            const { FFmpeg } = await import(
                'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm'
            );
            const { toBlobURL } = await import(
                'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm'
            );

            this.ffmpeg = new FFmpeg();

            // Load single-threaded WASM core (no SharedArrayBuffer needed)
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            const coreURL = await toBlobURL(
                `${baseURL}/ffmpeg-core.js`,
                'text/javascript'
            );
            const wasmURL = await toBlobURL(
                `${baseURL}/ffmpeg-core.wasm`,
                'application/wasm'
            );

            await this.ffmpeg.load({ coreURL, wasmURL });
            this.loaded = true;
            console.log('✅ Audio compressor loaded (ffmpeg.wasm ready)');
        } catch (error) {
            this._loadingPromise = null;
            console.error('❌ Failed to load audio compressor:', error);
            throw error;
        }
    }

    // Compress an audio file to MP3 192kbps
    // Parameters:
    //   file: File object to compress
    //   onProgress: callback(percent, message) - receives compression progress
    // Returns: compressed File object, or original file if compression skipped/failed
    async compress(file, onProgress) {
        // Skip if file doesn't need compression
        if (!this.shouldCompress(file)) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            console.log(`⏭️ Skipping compression: ${file.name} (${sizeMB}MB - already optimized)`);
            return file;
        }

        const originalSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        console.log(`🗜️ Starting compression: ${file.name} (${originalSizeMB}MB)`);

        try {
            // Load ffmpeg if not already loaded
            await this.load(
                onProgress ? (msg) => onProgress(0, msg) : null
            );

            // Import fetchFile utility
            const { fetchFile } = await import(
                'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm'
            );

            const ext = file.name.split('.').pop().toLowerCase();
            const inputName = `input.${ext}`;
            const outputName = 'output.mp3';

            // Set up progress tracking
            if (onProgress) {
                this.ffmpeg.on('progress', ({ progress }) => {
                    const pct = Math.min(Math.round(progress * 100), 100);
                    onProgress(pct, `Compressing audio... ${pct}%`);
                });
            }

            // Write input file to ffmpeg's virtual filesystem
            if (onProgress) onProgress(0, 'Reading file into compressor...');
            await this.ffmpeg.writeFile(inputName, await fetchFile(file));

            if (onProgress) onProgress(0, 'Compressing audio... 0%');

            // Run FFmpeg compression: convert to MP3 192kbps
            await this.ffmpeg.exec([
                '-i', inputName,          // Input file
                '-codec:a', 'libmp3lame', // MP3 encoder
                '-b:a', '192k',           // Bitrate: 192kbps
                '-ar', '44100',           // Sample rate: 44.1kHz (CD quality)
                '-ac', '2',               // Channels: Stereo
                '-y',                     // Overwrite output
                outputName
            ]);

            // Read compressed output from virtual filesystem
            const data = await this.ffmpeg.readFile(outputName);

            // Clean up virtual filesystem
            try { await this.ffmpeg.deleteFile(inputName); } catch (e) { /* ignore */ }
            try { await this.ffmpeg.deleteFile(outputName); } catch (e) { /* ignore */ }

            // Create new File object with .mp3 extension
            const compressedName = file.name.replace(/\.[^/.]+$/, '.mp3');
            const compressedFile = new File([data], compressedName, {
                type: 'audio/mpeg'
            });

            // Log compression results
            const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(1);
            const reduction = Math.round((1 - compressedFile.size / file.size) * 100);
            console.log(`✅ Compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (−${reduction}%)`);

            if (onProgress) onProgress(100, 'Compression complete!');

            return compressedFile;
        } catch (error) {
            console.error('❌ Compression failed, will upload original file:', error);
            if (onProgress) onProgress(100, 'Compression skipped (error)');
            // Fallback: return original file so upload can continue
            return file;
        }
    }
}

// Export for use in other files
window.AudioCompressor = AudioCompressor;
