import { Response } from 'express';
import SupabaseService from '../services/supabase.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { 
  ApiResponse, 
  User,
  UpdateUserRequest 
} from '../../../shared/src/types';
import DatabaseLogger from '../utils/database-logger';

class UserController {
  private supabase = SupabaseService.getInstance();

  public searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { query } = req.query as { query?: string };

      if (!query || query.trim().length < 2) {
        const response: ApiResponse = {
          success: false,
          error: 'Search query must be at least 2 characters',
        };
        res.status(400).json(response);
        return;
      }

      const searchResult = await this.supabase.executeQuery(
        'SEARCH_USERS',
        'users',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('users')
            .select('id, username, display_name, avatar_url, status, is_online, last_seen, created_at, updated_at')
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .neq('id', req.user!.id) // Exclude current user from search results
            .limit(20);
          return { data, error };
        },
        req.user.id,
        { search_query: query }
      );

      if (searchResult.error) {
        console.error('Error searching users:', searchResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to search users',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<User[]> = {
        success: true,
        data: searchResult.data || [],
        message: `Found ${searchResult.data?.length || 0} users`,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in searchUsers:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const userProfileResult = await this.supabase.executeQuery(
        'GET_USER_PROFILE',
        'users',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('users')
            .select('id, username, display_name, avatar_url, status, is_online, last_seen, created_at, updated_at')
            .eq('id', userId)
            .single();
          return { data, error };
        },
        req.user.id,
        { target_user_id: userId }
      );

      if (userProfileResult.error || !userProfileResult.data) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<User> = {
        success: true,
        data: userProfileResult.data,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { display_name, avatar_url, status }: UpdateUserRequest = req.body;

      const updateData: Partial<User> = {};
      if (display_name !== undefined) updateData.display_name = display_name;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (status !== undefined) updateData.status = status;

      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'No fields to update',
        };
        res.status(400).json(response);
        return;
      }

      const updateUserResult = await this.supabase.executeQuery(
        'UPDATE_USER_PROFILE',
        'users',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('users')
            .update(updateData)
            .eq('id', req.user!.id)
            .select()
            .single();
          return { data, error };
        },
        req.user.id,
        { fields_updated: Object.keys(updateData), update_data: updateData }
      );

      if (updateUserResult.error) {
        console.error('Error updating user profile:', updateUserResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to update profile',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse<User> = {
        success: true,
        data: updateUserResult.data,
        message: 'Profile updated successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };

  public updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
      }

      const { status, is_online } = req.body;

      const updateData: any = {
        last_seen: new Date().toISOString(),
      };

      if (status !== undefined) updateData.status = status;
      if (is_online !== undefined) updateData.is_online = is_online;

      const updateStatusResult = await this.supabase.executeQuery(
        'UPDATE_USER_STATUS',
        'users',
        async () => {
          const { data, error } = await this.supabase
            .getServiceClient()
            .from('users')
            .update(updateData)
            .eq('id', req.user!.id);
          return { data, error };
        },
        req.user.id,
        { status_update: updateData }
      );

      if (updateStatusResult.error) {
        console.error('Error updating user status:', updateStatusResult.error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to update status',
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Status updated successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateUserStatus:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Internal server error',
      };
      res.status(500).json(response);
    }
  };
}

export default new UserController();
