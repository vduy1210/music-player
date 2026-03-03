// Music Player Application with Database & Real-time Support
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentTrack = null;
        this.isPlaying = false;
        this.isShuffle = false;
        this.isRepeat = false;
        this.tracks = [];
        this.dbManager = null;
        this.useDatabase = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeDatabase();
    }

    // Initialize database connection
    async initializeDatabase() {
        // Wait briefly for config to load from API (if needed)
        if (!window.SUPABASE_URL || !window.SUPABASE_KEY) {
            await new Promise(resolve => setTimeout(resolve, 500));
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
    }

    // Load tracks from database
    async loadTracksFromDatabase() {
        try {
            const dbTracks = await this.dbManager.getTracks();
            this.tracks = dbTracks.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                src: track.audio_url,
                coverImage: track.cover_image_url
            }));
            this.renderTrackList();
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
            this.renderTrackList();
            this.showNotification(`🗑️ Track removed: ${deletedTrack.title}`);
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
        this.playTrackBtns = document.querySelectorAll('.play-track-btn');
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
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        
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
        
        // Track items
        this.playTrackBtns.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrackByIndex(index);
            });
        });
        
        document.querySelectorAll('.track-item').forEach((item, index) => {
            item.addEventListener('click', () => this.playTrackByIndex(index));
        });
    }

    loadSampleTracks() {
        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach(item => {
            this.tracks.push({
                title: item.dataset.title,
                artist: item.dataset.artist,
                duration: item.dataset.duration,
                src: null // No actual audio file for demo
            });
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
            if (i === index) {
                item.style.background = 'rgba(99, 102, 241, 0.2)';
                item.style.borderColor = 'var(--primary-color)';
            } else {
                item.style.background = 'rgba(15, 23, 42, 0.5)';
                item.style.borderColor = 'transparent';
            }
        });
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
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('audio/')) {
            alert('Please select an audio file!');
            return;
        }

        // If database is enabled, upload to database
        if (this.useDatabase && this.dbManager) {
            this.uploadToDatabase(file);
        } else {
            this.uploadLocally(file);
        }
    }

    // Upload file to database
    async uploadToDatabase(file) {
        try {
            this.showNotification('⏳ Uploading to database...');
            
            // Upload audio file to storage
            const audioUrl = await this.dbManager.uploadAudio(file);
            
            // Get audio duration
            const tempAudio = new Audio(URL.createObjectURL(file));
            await new Promise(resolve => {
                tempAudio.addEventListener('loadedmetadata', resolve);
            });
            const duration = this.formatTime(tempAudio.duration);
            
            // Add track to database
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            const trackData = {
                title: fileName,
                artist: 'Unknown Artist',
                duration: duration,
                audio_url: audioUrl
            };
            
            await this.dbManager.addTrack(trackData);
            this.showNotification('✅ Track uploaded successfully!');
            this.closeUploadModal();
            
        } catch (error) {
            console.error('Upload error:', error);
            console.error('Error details:', error.message, error.statusCode, JSON.stringify(error));
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
        trackList.innerHTML = '';
        
        this.tracks.forEach((track, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            trackItem.dataset.title = track.title;
            trackItem.dataset.artist = track.artist;
            trackItem.dataset.duration = track.duration;
            
            trackItem.innerHTML = `
                <div class="track-number">${index + 1}</div>
                <div class="track-item-info">
                    <div class="track-item-title">${track.title}</div>
                    <div class="track-item-artist">${track.artist}</div>
                </div>
                <div class="track-duration">${track.duration}</div>
                <button class="play-track-btn">▶</button>
            `;
            
            trackList.appendChild(trackItem);
            
            // Add event listeners
            const playBtn = trackItem.querySelector('.play-track-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrackByIndex(index);
            });
            
            trackItem.addEventListener('click', () => this.playTrackByIndex(index));
        });
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
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        document.querySelector('.play-btn').click();
    }
});
