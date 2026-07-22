import React, { useRef, useEffect } from 'react';
import { ChatHeader } from './ChatHeader';
import { PinnedMessageBar } from './PinnedMessageBar';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import { useStore } from '../../store/useStore';
import { MessageSquare } from 'lucide-react';

export const ChatArea: React.FC = () => {
  const { activeChatId, chats, messagesMap, pinMessage } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChatId ? messagesMap[activeChatId] || [] : [];
  const pinnedMessage = messages.find((m) => m.isPinned);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChatId]);

  if (!currentChat) {
    return (
      <div className="flex-1 h-full bg-[#000000] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-[#0B0B0B] border border-white/5 flex items-center justify-center text-white/30 mb-4">
          <MessageSquare size={32} />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Muloqotni tanlang</h3>
        <p className="text-xs text-white/40 max-w-xs">
          Xabar yuborish va suhbatlashish uchun chap paneldan biror foydalanuvchi yoki guruhni tanlang.
        </p>
      </div>
    );
  }

  return (
    <main className="flex-1 h-full bg-[#000000] flex flex-col min-w-0 relative">
      <ChatHeader />
      {pinnedMessage && (
        <PinnedMessageBar
          pinnedMessage={pinnedMessage}
          onUnpin={() => activeChatId && pinMessage(activeChatId, pinnedMessage.id)}
        />
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {/* Date separator */}
        <div className="flex justify-center my-3 select-none">
          <span className="px-3 py-1 bg-[#0B0B0B] border border-white/5 text-[11px] font-medium text-white/50 rounded-full">
            Bugun
          </span>
        </div>

        {messages.map((message) => (
          <MessageItem key={message.id} message={message} chatType={currentChat.type} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <MessageComposer />
    </main>
  );
};
