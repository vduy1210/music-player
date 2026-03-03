# 🚀 Deployment Guide - Vercel & Supabase

This guide will walk you through deploying your Music Player to Vercel with Supabase database and real-time features.

## Prerequisites

Before you start, make sure you have:
- [ ] A [GitHub](https://github.com) account
- [ ] A [Vercel](https://vercel.com) account (free tier is fine)
- [ ] A [Supabase](https://supabase.com) account (free tier is fine)

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: Music Player DB
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
4. Click **"Create new project"** (takes ~2 minutes)

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire content from `config/database-schema.sql`
3. Paste it into the SQL Editor
4. Click **"Run"** to execute

This will create:
- `tracks` table for storing music metadata
- `music-files` storage bucket for audio files
- All necessary policies and triggers
- Real-time subscriptions enabled

### 1.3 Get Your Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with https://)
   - **anon public** key

## Step 2: Configure Your Project

### 2.1 Update Environment Variables

1. Create a `.env` file in your project root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 2.2 Update index.html

Open `index.html` and update the database configuration:

```html
<script>
    window.SUPABASE_URL = 'https://your-project.supabase.co';
    window.SUPABASE_KEY = 'your-anon-key-here';
</script>
```

## Step 3: Push to GitHub

1. Initialize Git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit with database support"
   ```

2. Create a new repository on GitHub

3. Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/music-player.git
   git branch -M main
   git push -u origin main
   ```

## Step 4: Deploy to Vercel

### 4.1 Import Project

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub repository
4. Vercel will auto-detect settings

### 4.2 Configure Environment Variables

In the deployment settings:

1. Click **"Environment Variables"**
2. Add these variables:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Supabase URL
   
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase anon key

3. Click **"Deploy"**

### 4.3 Wait for Deployment

Vercel will:
- Build your project
- Deploy to a global CDN
- Provide you with a URL (e.g., `your-app.vercel.app`)

## Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Check the console for: `✅ Supabase initialized successfully`
3. Try adding a track using the **"+ Add Track"** button
4. Open your site in another browser/tab
5. Add a track and watch it appear in real-time! 🎉

## Step 6: Configure Storage (Optional)

### Allow Larger File Uploads

1. In Supabase dashboard, go to **Storage** → **music-files**
2. Click **Settings**
3. Adjust:
   - **Max file size**: 50 MB (or more)
   - **Allowed MIME types**: `audio/mpeg, audio/wav, audio/ogg`

## Real-time Features

Your deployment now includes:

✅ **Automatic Updates**: When someone adds a track, all users see it instantly
✅ **Live Sync**: Track changes propagate to all connected users
✅ **Cloud Storage**: Audio files stored in Supabase Storage
✅ **Global CDN**: Fast loading from anywhere in the world

## Troubleshooting

### Database Not Connecting

**Check:**
- Supabase credentials in `index.html` are correct
- Project URL starts with `https://`
- No typos in the anon key

### Real-time Not Working

**Check:**
- Row Level Security (RLS) policies are correctly set
- Real-time is enabled for the `tracks` table
- Browser console for connection errors

### File Upload Failing

**Check:**
- Storage bucket `music-files` exists
- Storage policies allow public upload
- File size is under the limit (default 50MB)

### Build Errors on Vercel

**Check:**
- All files are committed to Git
- `vercel.json` is in the root directory
- No syntax errors in JavaScript files

## Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Follow the instructions to point your domain to Vercel

## Monitoring

### Supabase Dashboard

Monitor your database:
- **Database**: View tables and data
- **Storage**: Check uploaded files
- **Logs**: See real-time connections
- **API**: Monitor usage

### Vercel Dashboard

Monitor your deployment:
- **Analytics**: See visitor stats
- **Logs**: View function logs
- **Performance**: Check load times

## Updating Your Site

When you make changes:

```bash
git add .
git commit -m "Update description"
git push
```

Vercel automatically redeploys! 🚀

## Security Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use Supabase anon key** (not service key) in frontend
3. **Configure RLS policies** properly for production
4. **Enable authentication** for sensitive operations
5. **Set file upload limits** in Supabase Storage

## Cost Estimate

**Free Tier Limits:**
- Vercel: 100 GB bandwidth/month
- Supabase: 500 MB database, 1 GB storage
- Both scale automatically

**This is perfect for personal projects or small communities!**

## Need Help?

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **GitHub Issues**: Open an issue in your repository

---

**Congratulations! Your music player is now live with real-time database support! 🎉🎵**
