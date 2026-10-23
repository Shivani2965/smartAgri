#!/usr/bin/env bash
# SmartAgri Control Center - Automated Setup Script
# Works on Linux, macOS, WSL, and Git Bash

set -e

echo "=========================================================="
echo "      🌱 SmartAgri Control Center - Setup Script          "
echo "=========================================================="
echo ""

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Please install Node.js 18 or newer from https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Found Node.js version: $NODE_VERSION"

# 2. Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is not installed. Please ensure npm is in your PATH."
  exit 1
fi

echo "✅ Found npm version: $(npm -v)"
echo ""

# 3. Install Frontend dependencies
echo "📦 [1/2] Installing frontend dependencies..."
npm install
echo "✅ Frontend dependencies installed successfully!"
echo ""

# 4. Install Server Bridge dependencies
echo "📦 [2/2] Installing serial bridge dependencies in /server..."
if [ -d "server" ]; then
  cd server
  npm install
  cd ..
  echo "✅ Server bridge dependencies installed successfully!"
else
  echo "⚠️ 'server' directory not found, skipping bridge installation."
fi

echo ""
echo "=========================================================="
echo "🎉 Setup completed successfully!"
echo "=========================================================="
echo ""
echo "Next steps:"
echo "1. Connect your Arduino UNO via USB (or pair HC-05 Bluetooth)."
echo "2. Check your COM/Serial port (e.g. COM3, COM5 on Windows or /dev/ttyACM0 on Linux/Mac)."
echo "3. Open server/index.js to verify the SERIAL_PORT setting (or set SERIAL_PORT=COM5)."
echo "4. In Terminal 1, run the Serial Bridge:"
echo "     npm run bridge"
echo "5. In Terminal 2, run the Web Dashboard:"
echo "     npm run dev"
echo ""
echo "Or use the built-in 'Simulate Arduino feed' button in the dashboard to test instantly without hardware!"
echo "=========================================================="
