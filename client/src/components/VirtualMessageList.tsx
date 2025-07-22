import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Card, Typography, Avatar, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { MessageWithSender } from '../../../shared/src/types';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';

const { Text } = Typography;

interface VirtualMessageListProps {
  messages: MessageWithSender[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  typingUsers: Map<string, string>;
}

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: MessageWithSender[];
    currentUserId?: string;
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    typingUsers: Map<string, string>;
  };
}

const MessageItem: React.FC<MessageItemProps> = ({ index, style, data }) => {
  const { messages, currentUserId, isLoading, hasMore, onLoadMore, typingUsers } = data;
  
  // Handle loading indicator at the top
  if (index === 0 && hasMore) {
    return (
      <div style={{ ...style, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {isLoading ? (
          <Spin size="small" />
        ) : (
          <div
            style={{ 
              cursor: 'pointer', 
              padding: '10px', 
              color: '#1890ff',
              fontSize: '12px'
            }}
            onClick={onLoadMore}
          >
            Load more messages
          </div>
        )}
      </div>
    );
  }

  // Handle typing indicator at the bottom
  const messageIndex = hasMore ? index - 1 : index;
  if (messageIndex >= messages.length) {
    if (typingUsers.size > 0) {
      return (
        <div style={{ ...style, padding: '8px 16px', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
          {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
        </div>
      );
    }
    return <div style={style} />;
  }

  const message = messages[messageIndex];
  if (!message || !message.id) {
    return <div style={style} />;
  }

  const isOwnMessage = message.sender_id === currentUserId;
  const senderName = isOwnMessage ? 'You' : (message.sender?.username || 'Unknown User');
  const timestamp = message.created_at ? format(new Date(message.created_at), 'HH:mm') : '';

  return (
    <div style={{ ...style, padding: '4px 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          gap: '8px',
        }}
      >
        {!isOwnMessage && (
          <Avatar size="small" icon={<UserOutlined />} />
        )}
        
        <Card
          size="small"
          style={{
            maxWidth: '70%',
            backgroundColor: isOwnMessage ? '#1890ff' : '#4a4a4a',
            border: 'none',
            borderRadius: isOwnMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}
          bodyStyle={{
            padding: '8px 12px',
            color: 'white',
          }}
        >
          <div>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '11px',
                display: 'block',
                marginBottom: '2px'
              }}
            >
              {senderName} • {timestamp}
            </Text>
            <Text style={{ color: 'white', fontSize: '14px' }}>
              {message.content || ''}
            </Text>
          </div>
        </Card>

        {isOwnMessage && (
          <Avatar size="small" icon={<UserOutlined />} />
        )}
      </div>
    </div>
  );
};

const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  typingUsers
}) => {
  const { user } = useAuthStore();
  const listRef = useRef<List>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = prevMessageCountRef.current;
    
    // Calculate itemCount for scrolling
    let currentItemCount = messages.length;
    if (hasMore) currentItemCount += 1;
    if (typingUsers.size > 0) currentItemCount += 1;
    
    // Only scroll to bottom if new messages were added at the end
    if (currentMessageCount > previousMessageCount && listRef.current) {
      const scrollToIndex = Math.max(0, currentItemCount - 1);
      listRef.current.scrollToItem(scrollToIndex, 'end');
    }
    
    prevMessageCountRef.current = currentMessageCount;
  }, [messages.length, hasMore, typingUsers.size]);

  const itemData = useMemo(() => ({
    messages,
    currentUserId: user?.id,
    isLoading,
    hasMore,
    onLoadMore,
    typingUsers
  }), [messages, user?.id, isLoading, hasMore, onLoadMore, typingUsers]);

  // Calculate total item count: messages + load more indicator + typing indicator
  const itemCount = useMemo(() => {
    let count = messages.length;
    if (hasMore) count += 1; // Load more indicator
    if (typingUsers.size > 0) count += 1; // Typing indicator
    return count;
  }, [messages.length, hasMore, typingUsers.size]);

  const getItemSize = useCallback((index: number) => {
    // Load more indicator
    if (index === 0 && hasMore) return 40;
    
    const messageIndex = hasMore ? index - 1 : index;
    
    // Typing indicator
    if (messageIndex >= messages.length) return 30;
    
    // Regular message - estimate height based on content
    const message = messages[messageIndex];
    if (!message?.content) return 60;
    
    // Rough height calculation: base height + content lines
    const contentLines = Math.ceil(message.content.length / 50);
    return Math.max(60, 40 + contentLines * 20);
  }, [messages, hasMore]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={itemCount}
            itemSize={getItemSize}
            itemData={itemData}
            initialScrollOffset={hasMore ? 0 : height} // Start at bottom if no more messages to load
          >
            {MessageItem}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

export default VirtualMessageList;
