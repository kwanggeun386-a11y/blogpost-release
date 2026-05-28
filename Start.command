#!/bin/bash
# Start.command - Mac launcher (double-click in Finder to run)

cd "$(dirname "$0")"

echo ""
echo "======================================"
echo "  Blog Factory  - Starting"
echo "======================================"
echo ""

# Use pre-built Mac binary if available (no Node.js required)
if [ -f "./BlogFactory-mac" ]; then
  echo "  Mode: BlogFactory-mac  (standalone)"
  echo "  URL : http://localhost:3001"
  echo ""
  echo "  Press Ctrl+C or close this window to stop."
  echo ""
  # Open browser after 2 seconds
  (sleep 2 && open http://localhost:3001) &
  ./BlogFactory-mac
  exit 0
fi

# Fall back to Node.js
if ! command -v node &>/dev/null; then
  echo "  ERROR: Node.js not found."
  echo "  Install from: https://nodejs.org  (LTS version)"
  echo "  Or get BlogFactory-mac from the Releases page."
  echo ""
  read -p "  Press Enter to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "  Installing packages (first run only)..."
  npm install
  echo ""
fi

echo "  Mode: Node.js"
echo "  URL : http://localhost:3001"
echo ""
echo "  Press Ctrl+C or close this window to stop."
echo ""
(sleep 2 && open http://localhost:3001) &
node server/index.js
