# 🎵 Music Player - Database & Real-time Setup Guide (Tiếng Việt)

Hướng dẫn đầy đủ để thiết lập database và real-time cho Music Player.

## 📚 Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Thiết lập Supabase](#thiết-lập-supabase)
3. [Kết nối với website](#kết-nối-với-website)
4. [Deploy lên Vercel](#deploy-lên-vercel)
5. [Test real-time](#test-real-time)
6. [Troubleshooting](#troubleshooting)

## Giới thiệu

Hệ thống này sử dụng:
- **Supabase**: Database PostgreSQL + Storage + Real-time
- **Vercel**: Hosting miễn phí với CDN toàn cầu
- **Real-time Updates**: Tự động cập nhật khi có thay đổi

### Lợi ích:
✅ Lưu trữ nhạc trên cloud (không giới hạn người dùng)
✅ Cập nhật real-time (không cần refresh)
✅ Multi-user: nhiều người cùng xem và thêm nhạc
✅ Miễn phí hoàn toàn với Supabase & Vercel free tier

## Thiết lập Supabase

### Bước 1: Tạo tài khoản Supabase

1. Truy cập: https://supabase.com
2. Click **"Start your project"**
3. Đăng ký bằng GitHub hoặc email
4. Xác nhận email

### Bước 2: Tạo Project mới

1. Click **"New Project"**
2. Điền thông tin:
   - **Name**: Music Player (hoặc tên bạn thích)
   - **Database Password**: Tạo password mạnh (lưu lại!)
   - **Region**: Chọn **Southeast Asia (Singapore)** (gần Việt Nam nhất)
   - **Pricing Plan**: Free (đủ dùng)
3. Click **"Create new project"**
4. Đợi ~2 phút để khởi tạo

### Bước 3: Chạy Database Schema

1. Sau khi project sẵn sàng, vào **SQL Editor** (menu bên trái)
2. Mở file `config/database-schema.sql` trong project
3. Copy toàn bộ nội dung
4. Paste vào SQL Editor của Supabase
5. Click **"Run"** (hoặc Ctrl+Enter)

Màn hình sẽ hiện: "Success. No rows returned"

### Bước 4: Lấy API Keys

1. Vào **Settings** → **API** (menu bên trái)
2. Copy 2 giá trị này:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (key rất dài)

⚠️ **Lưu ý**: Chỉ dùng **anon public** key, KHÔNG dùng service_role key!

### Bước 5: Kiểm tra Storage

1. Vào **Storage** (menu bên trái)
2. Bạn sẽ thấy bucket **"music-files"** đã được tạo
3. Click vào để xem settings
4. Đảm bảo **Public bucket** được bật

## Kết nối với website

### Cách 1: Test local trước

1. Mở file `assets/js/supabase-keys.js`
2. Thay thế bằng thông tin Supabase của bạn:
   ```javascript
   window.SUPABASE_URL = 'https://xxxxx.supabase.co';
   window.SUPABASE_KEY = 'eyJhbGc...';
   ```

3. File này đã được ignore bởi `.gitignore` nên sẽ **không bị push lên GitHub**
4. Mở `index.html` bằng trình duyệt
5. Mở Console (F12)
6. Nếu thành công, bạn sẽ thấy:
   ```
   ✅ Supabase initialized successfully
   📚 Loaded X tracks from database
   ```

### Cách 2: Tạo file .env (cho development)

1. Copy file `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```

2. Sửa file `.env`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   ```

## Deploy lên Vercel

### Bước 1: Đẩy code lên GitHub

1. Tạo repository mới trên GitHub
2. Chạy lệnh:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/music-player.git
   git push -u origin main
   ```

⚠️ **Lưu ý**: File `.env` và `assets/js/supabase-keys.js` đã được `.gitignore` nên **sẽ không bị push lên GitHub**. API keys của bạn sẽ được bảo mật!

### Bước 2: Import vào Vercel

1. Truy cập: https://vercel.com
2. Đăng nhập bằng GitHub
3. Click **"Add New..."** → **"Project"**
4. Chọn repository của bạn
5. Click **"Import"**

### Bước 3: Thêm Environment Variables

Trong màn hình deployment:

1. Click **"Environment Variables"**
2. Thêm 2 biến (nhập **trực tiếp giá trị**, KHÔNG dùng @secret):
   
   **Variable 1:**
   - Name: `SUPABASE_URL`
   - Value: `https://xxxxx.supabase.co` (dán trực tiếp URL của bạn)
   
   **Variable 2:**
   - Name: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGc...` (dán trực tiếp anon key của bạn)

3. Click **"Deploy"**

⚠️ **Quan trọng**: 
- Nhập **trực tiếp** giá trị URL và Key, **KHÔNG** dùng dạng `@secret-name`
- Tên biến là `SUPABASE_URL` và `SUPABASE_ANON_KEY` (không có prefix `NEXT_PUBLIC_`)

### Bước 4: Đợi deploy

- Vercel sẽ build và deploy (~1-2 phút)
- Sau khi xong, bạn sẽ có link: `https://your-app.vercel.app`
- Click vào link để xem website

## Test Real-time

### Test 1: Upload nhạc

1. Mở website trên trình duyệt
2. Click **"Library"**
3. Click **"+ Add Track"**
4. Chọn file nhạc MP3
5. Đợi upload (~5-10 giây)
6. Bài hát sẽ xuất hiện trong danh sách

### Test 2: Real-time sync

1. Mở website trên 2 tab/trình duyệt khác nhau
2. Ở tab 1: Upload một bài hát mới
3. Ở tab 2: Bạn sẽ thấy:
   - Notification hiện lên: "🎵 New track added: ..."
   - Bài hát tự động xuất hiện (KHÔNG cần F5!)

### Test 3: Multi-user

1. Gửi link cho bạn bè
2. Khi họ thêm nhạc, bạn sẽ thấy ngay lập tức
3. Tất cả mọi người đều thấy cùng một thư viện nhạc

## Troubleshooting

### Lỗi: "Database not initialized"

**Nguyên nhân**: Sai URL hoặc Key

**Giải pháp**:
1. Kiểm tra lại URL (phải có `https://`)
2. Kiểm tra lại Key (không có khoảng trắng thừa)
3. Đảm bảo dùng **anon** key, không phải service_role

### Lỗi: "Failed to upload"

**Nguyên nhân**: Storage bucket chưa được tạo hoặc không public

**Giải pháp**:
1. Vào Supabase → Storage
2. Kiểm tra bucket "music-files" có tồn tại
3. Vào Settings của bucket, bật "Public bucket"
4. Chạy lại SQL script từ `database-schema.sql`

### Real-time không hoạt động

**Nguyên nhân**: Chưa enable real-time cho table

**Giải pháp**:
1. Vào Supabase → Database → Replication
2. Tìm table "tracks"
3. Bật "Enable Realtime"

### Upload file quá lớn

**Giải pháp**:
1. Vào Supabase → Storage → music-files → Settings
2. Tăng "Max file size" lên 50MB hoặc 100MB
3. Nén file nhạc trước khi upload

### Website không load sau deploy

**Giải pháp**:
1. Kiểm tra Vercel Deployment Logs
2. Đảm bảo tất cả file đã được commit
3. Check Environment Variables trong Vercel đã đúng

## Tips & Tricks

### 1. Thêm sample data

Vào SQL Editor và chạy:
```sql
INSERT INTO tracks (title, artist, duration, audio_url)
VALUES 
  ('Bài hát mẫu 1', 'Ca sĩ A', '3:45', 'https://example.com/song1.mp3'),
  ('Bài hát mẫu 2', 'Ca sĩ B', '4:20', 'https://example.com/song2.mp3');
```

### 2. Xem database realtime

1. Vào Supabase → Table Editor
2. Mở table "tracks"
3. Mỗi khi có update, table tự động refresh

### 3. Monitor usage

1. Vào Supabase → Reports
2. Xem:
   - Database size
   - Storage usage
   - API requests

### 4. Backup database

1. Vào Supabase → Database → Backups
2. Free tier có daily backup tự động
3. Có thể restore bất cứ lúc nào

## Câu hỏi thường gặp

**Q: Free tier có đủ không?**
A: Đủ! Supabase free: 500MB DB + 1GB Storage. Vercel free: 100GB bandwidth/tháng.

**Q: Có thể dùng database khác không?**
A: Có thể dùng Firebase, MongoDB, v.v. Nhưng Supabase đã tích hợp sẵn real-time.

**Q: Upload nhạc có vi phạm bản quyền không?**
A: Chỉ upload nhạc bạn có quyền. Dùng cho mục đích cá nhân/học tập.

**Q: Có thể thêm authentication không?**
A: Có! Supabase có sẵn Auth. Xem docs: https://supabase.com/docs/guides/auth

**Q: Làm sao để website nhanh hơn?**
A: Vercel tự động deploy lên CDN toàn cầu. Website đã rất nhanh!

## Hỗ trợ

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Issues**: Mở issue trong repo

---

**Chúc bạn thành công! 🎉🎵**
