# 🔧 Environment Configuration Guide

## ✅ .env Files Created

I've created `.env` files for all projects with placeholder values. You need to replace the Supabase placeholders with your actual credentials.

## 📋 Required Supabase Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

### 2. Get Your Credentials
Go to **Settings > API** in your Supabase dashboard and copy:

- **Project URL**: `https://your-project-ref.supabase.co`
- **Anon (public) key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ Keep this secret!)

### 3. Update .env Files

**API (.env file):**
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
```

**Client (.env file):**
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

## 🗄️ Database Setup

### 1. Run Database Migrations
In your Supabase dashboard, go to **SQL Editor** and run these files in order:

1. **schema.sql** - Creates all tables and functions
2. **rls-policies.sql** - Sets up security policies
3. **migration.sql** - Final setup and triggers

### 2. Verify Setup
After running the migrations, you should see these tables in **Database > Tables**:
- users
- chats
- chat_participants
- messages
- message_reactions
- user_sessions

## 🔐 Security Notes

- **Never commit** the actual `.env` files to version control
- The `.env.example` files are safe to commit (they contain no secrets)
- Keep your **service role key** secret - it bypasses all security rules
- Change the **JWT_SECRET** to a random 32+ character string in production

## ✅ Test Your Setup

1. Start the API: `cd api && npm run dev`
2. Start the client: `cd client && npm run dev`
3. Visit http://localhost:3000
4. Try registering a new user

If everything works, you're ready to start developing! 🚀

## 🆘 Troubleshooting

**"Missing Supabase configuration" error:**
- Check that all Supabase environment variables are set correctly
- Verify your project URL and keys are correct

**Database connection errors:**
- Ensure you've run all the database migrations
- Check that your service role key has the right permissions

**CORS errors:**
- Verify `CLIENT_URL` in API `.env` matches your client URL
- Check `CORS_ORIGINS` includes your client URL
