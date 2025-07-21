# 🗄️ Database Setup Guide

## Prerequisites

- A Supabase account (free tier is sufficient for development)
- Access to your Supabase project dashboard

## Step-by-Step Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **"New Project"**
4. Choose your organization
5. Fill in project details:
   - **Name**: `SailorChat` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
6. Click **"Create new project"**
7. Wait 2-3 minutes for the project to initialize

### 2. Access SQL Editor

1. In your Supabase dashboard, navigate to **SQL Editor** in the left sidebar
2. You'll see the SQL query interface

### 3. Run Database Scripts (IMPORTANT: Follow this exact order!)

#### Script 1: Create Schema and Tables
1. Open the file `database/schema.sql` from your project
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **"Run"** button
5. ✅ Verify: You should see "Success. No rows returned" message

**What this does:**
- Creates all database tables (users, chats, messages, etc.)
- Sets up indexes for performance
- Creates custom functions for chat management
- Sets up triggers for automatic updates

#### Script 2: Apply Security Policies
1. Open the file `database/rls-policies.sql` from your project
2. Copy the entire contents
3. Paste into the SQL Editor (clear previous query first)
4. Click **"Run"** button
5. ✅ Verify: You should see "Success. No rows returned" message

**What this does:**
- Enables Row Level Security (RLS) on all tables
- Creates security policies to control data access
- Sets up service role permissions for API access

#### Script 3: Final Setup and Configuration
1. Open the file `database/migration.sql` from your project
2. Copy the entire contents
3. Paste into the SQL Editor (clear previous query first)
4. Click **"Run"** button
5. ✅ Verify: You should see "Success. No rows returned" message

**What this does:**
- Creates system user for system messages
- Sets up automatic user profile creation trigger
- Enables real-time subscriptions for live updates

### 4. Verify Database Setup

#### Check Tables
1. Go to **Database** > **Tables** in the left sidebar
2. You should see these tables:
   - ✅ `users`
   - ✅ `chats`
   - ✅ `chat_participants`
   - ✅ `messages`
   - ✅ `message_reactions`
   - ✅ `user_sessions`

#### Check Authentication
1. Go to **Authentication** > **Settings**
2. The default settings should be fine for development

#### Enable Realtime (Important!)
1. Go to **Database** > **Replication**
2. Look for the tables section
3. Enable replication for these tables (toggle the switch):
   - ✅ `users`
   - ✅ `chats` 
   - ✅ `chat_participants`
   - ✅ `messages`
   - ✅ `message_reactions`

### 5. Get Your Project Credentials

1. Go to **Settings** > **API**
2. Copy these values to your `.env` files:

**Project URL:**
```
https://your-project-id.supabase.co
```

**API Keys:**
- **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIs...`)
- **service_role key** (starts with `eyJhbGciOiJIUzI1NiIs...`) ⚠️ Keep this secret!

### 6. Update Environment Variables

**API (.env):**
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Client (.env):**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Testing Your Database Setup

### Test 1: Start the API
```bash
cd api
npm run dev
```
- ✅ Should start without errors
- ✅ Visit http://localhost:3001/api/health
- ✅ Should return success message

### Test 2: Test User Registration
1. Start the client: `cd client && npm run dev`
2. Visit http://localhost:3000
3. Try to register a new user
4. ✅ Registration should work
5. ✅ Check Supabase **Authentication** > **Users** - you should see the new user

### Test 3: Check Database
1. Go to **Database** > **Table Editor**
2. Click on `users` table
3. ✅ You should see your registered user with auto-generated profile

## Common Issues & Solutions

### ❌ "relation does not exist" error
**Solution:** You didn't run `schema.sql` first or it failed
- Re-run the schema.sql script
- Check for any error messages in the SQL Editor

### ❌ "permission denied" error
**Solution:** RLS policies not applied correctly
- Make sure you ran `rls-policies.sql` after `schema.sql`
- Check that all policies were created successfully

### ❌ "Missing Supabase configuration" error
**Solution:** Environment variables not set correctly
- Double-check your `.env` files
- Make sure you copied the exact URLs and keys from Supabase dashboard
- Restart your development servers after changing `.env`

### ❌ User registration fails
**Solution:** Check trigger setup
- Make sure you ran `migration.sql` last
- Check **SQL Editor** > **History** for any failed queries

## Advanced: Manual Database Reset

If you need to start over:

```sql
-- WARNING: This will delete ALL data!
-- Run in SQL Editor to reset everything

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

Then re-run all three scripts in order.

## Production Considerations

### Security Checklist
- ✅ Use strong database password
- ✅ Enable 2FA on Supabase account
- ✅ Use environment-specific projects (dev/staging/prod)
- ✅ Regular database backups
- ✅ Monitor database performance

### Performance Tips
- Consider adding more indexes for frequently queried columns
- Monitor query performance in Supabase dashboard
- Set up database monitoring and alerts
- Regular maintenance and optimization

## Next Steps

Once your database is set up:
1. Test the complete application flow
2. Start customizing the UI
3. Add additional features
4. Set up production environment

Your SailorChat database is now ready for secure, real-time messaging! 🚀
