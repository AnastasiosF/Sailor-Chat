#!/bin/bash

# SailorChat Setup Script
echo "🚀 Setting up SailorChat..."

# Install dependencies for shared types
echo "📦 Installing shared dependencies..."
cd shared
npm install
npm run build
cd ..

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

echo "✅ Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up your Supabase project"
echo "2. Copy .env.example to .env in both api/ and client/ directories"
echo "3. Fill in your Supabase credentials in the .env files"
echo "4. Run the database migration in your Supabase SQL editor"
echo "5. Start the API server: cd api && npm run dev"
echo "6. Start the client: cd client && npm run dev"
echo ""
echo "📚 Check README.md for detailed setup instructions"
