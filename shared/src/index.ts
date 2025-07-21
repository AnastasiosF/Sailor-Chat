export * from './types';

// Utility functions
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return target.toLocaleDateString();
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,50}$/.test(username);
};

export const sanitizeMessage = (content: string): string => {
  return content.trim().replace(/\s+/g, ' ');
};

export const generateChatName = (participants: string[], currentUserId: string): string => {
  const otherParticipants = participants.filter(id => id !== currentUserId);
  if (otherParticipants.length === 1) {
    return `Chat with ${otherParticipants[0]}`;
  }
  return `Group chat (${participants.length} members)`;
};
