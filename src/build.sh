#!/bin/sh
# Rebuilds ../index.html from the source files. Needs Node.js.
# First time only: npm install
cd "$(dirname "$0")"
npx esbuild game.js --bundle --minify --format=iife --outfile=out.js --log-level=warning
node -e "const fs=require('fs');const t=fs.readFileSync('template.html','utf8');const b=fs.readFileSync('out.js','utf8').replace(/<\/script/g,'<\\\\/script');fs.writeFileSync('../index.html',t.replace('/*BUNDLE*/',()=>b));fs.unlinkSync('out.js')"
echo "Built index.html"
