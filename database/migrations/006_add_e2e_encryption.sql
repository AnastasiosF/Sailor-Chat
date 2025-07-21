-- E2E Encryption Database Schema Migration
-- This adds support for end-to-end encrypted messaging

-- Add encryption-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key_encryption TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key_signing TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_private_keys TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS key_salt TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS key_nonce TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS key_derivation_iterations INTEGER DEFAULT 100000;

-- Add encryption columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ephemeral_public_key TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_signature TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_nonce TEXT;

-- Create index for better performance on encrypted message queries
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted);
CREATE INDEX IF NOT EXISTS idx_messages_chat_encrypted ON messages(chat_id, is_encrypted);

-- Create table for key exchange sessions
CREATE TABLE IF NOT EXISTS key_exchange_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    initiator_ephemeral_public_key TEXT NOT NULL,
    recipient_ephemeral_public_key TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    
    UNIQUE(initiator_id, recipient_id, chat_id),
    
    CONSTRAINT valid_participants CHECK (initiator_id != recipient_id)
);

-- Create indexes for key exchange sessions
CREATE INDEX IF NOT EXISTS idx_key_exchange_initiator ON key_exchange_sessions(initiator_id);
CREATE INDEX IF NOT EXISTS idx_key_exchange_recipient ON key_exchange_sessions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_key_exchange_chat ON key_exchange_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_key_exchange_status ON key_exchange_sessions(status);
CREATE INDEX IF NOT EXISTS idx_key_exchange_expires ON key_exchange_sessions(expires_at);

-- Create table for device management (for multi-device support)
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_fingerprint VARCHAR(64) NOT NULL UNIQUE,
    public_key_encryption TEXT NOT NULL,
    public_key_signing TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, device_fingerprint)
);

-- Create indexes for user devices
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);

-- Update RLS policies for new tables

-- Key exchange sessions policies
ALTER TABLE key_exchange_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own key exchange sessions" ON key_exchange_sessions
    FOR SELECT USING (
        auth.uid() = initiator_id OR 
        auth.uid() = recipient_id
    );

CREATE POLICY "Users can create key exchange sessions" ON key_exchange_sessions
    FOR INSERT WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Recipients can update key exchange sessions" ON key_exchange_sessions
    FOR UPDATE USING (auth.uid() = recipient_id);

-- User devices policies
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices" ON user_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own devices" ON user_devices
    FOR ALL USING (auth.uid() = user_id);

-- Update messages policies to handle encrypted messages
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;

CREATE POLICY "Users can view messages in their chats" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_participants.chat_id = messages.chat_id 
            AND chat_participants.user_id = auth.uid()
        )
    );

-- Add policy for encrypted message content access
CREATE POLICY "Users can access encrypted message content" ON messages
    FOR SELECT USING (
        (is_encrypted = FALSE) OR 
        (is_encrypted = TRUE AND EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_participants.chat_id = messages.chat_id 
            AND chat_participants.user_id = auth.uid()
        ))
    );

-- Function to automatically expire old key exchange sessions
CREATE OR REPLACE FUNCTION cleanup_expired_key_exchange_sessions()
RETURNS void AS $$
BEGIN
    UPDATE key_exchange_sessions 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired sessions (if pg_cron is available)
-- SELECT cron.schedule('cleanup-key-exchanges', '*/5 * * * *', 'SELECT cleanup_expired_key_exchange_sessions();');

COMMENT ON TABLE key_exchange_sessions IS 'Stores ephemeral key exchange data for establishing E2E encryption';
COMMENT ON TABLE user_devices IS 'Manages multiple devices per user for E2E encryption';
COMMENT ON COLUMN users.public_key_encryption IS 'Users public key for ECDH key exchange';
COMMENT ON COLUMN users.public_key_signing IS 'Users public key for message signing/verification';
COMMENT ON COLUMN users.encrypted_private_keys IS 'Password-encrypted private keys';
COMMENT ON COLUMN messages.is_encrypted IS 'Whether this message is end-to-end encrypted';
COMMENT ON COLUMN messages.encrypted_content IS 'Encrypted message content (replaces plain content when encrypted)';
COMMENT ON COLUMN messages.ephemeral_public_key IS 'Ephemeral public key used for this message encryption';
