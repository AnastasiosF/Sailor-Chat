// Database entity types
export type UserStatus = 'online' | 'away' | 'busy' | 'offline';
export type MessageType = 'text' | 'image' | 'file' | 'system';
export type ChatType = 'direct' | 'group';

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: UserStatus;
  last_seen: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  public_key_encryption?: string;
  public_key_signing?: string;
  encrypted_private_keys?: string;
  key_salt?: string;
  key_nonce?: string;
  key_derivation_iterations?: number;
}

export interface Chat {
  id: string;
  name?: string;
  description?: string;
  type: ChatType;
  avatar_url?: string;
  is_private?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  is_admin: boolean;
  is_muted: boolean;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: string;
  edited_at?: string;
  created_at: string;
  is_encrypted?: boolean;
  encrypted_content?: string;
  ephemeral_public_key?: string;
  message_signature?: string;
  message_nonce?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_info?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

// API Request/Response types
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
  device_info?: Record<string, any>;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  display_name: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface VerifyEmailRequest {
  token: string;
  type: 'signup' | 'email_change';
}

export interface ResendVerificationRequest {
  email: string;
}

export interface SendMessageRequest {
  chat_id: string;
  content: string;
  type?: MessageType;
  reply_to_id?: string;
}

export interface CreateChatRequest {
  type: ChatType;
  name?: string;
  description?: string;
  participant_ids: string[];
  is_private?: boolean;
}

export interface UpdateUserRequest {
  display_name?: string;
  avatar_url?: string;
  status?: UserStatus;
}

export interface AddReactionRequest {
  message_id: string;
  emoji: string;
}

// Extended types with relations
export interface ChatWithParticipants extends Chat {
  participants: (ChatParticipant & { user: User })[];
  last_message?: Message & { sender: User };
  unread_count: number;
}

export interface MessageWithSender extends Message {
  sender: User;
  reactions: (MessageReaction & { user: User })[];
  reply_to?: Message & { sender: User };
}

export interface UserWithPresence extends User {
  is_typing?: boolean;
  typing_in_chat?: string;
}

// Real-time event types
export interface TypingEvent {
  user_id: string;
  chat_id: string;
  is_typing: boolean;
}

export interface PresenceEvent {
  user_id: string;
  status: UserStatus;
  is_online: boolean;
  last_seen: string;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    next_cursor?: string;
  };
}

// Validation schemas (for runtime validation)
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VALIDATION_RULES = {
  username: {
    min: 3,
    max: 50,
    pattern: USERNAME_REGEX,
  },
  display_name: {
    min: 1,
    max: 100,
  },
  password: {
    min: 8,
    max: 128,
  },
  message_content: {
    min: 1,
    max: 4000,
  },
  chat_name: {
    min: 1,
    max: 100,
  },
  chat_description: {
    max: 500,
  },
} as const;

// E2E Encryption Types
export interface EncryptedMessage {
  encryptedContent: string;
  ephemeralPublicKey: string;
  signature: string;
  nonce: string;
  timestamp: number;
}

export interface KeyExchangeSession {
  id: string;
  initiator_id: string;
  recipient_id: string;
  chat_id: string;
  initiator_ephemeral_public_key: string;
  recipient_ephemeral_public_key?: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  created_at: string;
  completed_at?: string;
  expires_at: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_name: string;
  device_fingerprint: string;
  public_key_encryption: string;
  public_key_signing: string;
  is_active: boolean;
  last_seen: string;
  created_at: string;
}

export interface E2EKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface E2EUserKeys {
  encryption: E2EKeyPair;
  signing: E2EKeyPair;
}

export interface EncryptedPrivateKeys {
  encryptedKeys: string;
  salt: string;
  nonce: string;
}

// E2E API Request/Response Types
export interface InitiateKeyExchangeRequest {
  recipient_id: string;
  chat_id: string;
  ephemeral_public_key: string;
}

export interface CompleteKeyExchangeRequest {
  session_id: string;
  ephemeral_public_key: string;
}

export interface SendEncryptedMessageRequest {
  chat_id: string;
  encrypted_content: string;
  ephemeral_public_key: string;
  signature: string;
  nonce: string;
  type?: MessageType;
  reply_to_id?: string;
}

export interface SetupE2EKeysRequest {
  public_key_encryption: string;
  public_key_signing: string;
  encrypted_private_keys: string;
  salt: string;
  nonce: string;
  password: string; // For verification
}

export interface RegisterDeviceRequest {
  device_name: string;
  device_fingerprint: string;
  public_key_encryption: string;
  public_key_signing: string;
}
