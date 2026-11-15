#!/usr/bin/env bash
# Render a composition fast (75% scale on CPU) then upscale to 1080x1920 for posting.
# Usage: scripts/render.sh <CompositionId> <out-name>
set -e
comp=$1; name=${2:-$1}
mkdir -p out
npx remotion render "$comp" "out/.${name}-raw.mp4" --scale=0.75 --concurrency=4 --timeout=180000 --log=error
ffmpeg -v error -y -i "out/.${name}-raw.mp4" -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "out/${name}.mp4"
rm -f "out/.${name}-raw.mp4"
echo "out/${name}.mp4"
