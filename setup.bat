@echo off
REM SailorChat Setup Script for Windows

echo 🚀 Setting up SailorChat...

REM Install dependencies for shared types
echo 📦 Installing shared dependencies...
cd shared
call npm install
call npm run build
cd ..

REM Install API dependencies
echo 📦 Installing API dependencies...
cd api
call npm install
cd ..

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm install
cd ..

echo ✅ Dependencies installed successfully!
echo.
echo Next steps:
echo 1. Set up your Supabase project
echo 2. Copy .env.example to .env in both api/ and client/ directories
echo 3. Fill in your Supabase credentials in the .env files
echo 4. Run the database migration in your Supabase SQL editor
echo 5. Start the API server: cd api ^&^& npm run dev
echo 6. Start the client: cd client ^&^& npm run dev
echo.
echo 📚 Check README.md for detailed setup instructions

pause
