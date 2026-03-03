# Contributing to Music Player

First off, thank you for considering contributing to this music player project! 🎵

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Browser and OS** information

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- **Clear description** of the feature
- **Why this would be useful** to most users
- **Possible implementation** approach

### Pull Requests

1. **Fork** the repository
2. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Make your changes** following our code style
4. **Test** your changes thoroughly
5. **Commit** with clear messages:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
6. **Push** to your branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
7. **Open a Pull Request**

## Code Style Guidelines

### JavaScript
- Use ES6+ features
- 4 spaces for indentation
- Meaningful variable names
- Add comments for complex logic
- Use const/let, avoid var

```javascript
// Good
const playButton = document.querySelector('.play-btn');

// Bad
var btn = document.querySelector('.play-btn');
```

### CSS
- Use CSS variables for colors
- Mobile-first approach
- Use flexbox/grid for layouts
- Meaningful class names

```css
/* Good */
.player-controls {
    display: flex;
    gap: 1rem;
}

/* Bad */
.pc {
    display: flex;
}
```

### HTML
- Semantic HTML5 elements
- Proper indentation
- Alt text for images
- ARIA labels for accessibility

## Project Structure

When adding new features, maintain the project structure:

```
assets/
├── css/        # Stylesheets
├── js/         # JavaScript
├── images/     # Images
├── audio/      # Audio files
└── fonts/      # Fonts
```

## Testing

- Test on multiple browsers (Chrome, Firefox, Safari)
- Test responsive design on different screen sizes
- Check console for errors
- Verify accessibility

## Commit Message Guidelines

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests

Examples:
```
feat: Add playlist functionality
fix: Resolve audio playback issue on Safari
docs: Update installation instructions
style: Format CSS with proper indentation
```

## Questions?

Feel free to open an issue for any questions!

Thank you for contributing! 🎉
