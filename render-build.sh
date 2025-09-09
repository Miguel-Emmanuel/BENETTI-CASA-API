#!/usr/bin/env bash
# Build script for Render

echo "🚀 Starting Render build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build

# Run migrations
echo "🗄️ Running database migrations..."
npm run migrate

echo "✅ Build completed successfully!"
