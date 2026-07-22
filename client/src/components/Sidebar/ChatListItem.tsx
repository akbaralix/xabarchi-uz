import React from 'react';
import { Pin, VolumeX, Bookmark, Users, Megaphone, Bot } from 'lucide-react';
import type { Chat } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  chat: Chat;
}

export const ChatListItem: React.FC<Props> = ({ chat }) => {
  const { activeChatId, selectChat } = useStore();
  const isActive = activeChatId === chat.id;

  const renderIcon = () => {
    if (chat.type === 'saved') return <Bookmark size={18} className="text-[#229ED9]" />;
    if (chat.type === 'group') return <Users size={12} className="text-white/40" />;
    if (chat.type === 'channel') return <Megaphone size={12} className="text-white/40" />;
    if (chat.type === 'bot') return <Bot size={12} className="text-white/40" />;
    return null;
  };

  return (
    <div
      onClick={() => selectChat(chat.id)}
      className={`group relative flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-subtle select-none border ${
        isActive
          ? 'bg-[#0B0B0B] border-white/10'
          : 'bg-transparent border-transparent hover:bg-[#0B0B0B]/60'
      }`}
    >
      {/* Avatar Container */}
      <div className="relative shrink-0">
        {chat.type === 'saved' ? (
          <div className="w-12 h-12 rounded-2xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9]">
            <Bookmark size={22} />
          </div>
        ) : chat.avatar ? (
          <img
            src={chat.avatar}
            alt={chat.name}
            className="w-12 h-12 rounded-2xl object-cover border border-white/5"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-[#111111] border border-white/5 flex items-center justify-center font-bold text-white text-lg">
            {chat.name[0]}
          </div>
        )}

        {/* Online Indicator */}
        {chat.isOnline && chat.type === 'user' && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#2ECC71] border-2 border-[#000000] rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{chat.name}</h4>
            {renderIcon()}
          </div>
          <span className="text-[11px] text-white/40 font-medium whitespace-nowrap">{chat.time}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {chat.typingStatus ? (
            <p className="text-xs text-[#229ED9] italic font-medium animate-pulse">{chat.typingStatus}</p>
          ) : (
            <p className="text-xs text-white/50 truncate font-normal">{chat.lastMessage}</p>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {chat.isMuted && <VolumeX size={13} className="text-white/30" />}
            {chat.isPinned && <Pin size={13} className="text-[#229ED9] transform rotate-45" />}
            {chat.unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#229ED9] text-white rounded-full">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
