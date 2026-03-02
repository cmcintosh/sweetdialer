#!/bin/bash
# Simple script to generate icons using ImageMagick if available
# Alternative: use placeholder or create your own

cd "$(dirname "$0")"

# Check if ImageMagick is available
if command -v convert >/dev/null 2>>1; then
    # Create icons using ImageMagick
    
    # 16x16
    convert -size 16x16 xc:transparent \
        -fill "#667eea" -stroke "#764ba2" -strokewidth 1 \
        -draw "circle 8,8 8,3" \
        -fill "#10b981" -stroke "#059669" -strokewidth 0 \
        -draw "circle 8,8 10,8" \
        icon16.png
    
    # 48x48
    convert -size 48x48 xc:transparent \
        -fill "#667eea" -stroke "#764ba2" -strokewidth 2 \
        -draw "circle 24,24 24,6" \
        -fill "#10b981" -stroke "#059669" -strokewidth 0 \
        -draw "circle 24,24 30,24" \
        icon48.png
    
    # 128x128
    convert -size 128x128 xc:transparent \
        -fill "#667eea" -stroke "#764ba2" -strokewidth 3 \
        -draw "circle 64,64 64,16" \
        -fill "#10b981" -stroke "#059669" -strokewidth 0 \
        -draw "circle 64,64 80,64" \
        icon128.png
    
    echo "Icons generated successfully"
else
    echo "ImageMagick not found. Please install it or create icons manually."
    echo "Recommended icon sizes: 16x16, 48x48, 128x128"
    exit 1
fi
