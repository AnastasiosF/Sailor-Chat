-- Migration: Initial schema and RLS setup
-- Run this script in your Supabase SQL editor

-- First, run the schema creation
-- schema.sql

-- Then, run the RLS policies
-- rls-policies.sql

-- Create default system user for system messages
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    phone_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_change_sent_at,
    email_change_sent_at,
    confirmation_sent_at,
    recovery_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'system@sailorchat.app',
    NOW(),
    NULL,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    NULL,
    '{"provider":"system","providers":["system"]}',
    '{"display_name":"System"}',
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (id) DO NOTHING;

-- Insert system user into public.users
INSERT INTO public.users (
    id,
    username,
    display_name,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system',
    'System',
    'online'
) ON CONFLICT (id) DO NOTHING;

-- Create a function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username_attempt TEXT;
    username_counter INTEGER := 0;
    final_username TEXT;
BEGIN
    -- Generate a base username from email
    username_attempt := LOWER(SPLIT_PART(NEW.email, '@', 1));

    -- Remove non-alphanumeric characters
    username_attempt := REGEXP_REPLACE(username_attempt, '[^a-zA-Z0-9_]', '', 'g');

    -- Ensure minimum length
    IF LENGTH(username_attempt) < 3 THEN
        username_attempt := 'user_' || username_attempt;
    END IF;

    -- Find a unique username
    final_username := username_attempt;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
        username_counter := username_counter + 1;
        final_username := username_attempt || '_' || username_counter;
    END LOOP;

    -- Create user profile
    INSERT INTO public.users (
        id,
        username,
        display_name,
        status
    ) VALUES (
        NEW.id,
        final_username,
        COALESCE(NEW.raw_user_meta_data->>'display_name', final_username),
        'offline'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
