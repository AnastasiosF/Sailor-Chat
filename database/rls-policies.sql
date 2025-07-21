-- Row Level Security (RLS) Policies
-- These policies ensure users can only access data they're authorized to see

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own profile and profiles of users they share chats with
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read profiles of chat participants" ON public.users
    FOR SELECT USING (
        id IN (
            SELECT DISTINCT cp.user_id
            FROM public.chat_participants cp
            WHERE cp.chat_id IN (
                SELECT cp2.chat_id
                FROM public.chat_participants cp2
                WHERE cp2.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Chats table policies
-- Users can read chats they participate in
CREATE POLICY "Users can read chats they participate in" ON public.chats
    FOR SELECT USING (
        id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid()
        )
    );

-- Users can discover public chats for search/join functionality
CREATE POLICY "Users can discover public chats" ON public.chats
    FOR SELECT USING (
        is_private = FALSE 
        AND type = 'group'
    );

CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat admins can update chat info" ON public.chats
    FOR UPDATE USING (
        id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Chat participants table policies
-- Users can read participants of chats they're in
CREATE POLICY "Users can read participants of their chats" ON public.chat_participants
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chat participants" ON public.chat_participants
    FOR INSERT WITH CHECK (
        -- User can add themselves to any chat (will be controlled by API)
        user_id = auth.uid()
        OR
        -- Chat admin can add others
        chat_id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Users can update own participation" ON public.chat_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Chat admins can update participant settings" ON public.chat_participants
    FOR UPDATE USING (
        chat_id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Users can leave chats" ON public.chat_participants
    FOR DELETE USING (
        user_id = auth.uid()
        OR
        chat_id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Messages table policies
-- Users can read messages from chats they participate in
CREATE POLICY "Users can read messages from their chats" ON public.messages
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their chats" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND
        chat_id IN (
            SELECT chat_id
            FROM public.chat_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own messages" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages" ON public.messages
    FOR DELETE USING (auth.uid() = sender_id);

-- Message reactions table policies
-- Users can read reactions on messages they can see
CREATE POLICY "Users can read reactions on accessible messages" ON public.message_reactions
    FOR SELECT USING (
        message_id IN (
            SELECT id
            FROM public.messages
            WHERE chat_id IN (
                SELECT chat_id
                FROM public.chat_participants
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can add reactions" ON public.message_reactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND
        message_id IN (
            SELECT id
            FROM public.messages
            WHERE chat_id IN (
                SELECT chat_id
                FROM public.chat_participants
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can remove own reactions" ON public.message_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- User sessions table policies
-- Users can only access their own sessions
CREATE POLICY "Users can read own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create service role policies for API access
-- These allow the API (using service role) to perform operations on behalf of users

-- Service role can read all data (for API operations)
CREATE POLICY "Service role can read all users" ON public.users
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can read all chats" ON public.chats
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can manage all chats" ON public.chats
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can read all participants" ON public.chat_participants
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can manage all participants" ON public.chat_participants
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can read all messages" ON public.messages
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can manage all messages" ON public.messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can read all reactions" ON public.message_reactions
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Service role can manage all reactions" ON public.message_reactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
