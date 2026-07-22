import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Users, Megaphone, MessageSquare, LogIn, LogOut } from 'lucide-react';
import { api } from '../../lib/api';
import type { Chat, Message } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  username: string;
}

const normalizeChat = (chat: any): Chat => ({
  id: chat.id || chat._id?.toString() || `chat_${Date.now()}`,
  name: chat.name || 'Nomsiz chat',
  type: chat.type || 'group',
  avatar: chat.avatar || '',
  lastMessage: chat.lastMessage || '',
  time: chat.time || '',
  unreadCount: typeof chat.unreadCount === 'number' ? chat.unreadCount : 0,
  isPinned: Boolean(chat.isPinned),
  isMuted: Boolean(chat.isMuted),
  folder: chat.folder || (chat.type === 'channel' ? 'channels' : 'groups'),
  membersCount: typeof chat.membersCount === 'number' ? chat.membersCount : 0,
  description: chat.description,
  username: chat.username,
  isPublic: typeof chat.isPublic === 'boolean' ? chat.isPublic : true
});

const normalizeMessage = (message: any): Message => ({
  id: message.id || message._id?.toString() || `m_${Date.now()}`,
  chatId: message.chatId,
  senderId: message.senderId,
  senderName: message.senderName,
  text: message.text || '',
  time: message.time || '',
  date: message.date || 'Bugun',
  isOutgoing: Boolean(message.isOutgoing),
  status: message.status || 'delivered',
  reactions: message.reactions,
  replyTo: message.replyTo,
  media: message.media,
  isPinned: Boolean(message.isPinned),
  views: typeof message.views === 'number' ? message.views : undefined
});

export const PublicChatPage: React.FC<Props> = ({ username }) => {
  const { isAuthenticated, loadChats } = useStore();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [viewerJoined, setViewerJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    const fetchPublicChat = async () => {
      try {
        const chatRes = await api.get(`/api/public/chats/${encodeURIComponent(username)}`);
        const nextChat = normalizeChat(chatRes.data?.chat);
        if (!mounted) return;
        setChat(nextChat);
        setViewerJoined(Boolean(chatRes.data?.chat?.viewerJoined));

        const messagesRes = await api.get(`/api/public/chats/${encodeURIComponent(username)}/messages`);
        if (!mounted) return;
        setMessages(Array.isArray(messagesRes.data?.messages) ? messagesRes.data.messages.map(normalizeMessage) : []);
      } catch (fetchError: any) {
        if (!mounted) return;
        setError(fetchError?.response?.data?.message || 'Chat topilmadi');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchPublicChat();

    return () => {
      mounted = false;
    };
  }, [username]);

  const subtitle = useMemo(() => {
    if (!chat) return '';
    if (chat.type === 'channel') {
      return `${chat.membersCount || 0} obunachi • kanal`;
    }
    if (chat.type === 'group') {
      return `${chat.membersCount || 0} a'zo • guruh`;
    }
    return 'Ochiq chat';
  }, [chat]);

  const handleJoinOrLeave = async () => {
    if (!chat) return;
    if (!isAuthenticated) {
      setError('Qo‘shilish uchun avval tizimga kiring');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const endpoint = viewerJoined ? `/api/public/chats/${chat.id}/leave` : `/api/public/chats/${chat.id}/join`;
      const res = await api.post(endpoint);
      const updated = normalizeChat(res.data?.chat || chat);
      setChat(updated);
      setViewerJoined(Boolean(res.data?.chat?.viewerJoined ?? !viewerJoined));
      void loadChats();
    } catch (joinError: any) {
      setError(joinError?.response?.data?.message || 'Amalni bajarib bo‘lmadi');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#000000] text-white">
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Yuklanmoqda...
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#000000] text-white p-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Chat topilmadi</p>
          <p className="text-sm text-white/50">{error || 'Bu username bilan guruh yoki kanal mavjud emas.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#000000] text-white overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0">
        <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => window.location.assign('/')}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-subtle"
              title="Orqaga"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{chat.name}</h1>
              <p className="text-[11px] text-white/45 truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/50">
            {chat.type === 'channel' ? <Megaphone size={15} /> : <Users size={15} />}
            <span>{chat.username ? `@${chat.username}` : 'public'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div key={message.id} className="max-w-3xl mx-auto">
                <div className="rounded-2xl border border-white/5 bg-[#0B0B0B] p-3">
                  {message.senderName && (
                    <p className="text-[11px] font-semibold text-[#229ED9] mb-1">{message.senderName}</p>
                  )}
                  {message.text && (
                    <p className="text-sm text-white whitespace-pre-wrap break-words">{message.text}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                    <span>{message.time}</span>
                    {typeof message.views === 'number' && chat.type === 'channel' && (
                      <span className="flex items-center gap-1">
                        <MessageSquare size={10} />
                        {message.views}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-white/40 text-sm">
              Hozircha xabar yo‘q
            </div>
          )}
        </div>

        <div className="border-t border-white/5 p-4 bg-[#000000]">
          {error && <p className="text-xs text-[#FF3B30] mb-3">{error}</p>}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0B0B0B] p-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {viewerJoined ? 'Siz ushbu chatga qo‘shilgansiz' : 'Bu chatga hali qo‘shilmagansiz'}
              </p>
              <p className="text-[11px] text-white/45">
                {chat.membersCount || 0} {chat.type === 'channel' ? 'obunachi' : 'a\'zo'}
              </p>
            </div>
            <button
              onClick={handleJoinOrLeave}
              disabled={joining}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-subtle disabled:opacity-60 ${
                viewerJoined
                  ? 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30'
                  : 'bg-[#229ED9] text-white'
              }`}
            >
              {joining ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  ...
                </>
              ) : viewerJoined ? (
                <>
                  <LogOut size={14} />
                  Chiqish
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  Qo‘shilish
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
