// Music Player Application with Database & Real-time Support
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.audio.crossOrigin = "anonymous"; // Fix CORS for Web Audio API
        this.video = null; // will be initialized later
        this.media = null; // currently active media element (audio or video)
        this.currentTrack = null;
        this.isPlaying = false;
        this.isShuffle = false;
        this.isRepeat = false;
        this.tracks = [];
        this.filteredIndices = null; // for search filtering
        this.dbManager = null;
        this.useDatabase = false;
        this.isDraggingProgress = false;
        
        // Audio Visualizer properties
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.sourceNodes = new Map();
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeDatabase();
    }

    // Initialize database connection
    async initializeDatabase() {
        // Wait for config to load from API
        if (window._supabaseConfigReady) {
            await window._supabaseConfigReady;
        }

        const supabaseUrl = window.SUPABASE_URL || null;
        const supabaseKey = window.SUPABASE_KEY || null;

        if (supabaseUrl && supabaseKey) {
            this.dbManager = new DatabaseManager();
            const initialized = await this.dbManager.initialize(supabaseUrl, supabaseKey);
            
            if (initialized) {
                this.useDatabase = true;
                await this.loadTracksFromDatabase();
                this.setupRealtimeUpdates();
                console.log('🎵 Database mode enabled');
            } else {
                this.loadSampleTracks();
                console.log('🎵 Local mode - Database initialization failed');
            }
        } else {
            this.loadSampleTracks();
            console.log('🎵 Local mode - No database credentials');
        }

        // Hide loading, show content
        this.hideLoading();
    }

    // Hide loading spinner and show appropriate state
    hideLoading() {
        const loading = document.getElementById('library-loading');
        const empty = document.getElementById('library-empty');
        if (loading) loading.style.display = 'none';
        
        if (this.tracks.length === 0 && empty) {
            empty.style.display = 'block';
        }
        this.updateTrackCount();
    }

    // Update track count display
    updateTrackCount() {
        const countEl = document.querySelector('.track-count');
        if (countEl) {
            const count = this.filteredIndices ? this.filteredIndices.length : this.tracks.length;
            countEl.textContent = `${count} track${count !== 1 ? 's' : ''}`;
        }
    }

    // Load tracks from database
    async loadTracksFromDatabase() {
        try {
            const dbTracks = await this.dbManager.getTracks();
            // Filter out tracks with invalid URLs (local://, empty, etc.)
            const validTracks = dbTracks.filter(track => {
                if (!track.audio_url) return false;
                if (track.audio_url.startsWith('local://')) return false;
                return track.audio_url.startsWith('http://') || track.audio_url.startsWith('https://');
            });
            
            this.tracks = validTracks.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                src: track.audio_url,
                coverImage: track.cover_image_url,
                inPlaylist: false
            }));
            this.renderTrackList();
            
            const skipped = dbTracks.length - validTracks.length;
            if (skipped > 0) {
                console.warn(`⚠️ Skipped ${skipped} tracks with invalid URLs`);
            }
            console.log(`📚 Loaded ${this.tracks.length} tracks from database`);
        } catch (error) {
            console.error('Error loading tracks:', error);
            this.loadSampleTracks();
        }
    }

    // Setup real-time updates
    setupRealtimeUpdates() {
        if (!this.dbManager) return;

        this.dbManager.subscribeToChanges((payload) => {
            console.log('Real-time event:', payload.eventType);
            
            switch (payload.eventType) {
                case 'INSERT':
                    this.handleTrackAdded(payload.new);
                    break;
                case 'UPDATE':
                    this.handleTrackUpdated(payload.new);
                    break;
                case 'DELETE':
                    this.handleTrackDeleted(payload.old);
                    break;
            }
        });
    }

    // Handle real-time track added
    handleTrackAdded(newTrack) {
        const track = {
            id: newTrack.id,
            title: newTrack.title,
            artist: newTrack.artist,
            duration: newTrack.duration,
            src: newTrack.audio_url,
            coverImage: newTrack.cover_image_url,
            inPlaylist: false
        };
        this.tracks.push(track);
        this.renderTrackList();
        this.showNotification(`🎵 New track added: ${track.title}`);
    }

    // Handle real-time track updated
    handleTrackUpdated(updatedTrack) {
        const index = this.tracks.findIndex(t => t.id === updatedTrack.id);
        if (index !== -1) {
            this.tracks[index] = {
                id: updatedTrack.id,
                title: updatedTrack.title,
                artist: updatedTrack.artist,
                duration: updatedTrack.duration,
                src: updatedTrack.audio_url,
                coverImage: updatedTrack.cover_image_url
            };
            this.renderTrackList();
            this.showNotification(`🔄 Track updated: ${updatedTrack.title}`);
        }
    }

    // Handle real-time track deleted
    handleTrackDeleted(deletedTrack) {
        const index = this.tracks.findIndex(t => t.id === deletedTrack.id);
        if (index !== -1) {
            this.tracks.splice(index, 1);
            // Adjust currentTrack index if needed
            if (this.currentTrack >= this.tracks.length) {
                this.currentTrack = Math.max(0, this.tracks.length - 1);
            }
            this.renderTrackList();
            this.showNotification(`🗑️ Track removed: ${deletedTrack.title}`);
        }
    }

    // Rename track in database
    async renameTrack(index) {
        const track = this.tracks[index];
        if (!track) return;

        const newTitle = prompt('Enter new name:', track.title);
        if (!newTitle || newTitle.trim() === '' || newTitle === track.title) return;

        const trimmedTitle = newTitle.trim();

        try {
            if (this.useDatabase && this.dbManager && track.id) {
                await this.dbManager.updateTrack(track.id, { title: trimmedTitle });
            }
            
            this.tracks[index].title = trimmedTitle;
            
            // Update player display if this is the current track
            if (index === this.currentTrack) {
                const titleEl = document.querySelector('.track-title');
                if (titleEl) titleEl.textContent = trimmedTitle;
            }
            
            this.renderTrackList();
            this.showNotification(`✏️ Renamed to: ${trimmedTitle}`);
        } catch (error) {
            console.error('❌ Rename failed:', error);
            this.showNotification('❌ Rename failed');
        }
    }

    // Delete track from database and storage
    async deleteTrack(index) {
        const track = this.tracks[index];
        if (!track) return;

        if (!confirm(`Delete "${track.title}"?`)) return;

        try {
            this.showNotification('⏳ Deleting track...');

            // Delete file from Storage if it's a Supabase URL
            if (track.src && track.src.includes('/storage/v1/object/public/music-files/')) {
                const fileName = track.src.split('/music-files/').pop();
                await this.dbManager.deleteAudioFile(fileName);
            }

            // Delete track from database
            await this.dbManager.deleteTrack(track.id);

            // Remove from local array
            this.tracks.splice(index, 1);

            // Adjust current track index
            if (index === this.currentTrack) {
                const active = this.media || this.audio;
                try { if (active) active.pause(); } catch (e) {}
                try { if (active) active.src = ''; } catch (e) {}
                if (this.tracks.length > 0) {
                    this.currentTrack = Math.min(index, this.tracks.length - 1);
                    this.loadTrack(this.currentTrack);
                } else {
                    this.currentTrack = 0;
                    // hide video if present and restore album cover
                    if (this.video) this.video.style.display = 'none';
                    if (this.albumCover) this.albumCover.style.display = '';
                    const card = document.querySelector('.player-card');
                    if (card) card.classList.remove('video-active');
                }
            } else if (index < this.currentTrack) {
                this.currentTrack--;
            }

            this.renderTrackList();
            this.showNotification(`🗑️ Deleted: ${track.title}`);
        } catch (error) {
            console.error('❌ Delete failed:', error);
            this.showNotification('❌ Failed to delete track');
        }
    }

    // Show notification
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'realtime-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    initializeElements() {
        // Player controls
        this.playBtn = document.querySelector('.play-btn');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.shuffleBtn = document.querySelector('.shuffle-btn');
        this.repeatBtn = document.querySelector('.repeat-btn');
        
        // UI elements
        this.trackTitle = document.querySelector('.track-title');
        this.trackArtist = document.querySelector('.track-artist');
        this.currentTime = document.querySelector('.current-time');
        this.totalTime = document.querySelector('.total-time');
        this.progressBar = document.querySelector('.progress-bar');
        this.progressFill = document.querySelector('.progress-fill');
        this.vinylRecord = document.querySelector('.vinyl-record');
        this.visualizer = document.querySelector('.visualizer');
        this.bars = document.querySelectorAll('.bar');
        
        // Volume
        this.volumeBtn = document.querySelector('.volume-btn');
        this.volumeSlider = document.querySelector('.volume-slider');
        
        // Views
        this.navBtns = document.querySelectorAll('.nav-btn');
        this.views = document.querySelectorAll('.view');
        
        // Library
        this.addTrackBtn = document.querySelector('.add-track-btn');
        this.modal = document.getElementById('upload-modal');
        this.closeModal = document.querySelector('.close-modal');
        this.audioFileInput = document.getElementById('audio-file');
        
        // Search
        this.searchInput = document.querySelector('.search-input');
        
        // Drop zone
        this.dropZone = document.getElementById('drop-zone');
        // Video element (for MP4 / WebM / Ogg video playback)
        this.video = document.getElementById('video-player');
        if (this.video) this.video.crossOrigin = "anonymous";
        // Album cover element (to hide when playing video)
        this.albumCover = document.querySelector('.album-cover');
        // Playlist elements
        this.playlistList = document.getElementById('playlist-list');
        this.playlistCount = document.getElementById('playlist-count');

        // Default active media is the audio element
        this.media = this.audio;

        // YouTube elements
        this.ytSearchInput = document.getElementById('youtube-search-input');
        this.ytSearchBtn = document.getElementById('youtube-search-btn');
        this.ytResults = document.getElementById('youtube-results');
        this.ytPlayer = null; // YouTube IFrame player instance
        this.ytPlayerReady = false;
    }

    attachEventListeners() {
        // Player controls
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        // Media events (listen on both audio and video and use event target)
        [this.audio, this.video].forEach(m => {
            if (!m) return;
            m.addEventListener('timeupdate', (e) => this.updateProgress(e));
            m.addEventListener('loadedmetadata', (e) => this.updateDuration(e));
            m.addEventListener('ended', (e) => this.handleTrackEnd(e));
        });
        
        // Progress bar - click and drag
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.progressBar.addEventListener('mousedown', (e) => this.startDragProgress(e));
        document.addEventListener('mousemove', (e) => this.dragProgress(e));
        document.addEventListener('mouseup', () => this.stopDragProgress());
        // Touch support for progress bar
        this.progressBar.addEventListener('touchstart', (e) => this.startDragProgress(e.touches[0]), { passive: true });
        document.addEventListener('touchmove', (e) => { if (this.isDraggingProgress) this.dragProgress(e.touches[0]); });
        document.addEventListener('touchend', () => this.stopDragProgress());
        
        // Volume
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.changeVolume(e));
        
        // Navigation
        this.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Library
        this.addTrackBtn.addEventListener('click', () => this.openModal());
        this.closeModal.addEventListener('click', () => this.closeUploadModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeUploadModal();
        });
        this.audioFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Search
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.handleSearch());
        }
        
        // Drag & Drop
        if (this.dropZone) {
            this.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.dropZone.classList.add('drag-over');
            });
            this.dropZone.addEventListener('dragleave', () => {
                this.dropZone.classList.remove('drag-over');
            });
            this.dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleDroppedFiles(files);
                }
            });
        }

        // YouTube search
        if (this.ytSearchBtn) {
            this.ytSearchBtn.addEventListener('click', () => this.searchYouTube());
        }
        if (this.ytSearchInput) {
            this.ytSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.searchYouTube();
            });
        }
    }

    loadSampleTracks() {
        // Sample tracks for demo mode (no database)
        this.tracks = [
            { title: 'Summer Vibes', artist: 'DJ Sunshine', duration: '3:45', src: null, inPlaylist: false },
            { title: 'Night Drive', artist: 'The Midnight', duration: '4:20', src: null, inPlaylist: false },
            { title: 'Ocean Waves', artist: 'Chill Masters', duration: '5:12', src: null, inPlaylist: false },
            { title: 'Electric Dreams', artist: 'Synth Wave', duration: '3:58', src: null, inPlaylist: false },
            { title: 'Cosmic Journey', artist: 'Space Explorers', duration: '6:30', src: null, inPlaylist: false }
        ];
        this.renderTrackList();
    }

    // Search handler
    handleSearch() {
        const query = this.searchInput.value.trim().toLowerCase();
        if (!query) {
            this.filteredIndices = null;
        } else {
            this.filteredIndices = [];
            this.tracks.forEach((track, i) => {
                if (track.title.toLowerCase().includes(query) || 
                    track.artist.toLowerCase().includes(query)) {
                    this.filteredIndices.push(i);
                }
            });
        }
        this.renderTrackList();
        this.updateTrackCount();
    }

    // Handle dropped files
    handleDroppedFiles(files) {
        const allowedTypes = ['audio/', 'video/mp4', 'video/webm', 'video/ogg'];
        const allowedExts = ['.mp3', '.mp4', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.webm'];
        
        for (const file of files) {
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            const isAllowed = allowedTypes.some(t => file.type.startsWith(t)) || allowedExts.includes(fileExt);
            
            if (isAllowed) {
                if (this.useDatabase && this.dbManager) {
                    this.uploadToDatabase(file);
                } else {
                    this.uploadLocally(file);
                }
            } else {
                this.showNotification(`❌ Unsupported: ${file.name}`);
            }
        }
    }

    // Progress bar drag
    startDragProgress(e) {
        this.isDraggingProgress = true;
        this.seek(e);
    }

    dragProgress(e) {
        if (!this.isDraggingProgress) return;
        this.seek(e);
    }

    stopDragProgress() {
        this.isDraggingProgress = false;
    }

    // Media Session API - lock screen / notification controls
    updateMediaSession() {
        if (!('mediaSession' in navigator)) return;
        
        const track = this.tracks[this.currentTrack];
        if (!track) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: 'Music Player'
        });

        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            const active = this.media || this.audio;
            if (details.seekTime && active && active.duration) {
                active.currentTime = details.seekTime;
            }
        });
    }

    escapeHtml(str) {
        return String(str).replace(/[&<>\"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"})[s]);
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000; // 32KB chunks
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        // YouTube playback
        if (this.isYouTube && this.ytPlayer && this.ytPlayerReady) {
            this.ytPlayer.playVideo();
            this.isPlaying = true;
            this.updatePlayButton();
            this.vinylRecord.classList.add('playing');
            this.visualizer.classList.add('playing');
            return;
        }
        const active = this.media || this.audio;
        if (active && active.src) {
            active.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.vinylRecord.classList.add('playing');
            this.visualizer.classList.add('playing');
            
            // Start Visualizer
            this.startVisualizer(active);
        } else {
            // Demo mode - simulate playing
            this.isPlaying = true;
            this.updatePlayButton();
            this.vinylRecord.classList.add('playing');
            this.visualizer.classList.add('playing');
            this.simulateProgress();
        }
    }

    pause() {
        // YouTube playback
        if (this.isYouTube && this.ytPlayer && this.ytPlayerReady) {
            this.ytPlayer.pauseVideo();
            this.isPlaying = false;
            this.updatePlayButton();
            this.vinylRecord.classList.remove('playing');
            this.visualizer.classList.remove('playing');
            return;
        }
        const active = this.media || this.audio;
        if (active && active.src) {
            active.pause();
        }
        this.isPlaying = false;
        this.updatePlayButton();
        this.vinylRecord.classList.remove('playing');
        this.visualizer.classList.remove('playing');
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
    }

    updatePlayButton() {
        if (!this.playBtn) return;
        const playIcon = this.playBtn.querySelector('.play-icon');
        const pauseIcon = this.playBtn.querySelector('.pause-icon');

        if (this.isPlaying) {
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'block';
        } else {
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
        }
    }

    // Get playlist entries (tracks with inPlaylist !== false)
    getPlaylistEntries() {
        const entries = [];
        this.tracks.forEach((t, idx) => {
            if (t.inPlaylist !== false) entries.push(idx);
        });
        return entries;
    }

    previousTrack() {
        if (this.tracks.length === 0) return;
        const playlist = this.getPlaylistEntries();
        if (playlist.length === 0) return;
        
        const currentPos = playlist.indexOf(this.currentTrack);
        let newPos;
        if (currentPos <= 0) {
            newPos = playlist.length - 1;
        } else {
            newPos = currentPos - 1;
        }
        this.playTrackByIndex(playlist[newPos]);
    }

    nextTrack() {
        if (this.tracks.length === 0) return;
        const playlist = this.getPlaylistEntries();
        if (playlist.length === 0) return;
        
        let newPos;
        if (this.isShuffle) {
            newPos = Math.floor(Math.random() * playlist.length);
        } else {
            const currentPos = playlist.indexOf(this.currentTrack);
            newPos = currentPos + 1;
            if (newPos >= playlist.length) newPos = 0;
        }
        this.playTrackByIndex(playlist[newPos]);
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn.classList.toggle('active');
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        this.repeatBtn.classList.toggle('active');
    }

    handleTrackEnd(e) {
        // e.target may be audio or video; but behavior is same
        if (this.isRepeat) {
            const active = (e && e.target) || this.media || this.audio;
            if (active) active.currentTime = 0;
            this.play();
        } else {
            this.nextTrack();
        }
    }

    loadTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        
        this.currentTrack = index;
        const track = this.tracks[index];
        
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = track.artist;
        
        if (track.src) {
            // Clean up YouTube state
            if (this.isYouTube) {
                this.isYouTube = false;
                this.currentYtVideoId = null;
                this.stopYtProgressPolling();
                if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
                    try { this.ytPlayer.destroy(); } catch (e) {}
                    this.ytPlayer = null;
                    this.ytPlayerReady = false;
                }
            }
            // Hide YouTube embed and restore album-art
            const ytEmbed = document.getElementById('yt-embed-container');
            if (ytEmbed) { ytEmbed.style.display = 'none'; ytEmbed.innerHTML = ''; }
            const albumArt = document.querySelector('.album-art');
            if (albumArt) albumArt.style.display = '';
            if (this.vinylRecord) this.vinylRecord.style.display = '';
            // Reset album cover thumbnail from YouTube
            const albumCoverEl = document.querySelector('.album-cover');
            const albumIcon = document.querySelector('.album-icon');
            if (albumCoverEl) {
                albumCoverEl.style.backgroundImage = '';
                albumCoverEl.style.backgroundSize = '';
                albumCoverEl.style.backgroundPosition = '';
            }
            if (albumIcon) albumIcon.style.display = '';

            // detect video extensions
            const isVideo = track.isVideo || /\.(mp4|webm|ogv|ogg)$/i.test(track.src) || (track.src.indexOf('video/') !== -1);
            if (isVideo && this.video) {
                // switch to video element
                try { this.audio.pause(); } catch (e) {}
                this.video.style.display = 'block';
                this.audio.style.display = 'none';
                if (this.albumCover) this.albumCover.style.display = 'none';
                // mark player card as video-active so CSS can expand layout
                const card = document.querySelector('.player-card');
                if (card) card.classList.add('video-active');
                this.video.src = track.src;
                this.media = this.video;
            } else {
                // use audio element
                try { if (this.video) this.video.pause(); } catch (e) {}
                if (this.video) this.video.style.display = 'none';
                if (this.albumCover) this.albumCover.style.display = '';
                // remove video-active class
                const card = document.querySelector('.player-card');
                if (card) card.classList.remove('video-active');
                this.audio.style.display = 'block';
                this.audio.src = track.src;
                this.media = this.audio;
            }
        }
        
        // Update active track in library
        document.querySelectorAll('.track-item').forEach((item, i) => {
            item.classList.remove('active');
        });
        // Find the correct DOM element (considering search filter)
        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach(item => {
            if (parseInt(item.dataset.index) === index) {
                item.classList.add('active');
            }
        });

        // Update Media Session
        this.updateMediaSession();

        // Dynamic Background Update
        if (track.coverImage) {
            this.updateDynamicBackground(track.coverImage);
        } else if (!track.isYouTube) {
            this.resetDynamicBackground();
        }
    }

    playTrackByIndex(index) {
        if (index < 0 || index >= this.tracks.length) return;
        const track = this.tracks[index];
        // Auto-add to playlist when played
        track.inPlaylist = true;
        if (track.isYouTube && track.youtubeId) {
            this.playYouTubeVideo(track.youtubeId, track.title, track.artist);
            return;
        }
        this.loadTrack(index);
        this.play();
        this.switchView('player');
        this.renderPlaylist();
    }

    renderPlaylist() {
        if (!this.playlistList) return;
        this.playlistList.innerHTML = '';
        // Build list of tracks that are in the playlist
        const playlistEntries = [];
        this.tracks.forEach((t, idx) => {
            if (t.inPlaylist !== false) {
                playlistEntries.push({ track: t, realIndex: idx });
            }
        });
        if (this.playlistCount) {
            this.playlistCount.textContent = playlistEntries.length + ' track' + (playlistEntries.length !== 1 ? 's' : '');
        }
        if (playlistEntries.length === 0) {
            this.playlistList.innerHTML = '<p class="playlist-placeholder">No tracks in playlist. Add from Library or YouTube.</p>';
            return;
        }
        playlistEntries.forEach((entry, displayIdx) => {
            const { track: t, realIndex: idx } = entry;
            const item = document.createElement('div');
            item.className = 'playlist-item' + (idx === this.currentTrack ? ' playlist-active' : '');
            const icon = t.isYouTube ? '📺' : (t.isVideo ? '🎬' : '🎵');
            item.innerHTML = `
                <div class="playlist-item-index">${displayIdx + 1}</div>
                <div class="playlist-item-icon">${icon}</div>
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${this.escapeHtml(t.title)}</div>
                    <div class="playlist-item-artist">${this.escapeHtml(t.artist || 'Unknown')}</div>
                </div>
                <button class="playlist-item-remove" title="Remove">✕</button>`;
            item.addEventListener('click', (e) => {
                if (e.target.closest('.playlist-item-remove')) return;
                this.playTrackByIndex(idx);
            });
            item.querySelector('.playlist-item-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTrackFromPlaylist(idx);
            });
            this.playlistList.appendChild(item);
        });
        // Scroll active item into view
        const activeItem = this.playlistList.querySelector('.playlist-active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    removeTrackFromPlaylist(idx) {
        if (idx < 0 || idx >= this.tracks.length) return;
        // Only hide from playlist, don't remove from library
        this.tracks[idx].inPlaylist = false;
        this.renderPlaylist();
        this.renderTrackList();
        this.showNotification('Removed from playlist');
    }

    togglePlaylistFlag(idx) {
        if (idx < 0 || idx >= this.tracks.length) return;
        const track = this.tracks[idx];
        if (track.inPlaylist !== false) {
            track.inPlaylist = false;
            this.showNotification('Removed from playlist');
        } else {
            track.inPlaylist = true;
            this.showNotification('Added to playlist');
        }
        this.renderPlaylist();
        this.renderTrackList();
    }

    updateProgress(e) {
        const active = (e && e.target) || this.media || this.audio;
        if (active && active.duration) {
            const progress = (active.currentTime / active.duration) * 100;
            this.progressFill.style.width = progress + '%';
            this.currentTime.textContent = this.formatTime(active.currentTime);
        }
    }

    simulateProgress() {
        let progress = 0;
        this.progressInterval = setInterval(() => {
            if (this.isPlaying) {
                progress += 0.5;
                if (progress >= 100) {
                    progress = 0;
                    if (!this.isRepeat) {
                        this.pause();
                        return;
                    }
                }
                this.progressFill.style.width = progress + '%';
                
                // Simulate time
                const duration = 225; // 3:45 in seconds
                const currentSeconds = (progress / 100) * duration;
                this.currentTime.textContent = this.formatTime(currentSeconds);
            }
        }, 100);
    }

    updateDuration(e) {
        const active = (e && e.target) || this.media || this.audio;
        if (active && active.duration) {
            this.totalTime.textContent = this.formatTime(active.duration);
        }
    }

    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        // YouTube seek
        if (this.isYouTube && this.ytPlayer && this.ytPlayerReady) {
            const duration = this.ytPlayer.getDuration();
            if (duration > 0) {
                this.ytPlayer.seekTo(percent * duration, true);
                this.progressFill.style.width = (percent * 100) + '%';
                this.currentTime.textContent = this.formatTime(percent * duration);
            }
            return;
        }
        
        const active = this.media || this.audio;
        if (active && active.duration) {
            active.currentTime = percent * active.duration;
        } else {
            // Demo mode
            this.progressFill.style.width = (percent * 100) + '%';
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    toggleMute() {
        // YouTube mute
        if (this.isYouTube && this.ytPlayer && this.ytPlayerReady) {
            if (this.ytPlayer.isMuted()) {
                this.ytPlayer.unMute();
                this.volumeSlider.value = this.ytPlayer.getVolume();
                this.updateVolumeIcon(false);
            } else {
                this.ytPlayer.mute();
                this.updateVolumeIcon(true);
            }
            return;
        }
        const active = this.media || this.audio;
        if (active.muted) {
            active.muted = false;
            this.volumeSlider.value = (active.volume || 0) * 100;
            this.updateVolumeIcon(false);
        } else {
            active.muted = true;
            this.updateVolumeIcon(true);
        }
    }

    changeVolume(e) {
        const volume = e.target.value / 100;
        // YouTube volume
        if (this.isYouTube && this.ytPlayer && this.ytPlayerReady) {
            this.ytPlayer.setVolume(e.target.value);
            this.ytPlayer.unMute();
            this.updateVolumeIcon(volume === 0);
            return;
        }
        const active = this.media || this.audio;
        if (active) {
            active.volume = volume;
            active.muted = false;
        }
        this.updateVolumeIcon(volume === 0);
    }

    updateVolumeIcon(isMuted) {
        const volumeIcon = this.volumeBtn.querySelector('.volume-icon');
        const mutedIcon = this.volumeBtn.querySelector('.volume-mute-icon');
        
        if (isMuted) {
            volumeIcon.style.display = 'none';
            mutedIcon.style.display = 'block';
        } else {
            volumeIcon.style.display = 'block';
            mutedIcon.style.display = 'none';
        }
    }

    // ==================== YouTube Search & Play ====================

    async searchYouTube() {
        const query = this.ytSearchInput ? this.ytSearchInput.value.trim() : '';
        if (!query) return;

        if (this.ytResults) {
            this.ytResults.innerHTML = '<div class="youtube-loading"><div class="loading-spinner"></div><p>Searching YouTube...</p></div>';
        }

        try {
            const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}&limit=12`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();

            if (!data.success || !data.videos || data.videos.length === 0) {
                this.ytResults.innerHTML = '<div class="youtube-empty"><div class="empty-icon">😔</div><h3>No results found</h3><p>Try a different search term</p></div>';
                return;
            }

            this.renderYouTubeResults(data.videos);
        } catch (err) {
            console.error('YouTube search error:', err);
            if (this.ytResults) {
                this.ytResults.innerHTML = '<div class="youtube-empty"><div class="empty-icon">❌</div><h3>Search failed</h3><p>' + this.escapeHtml(err.message) + '</p></div>';
            }
        }
    }

    renderYouTubeResults(videos) {
        if (!this.ytResults) return;

        let html = '<div class="youtube-grid">';
        videos.forEach(video => {
            html += `
                <div class="yt-card" data-videoid="${this.escapeHtml(video.id)}">
                    <div class="yt-thumbnail">
                        <img src="${this.escapeHtml(video.thumbnail)}" alt="${this.escapeHtml(video.title)}" loading="lazy">
                        <span class="yt-duration">${this.escapeHtml(video.duration)}</span>
                        <div class="yt-play-overlay">▶</div>
                    </div>
                    <div class="yt-info">
                        <div class="yt-title">${this.escapeHtml(video.title)}</div>
                        <div class="yt-meta">
                            <span class="yt-author">${this.escapeHtml(video.author)}</span>
                            <span class="yt-views">${this.escapeHtml(video.views)}</span>
                            ${video.uploadedAt ? '<span class="yt-date">' + this.escapeHtml(video.uploadedAt) + '</span>' : ''}
                        </div>
                        <div class="yt-actions">
                            <button class="yt-add-btn" title="Add to Playlist">➕ Add</button>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
        this.ytResults.innerHTML = html;

        // Add click listeners
        this.ytResults.querySelectorAll('.yt-card').forEach(card => {
            const videoId = card.dataset.videoid;
            const title = card.querySelector('.yt-title')?.textContent || 'YouTube Video';
            const author = card.querySelector('.yt-author')?.textContent || '';

            // Click card to play immediately
            card.addEventListener('click', (e) => {
                if (e.target.closest('.yt-add-btn')) return;
                this.playYouTubeVideo(videoId, title, author);
            });

            // Click add button to add to playlist without playing
            card.querySelector('.yt-add-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.addYouTubeToPlaylist(videoId, title, author);
            });
        });
    }

    async playYouTubeVideo(videoId, title, author) {
        // Switch to player view
        this.switchView('player');

        // Pause any current media
        try { if (this.audio) this.audio.pause(); } catch (e) {}
        try { if (this.video) this.video.pause(); } catch (e) {}

        // Hide album-art / vinyl, show YouTube video embed
        const albumArt = document.querySelector('.album-art');
        if (albumArt) albumArt.style.display = 'none';
        if (this.video) this.video.style.display = 'none';

        // Add video-active class for video layout
        const card = document.querySelector('.player-card');
        if (card) card.classList.add('video-active');

        // Show YouTube embed container
        const ytContainer = document.getElementById('yt-embed-container');
        if (ytContainer) ytContainer.style.display = '';

        // Track YouTube state
        this.isYouTube = true;
        this.currentYtVideoId = videoId;
        this.media = null;

        // Wait for YouTube IFrame API to be ready
        await window.ytApiReady;

        // Destroy previous player if any
        if (this.ytPlayer && typeof this.ytPlayer.destroy === 'function') {
            try { this.ytPlayer.destroy(); } catch (e) {}
            this.ytPlayer = null;
        }

        // Create a div for the player inside hidden container
        if (ytContainer) ytContainer.innerHTML = '<div id="yt-player-div"></div>';

        this.ytPlayerReady = false;
        this.ytPlayer = new YT.Player('yt-player-div', {
            width: '100%',
            height: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1
            },
            events: {
                onReady: (event) => {
                    this.ytPlayerReady = true;
                    // Sync volume
                    const vol = this.volumeSlider ? parseInt(this.volumeSlider.value) : 100;
                    event.target.setVolume(vol);
                    // Update duration
                    this.totalTime.textContent = this.formatTime(event.target.getDuration());
                    // Start progress polling
                    this.startYtProgressPolling();
                },
                onStateChange: (event) => {
                    if (event.data === YT.PlayerState.ENDED) {
                        this.stopYtProgressPolling();
                        this.vinylRecord.classList.remove('playing');
                        this.visualizer.classList.remove('playing');
                        this.handleTrackEnd();
                    } else if (event.data === YT.PlayerState.PLAYING) {
                        this.isPlaying = true;
                        this.updatePlayButton();
                        this.vinylRecord.classList.add('playing');
                        this.visualizer.classList.add('playing');
                    } else if (event.data === YT.PlayerState.PAUSED) {
                        this.isPlaying = false;
                        this.updatePlayButton();
                        this.vinylRecord.classList.remove('playing');
                        this.visualizer.classList.remove('playing');
                    }
                }
            }
        });

        // Update track info
        this.trackTitle.textContent = title;
        this.trackArtist.textContent = author || 'YouTube';
        this.isPlaying = true;
        this.updatePlayButton();
        this.vinylRecord.classList.add('playing');
        this.visualizer.classList.add('playing');

        // Add to playlist if not already there
        const existingIdx = this.tracks.findIndex(t => t.isYouTube && t.youtubeId === videoId);
        if (existingIdx >= 0) {
            this.tracks[existingIdx].inPlaylist = true;
            this.currentTrack = existingIdx;
        } else {
            this.tracks.push({
                title: title,
                artist: author || 'YouTube',
                src: null,
                isYouTube: true,
                youtubeId: videoId,
                inPlaylist: true
            });
            this.currentTrack = this.tracks.length - 1;
        }
        this.renderPlaylist();
        this.renderTrackList();

        this.showNotification('▶️ Playing from YouTube');

        // Dynamic Background from YouTube Thumbnail
        this.updateDynamicBackground(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    }

    addYouTubeToPlaylist(videoId, title, author) {
        // Check if already in playlist
        const exists = this.tracks.some(t => t.isYouTube && t.youtubeId === videoId);
        if (exists) {
            this.showNotification('⚠️ Already in playlist');
            return;
        }
        this.tracks.push({
            title: title,
            artist: author || 'YouTube',
            src: null,
            isYouTube: true,
            youtubeId: videoId,
            inPlaylist: true
        });
        this.renderPlaylist();
        this.renderTrackList();
        this.showNotification('✅ Added to playlist');
    }

    startYtProgressPolling() {
        this.stopYtProgressPolling();
        this.ytProgressInterval = setInterval(() => {
            if (this.ytPlayer && this.ytPlayerReady && typeof this.ytPlayer.getCurrentTime === 'function') {
                try {
                    const current = this.ytPlayer.getCurrentTime();
                    const duration = this.ytPlayer.getDuration();
                    if (duration > 0) {
                        const progress = (current / duration) * 100;
                        this.progressFill.style.width = progress + '%';
                        this.currentTime.textContent = this.formatTime(current);
                        this.totalTime.textContent = this.formatTime(duration);
                    }
                } catch (e) {}
            }
        }, 250);
    }

    stopYtProgressPolling() {
        if (this.ytProgressInterval) {
            clearInterval(this.ytProgressInterval);
            this.ytProgressInterval = null;
        }
    }

    switchView(viewName) {
        this.views.forEach(view => view.classList.remove('active'));
        this.navBtns.forEach(btn => btn.classList.remove('active'));
        
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        const activeBtn = Array.from(this.navBtns).find(btn => btn.dataset.view === viewName);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // If switching to YouTube view, focus the search input
        if (viewName === 'youtube' && this.ytSearchInput) {
            setTimeout(() => this.ytSearchInput.focus(), 200);
        }
    }

    openModal() {
        this.modal.classList.add('active');
    }

    closeUploadModal() {
        this.modal.classList.remove('active');
        this.audioFileInput.value = '';
    }

    handleFileUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        this.handleDroppedFiles(files);
    }

    // Upload file to database
    async uploadToDatabase(file) {
        const progressEl = document.getElementById('upload-progress');
        const progressFill = document.querySelector('.upload-progress-fill');
        const progressText = document.querySelector('.upload-progress-text');
        
            try {
            // Show progress
            if (progressEl) {
                progressEl.style.display = 'block';
                if (progressFill) progressFill.style.width = '20%';
                if (progressText) progressText.textContent = 'Reading file...';
            }
            
            this.showNotification('⏳ Uploading to database...');
            
            // Get audio duration first
            const tempAudio = new Audio(URL.createObjectURL(file));
            await new Promise(resolve => {
                tempAudio.addEventListener('loadedmetadata', resolve);
            });
            const duration = this.formatTime(tempAudio.duration);
            const fileName = file.name.replace(/\.[^/.]+$/, '');

            if (progressFill) progressFill.style.width = '40%';
            if (progressText) progressText.textContent = 'Uploading audio...';

            let audioUrl;
            try {
                // Try uploading audio file to Supabase Storage
                audioUrl = await this.dbManager.uploadAudio(file);
            } catch (storageError) {
                console.error('❌ Storage upload failed:', storageError.message);
                this.showNotification('❌ Upload to storage failed: ' + storageError.message);
                if (progressEl) progressEl.style.display = 'none';
                // Don't save to database with broken URL - just play locally
                this.uploadLocally(file);
                return;
            }

            if (progressFill) progressFill.style.width = '80%';
            if (progressText) progressText.textContent = 'Saving to database...';

            // Add track to database (only if we have a valid storage URL)
            const trackData = {
                title: fileName,
                artist: 'Unknown Artist',
                duration: duration,
                audio_url: audioUrl
            };
            
            const result = await this.dbManager.addTrack(trackData);
            
            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = 'Done!';
            
            setTimeout(() => {
                if (progressEl) progressEl.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
            }, 1000);

            this.showNotification('✅ Track uploaded successfully!');
            this.closeUploadModal();

            // Add track to local list immediately for instant display
            this.tracks.push({
                id: result.id,
                title: fileName,
                artist: 'Unknown Artist',
                duration: duration,
                src: audioUrl,
                // keep original File for transcription if available
                file: file,
                inPlaylist: false
            });
            this.renderTrackList();
            this.updateTrackCount();
            
            // Hide empty state
            const empty = document.getElementById('library-empty');
            if (empty) empty.style.display = 'none';
            
        } catch (error) {
            console.error('Upload error:', error);
            console.error('Error details:', error.message, error.statusCode, JSON.stringify(error));
            if (progressEl) progressEl.style.display = 'none';
            this.showNotification('❌ Upload failed: ' + (error.message || 'Unknown error'));
            this.uploadLocally(file);
        }
    }

    // Upload file locally (fallback)
    uploadLocally(file) {
        const url = URL.createObjectURL(file);
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        const isVideoFile = file.type && file.type.startsWith('video');
        
        // Add track to library (mark video files)
        this.tracks.push({
            title: fileName,
            artist: 'Unknown Artist',
            duration: '0:00',
            src: url,
            isVideo: !!isVideoFile,
            file: file,
            inPlaylist: false
        });
        
        this.renderTrackList();
        
        // Update duration when loaded (use video element for video files)
        if (isVideoFile) {
            const tempVideo = document.createElement('video');
            tempVideo.src = url;
            tempVideo.addEventListener('loadedmetadata', () => {
                const index = this.tracks.length - 1;
                this.tracks[index].duration = this.formatTime(tempVideo.duration);
                this.renderTrackList();
            });
        } else {
            const tempAudio = new Audio(url);
            tempAudio.addEventListener('loadedmetadata', () => {
                const index = this.tracks.length - 1;
                this.tracks[index].duration = this.formatTime(tempAudio.duration);
                this.renderTrackList();
            });
        }
        
        this.closeUploadModal();
        this.loadTrack(this.tracks.length - 1);
        this.play();
    }

    // Render track list in UI
    renderTrackList() {
        const trackList = document.querySelector('.track-list');
        const emptyEl = document.getElementById('library-empty');
        trackList.innerHTML = '';
        
        // Determine which indices to render (filtered or all)
        const indicesToRender = this.filteredIndices 
            ? this.filteredIndices 
            : this.tracks.map((_, i) => i);
        
        // Show/hide empty state
        if (emptyEl) {
            emptyEl.style.display = this.tracks.length === 0 ? 'block' : 'none';
        }
        
        indicesToRender.forEach((realIndex, displayNum) => {
            const track = this.tracks[realIndex];
            if (!track) return;
            
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            if (realIndex === this.currentTrackIndex) {
                trackItem.classList.add('active');
            }
            trackItem.dataset.index = realIndex;
            trackItem.dataset.title = track.title;
            trackItem.dataset.artist = track.artist;
            trackItem.dataset.duration = track.duration;
            
            trackItem.innerHTML = `
                <div class="track-number">${displayNum + 1}</div>
                <div class="track-item-info">
                    <div class="track-item-title">${track.title}</div>
                    <div class="track-item-artist">${track.artist}</div>
                </div>
                <div class="track-duration">${track.duration}</div>
                <button class="add-playlist-btn" title="${track.inPlaylist !== false ? 'In Playlist' : 'Add to Playlist'}">${track.inPlaylist !== false ? '✅' : '➕'}</button>
                <button class="play-track-btn" title="Play">▶</button>
                ${this.useDatabase ? `<button class="rename-track-btn" title="Rename">✏️</button>` : ''}
                ${this.useDatabase ? `<button class="delete-track-btn" title="Delete">🗑️</button>` : ''}
            `;
            
            trackList.appendChild(trackItem);
            
            // Add event listeners
            const addPlaylistBtn = trackItem.querySelector('.add-playlist-btn');
            addPlaylistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePlaylistFlag(realIndex);
            });

            const playBtn = trackItem.querySelector('.play-track-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrackByIndex(realIndex);
            });

            const renameBtn = trackItem.querySelector('.rename-track-btn');
            if (renameBtn) {
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.renameTrack(realIndex);
                });
            }

            const deleteBtn = trackItem.querySelector('.delete-track-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteTrack(realIndex);
                });
            }
            
            trackItem.addEventListener('click', () => this.playTrackByIndex(realIndex));
        });
        
        this.updateTrackCount();
        this.renderPlaylist();
    }

    // Audio Visualizer Logic
    initAudioContext() {
        if (this.audioContext) return true;
        
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 64; // Smaller for fewer bars
            this.analyser.smoothingTimeConstant = 0.8;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            return true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            return false;
        }
    }

    startVisualizer(element) {
        if (!this.initAudioContext() || this.isYouTube) return;
        
        // Resume context if suspended (browser policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Connect element to analyser if not already connected
        if (!this.sourceNodes.has(element)) {
            try {
                const source = this.audioContext.createMediaElementSource(element);
                source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                this.sourceNodes.set(element, source);
            } catch (e) {
                console.warn('Could not connect audio source:', e);
                // Fallback: ensure audio is still connected to destination even if analyser fails
                element.connect && element.connect(this.audioContext.destination);
            }
        }

        this.animateVisualizer();
    }

    animateVisualizer() {
        if (!this.isPlaying || !this.analyser) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Map frequency data to visualizer bars
        const step = Math.floor(this.dataArray.length / this.bars.length);
        
        for (let i = 0; i < this.bars.length; i++) {
            const index = i * step;
            const value = this.dataArray[index];
            const percent = value / 255;
            
            // Adjust height/scale of bars
            // We use transform for better performance
            const height = Math.max(4, percent * 44);
            this.bars[i].style.height = `${height}px`;
            
            // Optional: Dynamic opacity based on frequency
            this.bars[i].style.opacity = 0.4 + (percent * 0.6);
        }

        if (this.isPlaying) {
            requestAnimationFrame(() => this.animateVisualizer());
        }
    }

    // Dynamic Background logic
    async updateDynamicBackground(imageUrl) {
        try {
            const colors = await this.getDominantColors(imageUrl);
            if (!colors) return;

            const root = document.documentElement;
            root.style.setProperty('--bg-color-1', `rgba(${colors[0].r}, ${colors[0].g}, ${colors[0].b}, 0.15)`);
            root.style.setProperty('--bg-color-2', `rgba(${colors[1].r}, ${colors[1].g}, ${colors[1].b}, 0.1)`);
            root.style.setProperty('--bg-color-3', `rgba(${colors[2].r}, ${colors[2].g}, ${colors[2].b}, 0.08)`);
        } catch (error) {
            console.warn('Could not update dynamic background:', error);
        }
    }

    resetDynamicBackground() {
        const root = document.documentElement;
        root.style.setProperty('--bg-color-1', 'rgba(124, 58, 237, 0.12)');
        root.style.setProperty('--bg-color-2', 'rgba(236, 72, 153, 0.08)');
        root.style.setProperty('--bg-color-3', 'rgba(56, 189, 248, 0.06)');
    }

    getDominantColors(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 50;
                canvas.height = 50;
                ctx.drawImage(img, 0, 0, 50, 50);
                
                const imageData = ctx.getImageData(0, 0, 50, 50).data;
                const colors = [];
                
                // Sample 3 regions
                const regions = [
                    { x: 10, y: 10 }, // Top left
                    { x: 40, y: 40 }, // Bottom right
                    { x: 25, y: 25 }  // Center
                ];
                
                regions.forEach(pos => {
                    const index = (pos.y * 50 + pos.x) * 4;
                    colors.push({
                        r: imageData[index],
                        g: imageData[index + 1],
                        b: imageData[index + 2]
                    });
                });
                
                resolve(colors);
            };
            
            img.onerror = () => resolve(null);
        });
    }
}

