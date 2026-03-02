# Icons

This directory contains the Chrome extension icons.

## Required Icons

- icon16.png - 16x16 (toolbar icon)
- icon48.png - 48x48 (extension page)
- icon128.png - 128x128 (Chrome Web Store)

## Creating Icons

You can create icons using any image editor (Photoshop, GIMP, Figma, Canva) or online tools:

1. **Tool推荐**: https://favicon.io/ or https://www.canva.com/
2. **Icon Design**:
   - Phone/call theme icon
   - Blue/purple gradient circle background (#667eea to #764ba2)
   - Green phone receiver symbol (#10b981)
   - Transparent background

3. **Export**: Save as PNG files with the sizes specified above

## Quick Generation (with ImageMagick)

```bash
# Install ImageMagick first: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)
cd ~/.openclaw/skills/suitecrm-dialer-chrome
./icons/create_icons.sh
```

## Placeholder Icons

As a temporary placeholder, you can use 1x1 transparent PNGs, but for production you should create proper icons.

To create placeholder transparent PNGs:
```bash
# macOS
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...' > icon16.png

# Or use a simple one-liner with ImageMagick when available
```
