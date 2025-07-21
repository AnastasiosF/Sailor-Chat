# 📋 Database Script Execution Order

## ⚠️ CRITICAL: Run scripts in this EXACT order!

### 1. First: Create Tables and Functions
**File:** `database/schema.sql`
**Purpose:** Creates all database tables, indexes, and functions
**Run this:** FIRST

### 2. Second: Apply Security Policies  
**File:** `database/rls-policies.sql`
**Purpose:** Sets up Row Level Security and access controls
**Run this:** AFTER schema.sql

### 3. Third: Final Configuration
**File:** `database/migration.sql`
**Purpose:** Creates system user, triggers, and enables realtime
**Run this:** LAST

## Quick Copy-Paste Instructions

### In Supabase SQL Editor:

**Step 1 - Schema:**
```sql
-- Copy entire contents of database/schema.sql and paste here
-- Click RUN
```

**Step 2 - Security:**
```sql
-- Copy entire contents of database/rls-policies.sql and paste here  
-- Click RUN
```

**Step 3 - Migration:**
```sql
-- Copy entire contents of database/migration.sql and paste here
-- Click RUN
```

## ✅ Verification Checklist

After running all scripts:
- [ ] All tables created (users, chats, messages, etc.)
- [ ] RLS enabled on all tables
- [ ] System user exists in users table
- [ ] Realtime enabled for message tables
- [ ] Test user registration works
- [ ] API connects without errors

## 🚨 If Something Goes Wrong

**Reset everything and start over:**
```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

Then re-run all 3 scripts in order.

## 📖 Need Help?

See the detailed guide: `DATABASE_SETUP.md`
