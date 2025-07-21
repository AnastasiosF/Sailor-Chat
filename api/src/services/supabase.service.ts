import { createClient, SupabaseClient } from '@supabase/supabase-js';
import DatabaseLogger from '../utils/database-logger';

class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;
  private serviceClient: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Debug logging to help identify the issue
    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      anonKey: anonKey ? 'SET' : 'MISSING',
      serviceRoleKey: serviceRoleKey ? 'SET' : 'MISSING',
      nodeEnv: process.env.NODE_ENV
    });

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Missing Supabase configuration. Please check your .env file.');
      console.error('Required variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
      throw new Error(`Missing Supabase configuration. Missing: ${[
        !supabaseUrl && 'SUPABASE_URL',
        !anonKey && 'SUPABASE_ANON_KEY', 
        !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY'
      ].filter(Boolean).join(', ')}`);
    }

    // Client for user operations (with RLS)
    this.client = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Service client for admin operations (bypasses RLS)
    this.serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  public getServiceClient(): SupabaseClient {
    return this.serviceClient;
  }

  // Helper method to execute and log database operations
  public async executeQuery(
    operation: string,
    table: string,
    queryFn: () => Promise<any>,
    userId?: string,
    additionalContext?: any
  ) {
    const startTime = Date.now();
    
    DatabaseLogger.logOperation({
      operation,
      table,
      userId,
      timestamp: new Date().toISOString(),
      data: additionalContext
    });

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      DatabaseLogger.logResult(operation, table, result, duration, userId);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      DatabaseLogger.logError(operation, table, error, duration, userId, additionalContext);
      throw error;
    }
  }

  public async verifyToken(token: string): Promise<{ user: any; error: any }> {
    const startTime = Date.now();
    DatabaseLogger.logOperation({
      operation: 'AUTH_VERIFY_TOKEN',
      table: 'auth.users',
      timestamp: new Date().toISOString()
    });

    const { data, error } = await this.client.auth.getUser(token);
    const duration = Date.now() - startTime;

    if (error) {
      DatabaseLogger.logError('AUTH_VERIFY_TOKEN', 'auth.users', error, duration);
    } else {
      DatabaseLogger.logResult('AUTH_VERIFY_TOKEN', 'auth.users', { data: data.user, error }, duration, data.user?.id);
    }

    return { user: data.user, error };
  }

  public async refreshSession(refreshToken: string) {
    const startTime = Date.now();
    DatabaseLogger.logOperation({
      operation: 'AUTH_REFRESH_SESSION',
      table: 'auth.sessions',
      timestamp: new Date().toISOString()
    });

    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    const duration = Date.now() - startTime;

    if (error) {
      DatabaseLogger.logError('AUTH_REFRESH_SESSION', 'auth.sessions', error, duration);
    } else {
      DatabaseLogger.logResult('AUTH_REFRESH_SESSION', 'auth.sessions', { data, error }, duration, data.user?.id);
    }

    return { data, error };
  }

  public async signUp(email: string, password: string, metadata: any = {}) {
    const startTime = Date.now();
    DatabaseLogger.logOperation({
      operation: 'AUTH_SIGNUP',
      table: 'auth.users',
      data: { email, metadata },
      timestamp: new Date().toISOString()
    });

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    const duration = Date.now() - startTime;

    if (error) {
      DatabaseLogger.logError('AUTH_SIGNUP', 'auth.users', error, duration);
    } else {
      DatabaseLogger.logResult('AUTH_SIGNUP', 'auth.users', { data, error }, duration, data.user?.id);
    }

    return { data, error };
  }

  public async signIn(email: string, password: string) {
    const startTime = Date.now();
    DatabaseLogger.logOperation({
      operation: 'AUTH_SIGNIN',
      table: 'auth.users',
      data: { email },
      timestamp: new Date().toISOString()
    });

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    const duration = Date.now() - startTime;

    if (error) {
      DatabaseLogger.logError('AUTH_SIGNIN', 'auth.users', error, duration);
    } else {
      DatabaseLogger.logResult('AUTH_SIGNIN', 'auth.users', { data, error }, duration, data.user?.id);
    }

    return { data, error };
  }

  public async signOut(token: string) {
    const startTime = Date.now();
    DatabaseLogger.logOperation({
      operation: 'AUTH_SIGNOUT',
      table: 'auth.sessions',
      timestamp: new Date().toISOString()
    });

    // Set the session for the user
    await this.client.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed for sign out
    });
    
    const { error } = await this.client.auth.signOut();
    const duration = Date.now() - startTime;

    if (error) {
      DatabaseLogger.logError('AUTH_SIGNOUT', 'auth.sessions', error, duration);
    } else {
      DatabaseLogger.logResult('AUTH_SIGNOUT', 'auth.sessions', { data: null, error }, duration);
    }

    return { error };
  }
}

export default SupabaseService;
