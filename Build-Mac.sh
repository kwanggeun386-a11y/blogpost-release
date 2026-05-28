#!/bin/bash
# Build-Mac.sh - Builds Mac standalone app only.
# Windows EXE is built by GitHub Actions on windows-latest.
# Requires: Node.js https://nodejs.org

set -e

print_line() {
  echo "====================================================="
}

echo ""
print_line
echo "  Blog Factory - Mac Build"
print_line
echo ""

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found."
  echo "Install LTS from: https://nodejs.org"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "ERROR: npm not found."
  exit 1
fi

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  MAC_TARGET="node22-macos-arm64"
else
  MAC_TARGET="node22-macos-x64"
fi

echo "  Mac architecture : $ARCH"
echo "  pkg target       : $MAC_TARGET"
echo ""

echo "[1/5] Installing packages..."
npm ci

echo ""
echo "[2/5] Building React client..."
cd client
npm ci
npm run build
cd ..

echo ""
echo "[3/5] Bundling BlogFactory-mac..."
npx pkg . --targets "$MAC_TARGET" --output BlogFactory-mac

echo ""
echo "[4/5] Assembling dist folder..."
if [ -d "dist/data" ]; then
  TMP_DATA_BACKUP=$(mktemp -d)
  cp -R dist/data "$TMP_DATA_BACKUP/data"
else
  TMP_DATA_BACKUP=""
fi

rm -rf dist
mkdir -p dist/client
cp BlogFactory-mac dist/BlogFactory-mac
cp -r client/dist dist/client/dist
cp Start.command dist/Start.command
if [ -n "$TMP_DATA_BACKUP" ] && [ -d "$TMP_DATA_BACKUP/data" ]; then
  cp -R "$TMP_DATA_BACKUP/data" dist/data
  rm -rf "$TMP_DATA_BACKUP"
else
  mkdir -p dist/data
fi
chmod +x dist/BlogFactory-mac dist/Start.command

echo ""
print_line
echo "  Mac build complete."
echo ""
echo "  Run: dist/Start.command"
echo ""
echo "  Windows EXE is built by GitHub Actions."
print_line
echo ""
