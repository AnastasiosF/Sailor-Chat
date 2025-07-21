-- Migration script to add is_private field to existing chats table
-- Run this if you already have an existing database

-- Add the is_private column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chats' 
        AND column_name = 'is_private'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.chats ADD COLUMN is_private BOOLEAN DEFAULT TRUE;
        
        -- Update existing group chats to be public by default (you can adjust this logic)
        -- Direct messages should remain private
        UPDATE public.chats 
        SET is_private = FALSE 
        WHERE type = 'group';
        
        RAISE NOTICE 'Added is_private column to chats table';
    ELSE
        RAISE NOTICE 'is_private column already exists in chats table';
    END IF;
END $$;
