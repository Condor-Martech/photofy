#!/bin/bash
# ponytail: gera 1 arquivo fixture sintetico (~75MB, 10s, vertical 4K30) simulando
# reel bruto de celular (iPhone 4K30 grava ~55-65Mbps). Sem acesso a reels reais do
# Condor neste ambiente -- ceiling do spike: achado usa sinal sintetico, nao real.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fixtures

OUT=fixtures/raw-reel-75mb.mp4
if [ -f "$OUT" ]; then
  echo "fixture ja existe: $OUT ($(du -h "$OUT" | cut -f1))"
  exit 0
fi

# Vertical 2160x3840 @30fps, 10s, ruido + padrao de teste para entropia alta
# (pior caso de compressao, parecido com grana/movimento real de video de celular).
ffmpeg -y \
  -f lavfi -i "testsrc2=size=2160x3840:rate=30:duration=10" \
  -f lavfi -i "anoisesrc=d=10:c=pink:r=48000:a=0.5" \
  -vf "noise=alls=25:allf=t+u" \
  -c:v libx264 -preset veryfast -b:v 58M -maxrate 60M -bufsize 30M -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  "$OUT"

echo "gerado: $OUT ($(du -h "$OUT" | cut -f1))"
