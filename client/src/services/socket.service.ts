import { io, Socket } from 'socket.io-client';
import { MessageWithSender } from '../../../shared/src/types';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private username: string | null = null;

  connect(token: string, userId?: string, username?: string): void {
    const serverUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3001';
    
    this.userId = userId || null;
    this.username = username || null;
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server via Socket.IO');
      
      // Send authentication data if available
      if (this.userId && this.username) {
        console.log('Authenticating with userId:', this.userId, 'username:', this.username);
        this.socket?.emit('authenticate', {
          userId: this.userId,
          username: this.username
        });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChat(chatId: string): void {
    if (this.socket) {
      this.socket.emit('join_chat', chatId);
    }
  }

  leaveChat(chatId: string): void {
    if (this.socket) {
      this.socket.emit('leave_chat', chatId);
    }
  }

  sendMessage(chatId: string, content: string): void {
    if (this.socket) {
      this.socket.emit('send_message', { chatId, content });
    }
  }

  // Typing indicators
  startTyping(chatId: string): void {
    if (this.socket) {
      this.socket.emit('typing_start', chatId);
    }
  }

  stopTyping(chatId: string): void {
    if (this.socket) {
      this.socket.emit('typing_stop', chatId);
    }
  }

  onUserTyping(callback: (data: { userId: string, username: string, chatId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserStoppedTyping(callback: (data: { userId: string, chatId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_stopped_typing', callback);
    }
  }

  offUserTyping(): void {
    if (this.socket) {
      this.socket.off('user_typing');
    }
  }

  offUserStoppedTyping(): void {
    if (this.socket) {
      this.socket.off('user_stopped_typing');
    }
  }

  onNewMessage(callback: (message: MessageWithSender) => void): void {
    if (this.socket) {
      console.log('Setting up new_message listener');
      this.socket.on('new_message', (message) => {
        console.log('Socket received new_message event:', message);
        callback(message);
      });
    }
  }

  onMessageUpdate(callback: (message: MessageWithSender) => void): void {
    if (this.socket) {
      this.socket.on('message_updated', callback);
    }
  }

  offNewMessage(): void {
    if (this.socket) {
      this.socket.off('new_message');
    }
  }

  offMessageUpdate(): void {
    if (this.socket) {
      this.socket.off('message_updated');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new SocketService();
