import { Response } from 'express';
import SupabaseService from '../services/supabase.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  ApiResponse,
  KeyExchangeSession,
  UserDevice,
  InitiateKeyExchangeRequest,
  CompleteKeyExchangeRequest,
  SetupE2EKeysRequest,
  RegisterDeviceRequest,
  User
} from '../../../shared/src/types';
import DatabaseLogger from '../utils/database-logger';

class E2EEncryptionController {
  private supabase = SupabaseService.getInstance();

  /**
   * Setup E2E encryption keys for a user
   */
  public setupKeys = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const {
        public_key_encryption,
        public_key_signing,
        encrypted_private_keys,
        salt,
        nonce
      }: SetupE2EKeysRequest = req.body;

      // Update user with encryption keys
      const updateResult = await this.supabase.executeQuery(
        'SETUP_E2E_KEYS',
        'users',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('users')
            .update({
              public_key_encryption,
              public_key_signing,
              encrypted_private_keys,
              key_salt: salt,
              key_nonce: nonce,
              key_derivation_iterations: 100000
            })
            .eq('id', req.user!.id)
            .select('id, username, public_key_encryption, public_key_signing')
            .single();
          return { data, error };
        },
        req.user.id,
        { operation: 'setup_e2e_keys' }
      );

      if (updateResult.error) {
        console.error('Error setting up E2E keys:', updateResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to setup encryption keys',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<Partial<User>> = {
        success: true,
        data: updateResult.data,
        message: 'E2E encryption keys setup successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in setupKeys:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  /**
   * Get user's public keys for encryption
   */
  public getPublicKeys = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { userId } = req.params;

      const keysResult = await this.supabase.executeQuery(
        'GET_USER_PUBLIC_KEYS',
        'users',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('users')
            .select('id, username, public_key_encryption, public_key_signing')
            .eq('id', userId)
            .single();
          return { data, error };
        },
        req.user.id,
        { target_user_id: userId }
      );

      if (keysResult.error || !keysResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found or keys not available',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Partial<User>> = {
        success: true,
        data: keysResult.data,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPublicKeys:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  /**
   * Initiate key exchange for E2E encryption
   */
  public initiateKeyExchange = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const {
        recipient_id,
        chat_id,
        ephemeral_public_key
      }: InitiateKeyExchangeRequest = req.body;

      // Verify the chat exists and user is a participant
      const chatCheckResult = await this.supabase.executeQuery(
        'VERIFY_CHAT_PARTICIPANT',
        'chat_participants',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('chat_participants')
            .select('id')
            .eq('chat_id', chat_id)
            .eq('user_id', req.user!.id)
            .single();
          return { data, error };
        },
        req.user.id,
        { chat_id, operation: 'verify_participant' }
      );

      if (chatCheckResult.error || !chatCheckResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'You are not a participant in this chat',
        };
        res.status(403).json(response);
        return;
      }

      // Create or update key exchange session
      const sessionResult = await this.supabase.executeQuery(
        'CREATE_KEY_EXCHANGE_SESSION',
        'key_exchange_sessions',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('key_exchange_sessions')
            .upsert({
              initiator_id: req.user!.id,
              recipient_id,
              chat_id,
              initiator_ephemeral_public_key: ephemeral_public_key,
              status: 'pending',
              expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
            }, {
              onConflict: 'initiator_id,recipient_id,chat_id'
            })
            .select()
            .single();
          return { data, error };
        },
        req.user.id,
        { recipient_id, chat_id, operation: 'initiate_key_exchange' }
      );

      if (sessionResult.error) {
        console.error('Error creating key exchange session:', sessionResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to initiate key exchange',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<KeyExchangeSession> = {
        success: true,
        data: sessionResult.data,
        message: 'Key exchange initiated successfully',
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error in initiateKeyExchange:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  /**
   * Complete key exchange by providing recipient's ephemeral key
   */
  public completeKeyExchange = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const {
        session_id,
        ephemeral_public_key
      }: CompleteKeyExchangeRequest = req.body;

      // Update the key exchange session
      const updateResult = await this.supabase.executeQuery(
        'COMPLETE_KEY_EXCHANGE',
        'key_exchange_sessions',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('key_exchange_sessions')
            .update({
              recipient_ephemeral_public_key: ephemeral_public_key,
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', session_id)
            .eq('recipient_id', req.user!.id)
            .eq('status', 'pending')
            .select()
            .single();
          return { data, error };
        },
        req.user.id,
        { session_id, operation: 'complete_key_exchange' }
      );

      if (updateResult.error || !updateResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'Key exchange session not found or already completed',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<KeyExchangeSession> = {
        success: true,
        data: updateResult.data,
        message: 'Key exchange completed successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in completeKeyExchange:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  /**
   * Get pending key exchange sessions for the user
   */
  public getPendingKeyExchanges = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const sessionsResult = await this.supabase.executeQuery(
        'GET_PENDING_KEY_EXCHANGES',
        'key_exchange_sessions',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('key_exchange_sessions')
            .select(`
              *,
              initiator:users!initiator_id(id, username, display_name),
              chat:chats(id, name, type)
            `)
            .eq('recipient_id', req.user!.id)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });
          return { data, error };
        },
        req.user.id,
        { operation: 'get_pending_exchanges' }
      );

      if (sessionsResult.error) {
        console.error('Error fetching pending key exchanges:', sessionsResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to fetch pending key exchanges',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<KeyExchangeSession[]> = {
        success: true,
        data: sessionsResult.data || [],
        message: `Found ${sessionsResult.data?.length || 0} pending key exchanges`,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPendingKeyExchanges:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  /**
   * Register a new device for multi-device E2E encryption
   */
  public registerDevice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const {
        device_name,
        device_fingerprint,
        public_key_encryption,
        public_key_signing
      }: RegisterDeviceRequest = req.body;

      const deviceResult = await this.supabase.executeQuery(
        'REGISTER_DEVICE',
        'user_devices',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('user_devices')
            .upsert({
              user_id: req.user!.id,
              device_name,
              device_fingerprint,
              public_key_encryption,
              public_key_signing,
              is_active: true,
              last_seen: new Date().toISOString()
            }, {
              onConflict: 'user_id,device_fingerprint'
            })
            .select()
            .single();
          return { data, error };
        },
        req.user.id,
        { device_name, device_fingerprint }
      );

      if (deviceResult.error) {
        console.error('Error registering device:', deviceResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to register device',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<UserDevice> = {
        success: true,
        data: deviceResult.data,
        message: 'Device registered successfully',
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error in registerDevice:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  /**
   * Get user's registered devices
   */
  public getUserDevices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const devicesResult = await this.supabase.executeQuery(
        'GET_USER_DEVICES',
        'user_devices',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('user_devices')
            .select('*')
            .eq('user_id', req.user!.id)
            .eq('is_active', true)
            .order('last_seen', { ascending: false });
          return { data, error };
        },
        req.user.id,
        { operation: 'get_devices' }
      );

      if (devicesResult.error) {
        console.error('Error fetching user devices:', devicesResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to fetch devices',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<UserDevice[]> = {
        success: true,
        data: devicesResult.data || [],
        message: `Found ${devicesResult.data?.length || 0} active devices`,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUserDevices:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };
}

export default new E2EEncryptionController();
