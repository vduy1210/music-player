# Custom Fonts

Place custom font files in this directory if you want to use local fonts instead of web fonts.

## Currently Using

- **Google Fonts**: Poppins (loaded from CDN)

## Adding Custom Fonts

### 1. Add Font Files

Place your font files here:
```
fonts/
├── Poppins-Regular.woff2
├── Poppins-Bold.woff2
├── Poppins-SemiBold.woff2
└── ...
```

### 2. Update CSS

Add font-face declarations in `assets/css/style.css`:

```css
@font-face {
    font-family: 'Poppins';
    src: url('../fonts/Poppins-Regular.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Poppins';
    src: url('../fonts/Poppins-Bold.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
}
```

### 3. Remove Google Fonts Link

Remove this line from `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

## Recommended Font Formats

- **WOFF2** - Best compression, modern browsers (recommended)
- **WOFF** - Good fallback for older browsers
- **TTF/OTF** - Original formats, larger file size

## Font Loading Performance

For better performance:
- Use `font-display: swap` to avoid FOIT (Flash of Invisible Text)
- Subset fonts to include only needed characters
- Preload critical fonts
- Use WOFF2 format for smaller file sizes
