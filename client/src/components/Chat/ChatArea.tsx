import React, { useRef, useEffect, useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { PinnedMessageBar } from './PinnedMessageBar';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import { CallModal } from '../Call/CallModal';
import { useStore } from '../../store/useStore';
import { socket } from '../../lib/socket';
import type { CallData } from '../../types';
import { MessageSquare } from 'lucide-react';

export const ChatArea: React.FC = () => {
  const { activeChatId, chats, messagesMap, pinMessage, user } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeCall, setActiveCall] = useState<CallData | null>(null);

  const currentChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChatId ? messagesMap[activeChatId] || [] : [];
  const pinnedMessage = messages.find((m) => m.isPinned);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChatId]);

  // Listen for incoming call events on socket
  useEffect(() => {
    socket.on('incomingCall', (data: { callerId: string; callerName: string; callerAvatar?: string; isVideo: boolean; signalData: any }) => {
      if (user?.allowCalls === false) {
        socket.emit('rejectCall', { targetUserId: data.callerId });
        return;
      }
      setActiveCall({
        callId: `call_${Date.now()}`,
        targetUserId: user?.id || '',
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        isVideo: data.isVideo,
        status: 'incoming',
        signalData: data.signalData
      });
    });

    return () => {
      socket.off('incomingCall');
    };
  }, [user]);

  const handleStartCall = (isVideo: boolean) => {
    if (!currentChat) return;
    setActiveCall({
      callId: `call_${Date.now()}`,
      targetUserId: currentChat.id,
      callerId: user?.id || '',
      callerName: currentChat.name,
      callerAvatar: currentChat.avatar,
      isVideo,
      status: 'calling'
    });
  };

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
      <ChatHeader onStartCall={handleStartCall} />
      {pinnedMessage && (
        <PinnedMessageBar
          pinnedMessage={pinnedMessage}
          onUnpin={() => activeChatId && pinMessage(activeChatId, pinnedMessage.id)}
        />
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
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

      {/* WebRTC Call Modal */}
      {activeCall && (
        <CallModal activeCall={activeCall} onEndCall={() => setActiveCall(null)} />
      )}
    </main>
  );
};
