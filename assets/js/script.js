// Music Player Application with Database & Real-time Support
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentTrack = null;
        this.isPlaying = false;
        this.isShuffle = false;
        this.isRepeat = false;
        this.tracks = [];
        this.filteredIndices = null; // for search filtering
        this.dbManager = null;
        this.useDatabase = false;
        this.isDraggingProgress = false;
        
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
                coverImage: track.cover_image_url
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
            coverImage: newTrack.cover_image_url
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
                this.audio.pause();
                this.audio.src = '';
                if (this.tracks.length > 0) {
                    this.currentTrack = Math.min(index, this.tracks.length - 1);
                    this.loadTrack(this.currentTrack);
                } else {
                    this.currentTrack = 0;
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
    }

    attachEventListeners() {
        // Player controls
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        
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
    }

    loadSampleTracks() {
        // Sample tracks for demo mode (no database)
        this.tracks = [
            { title: 'Summer Vibes', artist: 'DJ Sunshine', duration: '3:45', src: null },
            { title: 'Night Drive', artist: 'The Midnight', duration: '4:20', src: null },
            { title: 'Ocean Waves', artist: 'Chill Masters', duration: '5:12', src: null },
            { title: 'Electric Dreams', artist: 'Synth Wave', duration: '3:58', src: null },
            { title: 'Cosmic Journey', artist: 'Space Explorers', duration: '6:30', src: null }
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
            if (details.seekTime && this.audio.duration) {
                this.audio.currentTime = details.seekTime;
            }
        });
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.audio.src) {
            this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.vinylRecord.classList.add('playing');
            this.visualizer.classList.add('playing');
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
        if (this.audio.src) {
            this.audio.pause();
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
        const playIcon = this.playBtn.querySelector('.play-icon');
        const pauseIcon = this.playBtn.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    previousTrack() {
        if (this.tracks.length === 0) return;
        
        let newIndex = this.currentTrack === null ? 0 : this.currentTrack - 1;
        if (newIndex < 0) newIndex = this.tracks.length - 1;
        
        this.loadTrack(newIndex);
        if (this.isPlaying) this.play();
    }

    nextTrack() {
        if (this.tracks.length === 0) return;
        
        let newIndex;
        if (this.isShuffle) {
            newIndex = Math.floor(Math.random() * this.tracks.length);
        } else {
            newIndex = this.currentTrack === null ? 0 : this.currentTrack + 1;
            if (newIndex >= this.tracks.length) newIndex = 0;
        }
        
        this.loadTrack(newIndex);
        if (this.isPlaying) this.play();
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn.classList.toggle('active');
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        this.repeatBtn.classList.toggle('active');
    }

    handleTrackEnd() {
        if (this.isRepeat) {
            this.audio.currentTime = 0;
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
            this.audio.src = track.src;
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
    }

    playTrackByIndex(index) {
        this.loadTrack(index);
        this.play();
        this.switchView('player');
    }

    updateProgress() {
        if (this.audio.duration) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressFill.style.width = progress + '%';
            this.currentTime.textContent = this.formatTime(this.audio.currentTime);
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

    updateDuration() {
        if (this.audio.duration) {
            this.totalTime.textContent = this.formatTime(this.audio.duration);
        }
    }

    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        
        if (this.audio.duration) {
            this.audio.currentTime = percent * this.audio.duration;
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
        if (this.audio.muted) {
            this.audio.muted = false;
            this.volumeSlider.value = this.audio.volume * 100;
            this.updateVolumeIcon(false);
        } else {
            this.audio.muted = true;
            this.updateVolumeIcon(true);
        }
    }

    changeVolume(e) {
        const volume = e.target.value / 100;
        this.audio.volume = volume;
        this.audio.muted = false;
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
                progressFill.style.width = '20%';
                progressText.textContent = 'Reading file...';
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
                src: audioUrl
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
        
        // Add track to library
        this.tracks.push({
            title: fileName,
            artist: 'Unknown Artist',
            duration: '0:00',
            src: url
        });
        
        this.renderTrackList();
        
        // Update duration when loaded
        const tempAudio = new Audio(url);
        tempAudio.addEventListener('loadedmetadata', () => {
            const index = this.tracks.length - 1;
            this.tracks[index].duration = this.formatTime(tempAudio.duration);
            this.renderTrackList();
        });
        
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
                <button class="play-track-btn" title="Play">▶</button>
                ${this.useDatabase ? `<button class="rename-track-btn" title="Rename">✏️</button>` : ''}
                ${this.useDatabase ? `<button class="delete-track-btn" title="Delete">🗑️</button>` : ''}
            `;
            
            trackList.appendChild(trackItem);
            
            // Add event listeners
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
    }
}

// Initialize the music player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // Set initial volume
    player.audio.volume = 0.7;
    
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
