# 🎵 Interactive Music Player

A modern, responsive music player web application with **real-time database** support, beautiful user interface, smooth animations, and cloud storage.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://html.spec.whatwg.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://www.ecma-international.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

## 📋 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Installation](#-installation)
- [Database Setup](#-database--real-time-features)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Usage](#-usage)
- [Technologies](#-technologies-used)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Features
- **🎨 Modern Design**: Beautiful gradient backgrounds with animated shapes
- **🎧 Full Music Player**: Play, pause, skip, shuffle, and repeat controls
- **📊 Audio Visualizer**: Animated bars that respond to music
- **💿 Vinyl Animation**: Spinning vinyl record effect when playing
- **📚 Music Library**: Manage and organize your music collection
- **📤 File Upload**: Upload your own audio files (MP3, WAV, OGG)
- **🔊 Volume Control**: Adjustable volume slider with mute functionality
- **⏱️ Progress Bar**: Interactive seek bar to jump to any position
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **⌨️ Keyboard Shortcuts**: Press spacebar to play/pause

### 🚀 NEW: Database & Real-time Features
- **☁️ Cloud Storage**: Store music files in Supabase Storage
- **🗄️ Database Integration**: All tracks stored in PostgreSQL database
- **⚡ Real-time Sync**: Instantly see when tracks are added/updated/deleted
- **🌐 Multi-user Support**: Changes sync across all connected users
- **🔄 Auto-refresh**: No page reload needed for updates
- **📡 Live Notifications**: Toast notifications for real-time events

## 🎬 Demo

### Local Mode
Open `index.html` in your browser to run locally without database.

### Database Mode
1. Configure Supabase credentials (see [Database Setup](#-database--real-time-features))
2. Deploy to Vercel (see [Deployment Guide](docs/DEPLOYMENT.md))
3. Enjoy real-time music sharing!

## 🚀 Installation

### Quick Start (Local Mode)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "Test music web"
   ```

2. **Open in browser:**
   ```bash
   # Just open index.html in your preferred browser
   # No build process required!
   ```

### With Database (Cloud Mode)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup Supabase:**
   - See [Database Setup](#-database--real-time-features) section below

3. **Configure credentials:**
   - Update `index.html` with your Supabase URL and Key

4. **Deploy:**
   ```bash
   npm run deploy
   ```

## 🗄️ Database & Real-time Features

### Prerequisites
- [Supabase Account](https://supabase.com) (Free tier available)
- [Vercel Account](https://vercel.com) (Free tier available)

### Setup Database

1. **Create Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create new project
   - Wait for initialization (~2 minutes)

2. **Run Database Schema**
   - Go to SQL Editor
   - Copy content from `config/database-schema.sql`
   - Execute the SQL script

3. **Get Your Credentials**
   - Go to Settings → API
   - Copy Project URL and anon key

4. **Update Configuration**
   
   Edit `index.html`:
   ```html
   <script>
       window.SUPABASE_URL = 'https://your-project.supabase.co';
       window.SUPABASE_KEY = 'your-anon-key-here';
   </script>
   ```

### How Real-time Works

1. **Upload Track**: When you upload a track, it's stored in:
   - Supabase Storage (audio file)
   - PostgreSQL Database (metadata)

2. **Real-time Sync**: All connected users receive instant notifications:
   - `🎵 New track added: Song Name`
   - `🔄 Track updated: Song Name`
   - `🗑️ Track removed: Song Name`

3. **Automatic Updates**: Library refreshes automatically without page reload

## 🌐 Deployment

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Deploy!

3. **Your site is live! 🎉**

📖 **Detailed Guide**: See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step instructions.

## 📁 Project Structure

```
Test music web/
│
├── index.html                 # Main HTML entry point
│
├── assets/                    # All assets directory
│   ├── css/                   # Stylesheets
│   │   └── style.css          # Main stylesheet
│   │
│   ├── js/                    # JavaScript files
│   │   └── script.js          # Main application logic
│   │
│   ├── images/                # Image assets
│   │   └── (album covers, icons, etc.)
│   │
│   ├── audio/                 # Audio files
│   │   └── (your music files)
│   │
│   └── fonts/                 # Custom fonts (if any)
│
├── docs/                      # Documentation
│   └── README.md              # Detailed documentation
│
├── .gitignore                 # Git ignore rules
├── LICENSE                    # Project license
└── README.md                  # This file
```

### Directory Details

#### `/assets/`
Contains all static assets organized by type:

- **`/css/`**: Stylesheets including main styles and animations
- **`/js/`**: JavaScript files for application logic
- **`/images/`**: Album art, icons, and other images
- **`/audio/`**: Sample audio files (add your own music here)
- **`/fonts/`**: Custom font files (currently using Google Fonts)

#### `/docs/`
Complete documentation including:
- Setup guides
- API documentation
- Feature explanations
- Troubleshooting tips

## 🎮 Usage

### Playing Music

1. **View Sample Tracks**: Click on "Library" in the navigation
2. **Select a Track**: Click on any track in the library to play it
3. **Upload Your Music**: Click "+ Add Track" to upload your own audio files
4. **Control Playback**: Use the play/pause, previous, and next buttons

### Player Controls

| Control | Function |
|---------|----------|
| Play/Pause | Click the large center button or press spacebar |
| Previous/Next | Navigate between tracks |
| Shuffle | Randomize playback order |
| Repeat | Loop the current track |
| Progress Bar | Click anywhere to jump to that position |
| Volume | Adjust volume or click speaker icon to mute |

### Keyboard Shortcuts

- `Spacebar`: Play/Pause

### Navigation

- **Player**: Main player interface with controls
- **Library**: View and manage your music collection
- **About**: Information about the application

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `assets/css/style.css`:

```css
:root {
    --primary-color: #6366f1;      /* Main theme color */
    --secondary-color: #8b5cf6;    /* Secondary accent */
    --accent-color: #ec4899;       /* Highlight color */
    --dark-bg: #0f172a;            /* Background */
    --card-bg: #1e293b;            /* Card background */
    /* ... more variables */
}
```

### Adding Custom Fonts

1. Add font files to `assets/fonts/`
2. Update `@font-face` in `assets/css/style.css`:

```css
@font-face {
    font-family: 'YourFont';
    src: url('../fonts/yourfont.woff2') format('woff2');
}
```

### Extending Features

The code is well-organized and commented. You can easily extend functionality:

- **Playlists**: Modify the track management in `script.js`
- **Equalizer**: Add audio context API integration
- **Lyrics**: Create a lyrics display component
- **Themes**: Add theme switcher functionality

## 🌐 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome/Edge | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Opera | 76+ | ✅ Fully Supported |

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Desktop | 1024px+ | Full layout with all features |
| Tablet | 768px - 1023px | Optimized for touch |
| Mobile | 480px - 767px | Compact mobile view |
| Small Mobile | < 480px | Minimal mobile layout |

## 🎯 Technologies Used

### Frontend
- **HTML5**: Semantic structure and audio element
- **CSS3**: Modern styling with flexbox, grid, animations
- **JavaScript (ES6+)**: Class-based player functionality

### APIs & Libraries
- **Web Audio API**: For audio playback (native)
- **FileReader API**: For file uploads
- **Google Fonts**: Poppins font family

### Key Features Implementation
- **Object-Oriented Design**: MusicPlayer class for clean code organization
- **Event-Driven Architecture**: Efficient event handling
- **CSS Animations**: Smooth transitions and visual effects
- **Responsive Design**: Mobile-first approach

## 📚 Documentation

For detailed documentation, see the [docs folder](docs/):

- **[README.md](docs/README.md)**: Complete feature documentation
- API Reference (coming soon)
- Contributing Guide (coming soon)

## 🔧 Troubleshooting

### Audio Not Playing
- Ensure your browser supports the audio format
- Check if browser autoplay policy is blocking playback
- Verify the audio file is not corrupted

### Upload Not Working
- Check if the file format is supported (MP3, WAV, OGG)
- Ensure the file size is reasonable
- Try a different browser if issues persist

### Styling Issues
- Clear browser cache
- Ensure all CSS files are loaded
- Check browser console for errors

## 🌟 Future Enhancements

- [ ] Playlist management
- [ ] Audio equalizer
- [ ] Lyrics synchronization
- [ ] Dark/Light theme toggle
- [ ] Offline storage (LocalStorage/IndexedDB)
- [ ] Social sharing features
- [ ] Advanced visualizations
- [ ] Search functionality
- [ ] Drag & drop file upload

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Development

### Local Development

1. Open the project folder in your code editor
2. Make changes to HTML, CSS, or JavaScript files
3. Refresh the browser to see changes
4. Use browser developer tools for debugging

### Code Style

- Use 4 spaces for indentation
- Follow ES6+ JavaScript standards
- Use meaningful variable and function names
- Comment complex logic

## 🙏 Acknowledgments

- Google Fonts for the Poppins font family
- Inspiration from modern music streaming platforms
- The open-source community

## 📞 Support

If you encounter any issues or have questions:
- Check the [documentation](docs/README.md)
- Review the troubleshooting section
- Open an issue on GitHub

---

**Made with ❤️ | Enjoy your music! 🎶**
P.S.: This is a vibe coding project intended for fun =))) 
