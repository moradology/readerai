#!/bin/bash

# Development build and run script
# Uses docker-compose.override.yml for hot reloading
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Frontend Build ---
echo "--- Building Frontend ---"
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Node modules not found. Running npm install..."
  npm install
else
  echo "Node modules found. Skipping npm install."
fi

# Build the frontend application
echo "Running npm run build..."
npm run build

# Navigate back to the project root
cd ..
echo "--- Frontend Build Complete ---"

# --- Docker Compose ---
echo "--- Starting Docker Compose ---"

# Build images (if necessary) and start services in detached mode
docker compose up --build -d

echo "--- Docker Compose Started ---"
echo "Application should be available at http://localhost:80"