// Initialize the music player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // Set initial volume for audio and video
    player.audio.volume = 0.7;
    if (player.video) player.video.volume = 0.7;
    
    // Welcome animation
    setTimeout(() => {
        document.querySelector('.player-card').style.animation = 'fadeIn 0.8s ease';
    }, 100);
    
    console.log('🎵 Music Player initialized successfully!');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            document.querySelector('.play-btn')?.click();
            break;
        case 'ArrowRight':
            e.preventDefault();
            document.querySelector('.next-btn')?.click();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            document.querySelector('.prev-btn')?.click();
            break;
        case 'ArrowUp':
            e.preventDefault();
            {
                const vol = document.querySelector('.volume-slider');
                if (vol) {
                    vol.value = Math.min(100, parseInt(vol.value) + 5);
                    vol.dispatchEvent(new Event('input'));
                }
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            {
                const vol = document.querySelector('.volume-slider');
                if (vol) {
                    vol.value = Math.max(0, parseInt(vol.value) - 5);
                    vol.dispatchEvent(new Event('input'));
                }
            }
            break;
        case 'KeyM':
            document.querySelector('.volume-btn')?.click();
            break;
        case 'KeyS':
            document.querySelector('.shuffle-btn')?.click();
            break;
        case 'KeyR':
            document.querySelector('.repeat-btn')?.click();
            break;
    }
});
