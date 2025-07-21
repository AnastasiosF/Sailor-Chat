import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import SupabaseService from '../services/supabase.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  User,
  VerifyEmailRequest,
  ResendVerificationRequest,
} from '../../../shared/src/types';

class AuthController {
  private supabase = SupabaseService.getInstance();

  public register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password, username, display_name }: RegisterRequest = req.body;

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await this.supabase
        .getServiceClient()
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        const response: ApiResponse = {
          success: false,
          error: 'Username already taken',
        };
        res.status(409).json(response);
        return;
      }

      // Register user with Supabase Auth - this will send a confirmation email
      const { data: authData, error: authError } = await this.supabase.signUp(
        email,
        password,
        { username, display_name }
      );

      if (authError) {
        console.error('Registration error:', authError);
        const response: ApiResponse = {
          success: false,
          error: authError.message || 'Registration failed',
        };
        res.status(400).json(response);
        return;
      }

      if (!authData.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Registration failed - no user created',
        };
        res.status(400).json(response);
        return;
      }

      // For email confirmation flow, we don't return tokens immediately
      const response: ApiResponse<{ user: { id: string; email: string }; email_sent: boolean }> = {
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email || email,
          },
          email_sent: true,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public verifyEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { token, type }: VerifyEmailRequest = req.body;

      const { data, error } = await this.supabase
        .getServiceClient()
        .auth.verifyOtp({
          token_hash: token,
          type: type === 'signup' ? 'signup' : 'email_change',
        });

      if (error) {
        console.error('Email verification error:', error);
        const response: ApiResponse = {
          success: false,
          error: error.message || 'Email verification failed',
        };
        res.status(400).json(response);
        return;
      }

      if (!data.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Email verification failed - no user found',
        };
        res.status(400).json(response);
        return;
      }

      // Get the user profile
      const { data: userProfile, error: profileError } = await this.supabase
        .getServiceClient()
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      const response: ApiResponse<{ user: User; tokens?: AuthTokens }> = {
        success: true,
        data: {
          user: userProfile,
          tokens: data.session ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in || 3600,
            token_type: 'bearer' as const,
          } : undefined,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Email verification error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public resendVerification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email }: ResendVerificationRequest = req.body;

      const { error } = await this.supabase
        .getServiceClient()
        .auth.resend({
          type: 'signup',
          email,
        });

      if (error) {
        console.error('Resend verification error:', error);
        const response: ApiResponse = {
          success: false,
          error: error.message || 'Failed to resend verification email',
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<{ email_sent: boolean }> = {
        success: true,
        data: {
          email_sent: true,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Resend verification error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password, device_info }: LoginRequest = req.body;

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await this.supabase.signIn(email, password);

      if (authError || !authData.user || !authData.session) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid email or password',
        };
        res.status(401).json(response);
        return;
      }

      // Store refresh token session
      const sessionId = uuidv4();
      const refreshTokenHash = await bcrypt.hash(authData.session.refresh_token, 12);

      const { error: sessionError } = await this.supabase
        .getServiceClient()
        .from('user_sessions')
        .insert({
          id: sessionId,
          user_id: authData.user.id,
          refresh_token_hash: refreshTokenHash,
          device_info: device_info || null,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
      }

      // Update user online status
      await this.supabase
        .getServiceClient()
        .from('users')
        .update({
          is_online: true,
          status: 'online',
          last_seen: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      // Get user profile
      const { data: userProfile } = await this.supabase
        .getServiceClient()
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      const tokens: AuthTokens = {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in || 3600,
        token_type: 'bearer',
      };

      const response: ApiResponse<{ user: User; tokens: AuthTokens }> = {
        success: true,
        data: {
          user: userProfile,
          tokens,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { refresh_token }: RefreshTokenRequest = req.body;

      // Refresh session with Supabase
      const { data: authData, error: authError } = await this.supabase.refreshSession(refresh_token);

      if (authError || !authData.user || !authData.session) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid refresh token',
        };
        res.status(401).json(response);
        return;
      }

      // Update session in database
      const refreshTokenHash = await bcrypt.hash(authData.session.refresh_token, 12);

      await this.supabase
        .getServiceClient()
        .from('user_sessions')
        .update({
          refresh_token_hash: refreshTokenHash,
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', authData.user.id);

      const tokens: AuthTokens = {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in || 3600,
        token_type: 'bearer',
      };

      const response: ApiResponse<AuthTokens> = {
        success: true,
        data: tokens,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Token refresh error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      // Update user offline status
      await this.supabase
        .getServiceClient()
        .from('users')
        .update({
          is_online: false,
          status: 'offline',
          last_seen: new Date().toISOString(),
        })
        .eq('id', req.user.id);

      // Remove user sessions
      await this.supabase
        .getServiceClient()
        .from('user_sessions')
        .delete()
        .eq('user_id', req.user.id);

      // Sign out from Supabase
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await this.supabase.signOut(token);
      }

      const response: ApiResponse = {
        success: true,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Logout error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await this.supabase
        .getServiceClient()
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to fetch user profile',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<User> = {
        success: true,
        data: userProfile,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get me error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };
}

export default new AuthController();
