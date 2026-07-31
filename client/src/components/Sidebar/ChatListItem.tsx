import React from 'react';
import { Pin, VolumeX, Bookmark, Users, Megaphone, Bot } from 'lucide-react';
import type { Chat } from '../../types';
import { useStore } from '../../store/useStore';
import '../../styles/ChatListItem.css';

interface Props {
  chat: Chat;
}

export const ChatListItem: React.FC<Props> = ({ chat }) => {
  const { activeChatId, selectChat } = useStore();
  const isActive = activeChatId === chat.id;

  const renderIcon = () => {
    if (chat.type === 'saved') return <Bookmark size={18} style={{ color: '#229ED9' }} />;
    if (chat.type === 'group') return <Users size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />;
    if (chat.type === 'channel') return <Megaphone size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />;
    if (chat.type === 'bot') return <Bot size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />;
    return null;
  };

  return (
    <div
      onClick={() => selectChat(chat.id)}
      className={`chat-list-item transition-subtle ${
        isActive
          ? 'item-active'
          : 'item-inactive'
      }`}
    >
      {/* Avatar Container */}
      <div className="avatar-wrapper-shrink">
        {chat.type === 'saved' ? (
          <div className="saved-avatar-pill">
            <Bookmark size={22} />
          </div>
        ) : chat.avatar ? (
          <img
            src={chat.avatar}
            alt={chat.name}
            className="chat-item-avatar-img"
          />
        ) : (
          <div className="chat-item-avatar-placeholder">
            {chat.name[0]}
          </div>
        )}

        {/* Online Indicator */}
        {chat.isOnline && chat.type === 'user' && (
          <span className="online-dot-badge" />
        )}
      </div>

      {/* Content */}
      <div className="chat-item-info">
        <div className="chat-item-top-row">
          <div className="chat-item-name-box">
            <h4 className="chat-item-name">{chat.name}</h4>
            {renderIcon()}
          </div>
          <span className="chat-item-time">{chat.time}</span>
        </div>

        <div className="chat-item-bottom-row">
          {chat.typingStatus ? (
            <p className="chat-typing-status animate-pulse">{chat.typingStatus}</p>
          ) : (
            <p className="chat-last-msg">{chat.lastMessage}</p>
          )}

          <div className="chat-item-badges">
            {chat.isMuted && <VolumeX size={13} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />}
            {chat.isPinned && <Pin size={13} style={{ color: '#229ED9', transform: 'rotate(45deg)' }} />}
            {chat.unreadCount > 0 && (
              <span className="unread-badge-pill">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
