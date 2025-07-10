#!/bin/bash

# Production build and run script
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Frontend Build ---
echo "--- Building Frontend ---"
cd frontend

# Clean install for production
echo "Clean installing frontend dependencies..."
rm -rf node_modules
npm ci  # Uses package-lock.json for reproducible builds

# Build the frontend application
echo "Running production build..."
npm run build

# Navigate back to the project root
cd ..
echo "--- Frontend Build Complete ---"

# --- Docker Compose Production ---
echo "--- Starting Docker Compose (Production) ---"

# Stop any running containers
docker compose down

# Build and start without override file
docker compose --no-override up --build -d

echo "--- Docker Compose Started ---"
echo "Application running in production mode at http://localhost:80"
echo "To view logs: docker compose logs -f"
