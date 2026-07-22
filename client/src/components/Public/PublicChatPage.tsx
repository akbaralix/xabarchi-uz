import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Send, ShieldCheck, Check, Copy } from 'lucide-react';
import { api } from '../../lib/api';
import type { Chat, Message } from '../../types';
import { useStore } from '../../store/useStore';

interface Props {
  username: string;
}

interface UserProfileData {
  id: string;
  firstName: string;
  lastName?: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
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
  const { addChat, selectChat } = useStore();
  const [loading, setLoading] = useState(true);
  const [targetType, setTargetType] = useState<'user' | 'chat'>('user');
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copied, setCopied] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const fetchPublicData = async () => {
      try {
        const res = await api.get(`/api/public/chats/${encodeURIComponent(username)}`);
        if (!mounted) return;

        if (res.data?.targetType === 'chat' && res.data?.chat) {
          setTargetType('chat');
          setChat(normalizeChat(res.data.chat));
          
          try {
            const msgRes = await api.get(`/api/public/chats/${encodeURIComponent(username)}/messages`);
            if (mounted && Array.isArray(msgRes.data?.messages)) {
              setMessages(msgRes.data.messages.map(normalizeMessage));
            }
          } catch {
            // Ignore messages fetch failure for chats
          }
        } else if (res.data?.user || res.data?.targetType === 'user') {
          setTargetType('user');
          setUserData(res.data.user || {
            id: 'usr_' + username,
            firstName: username,
            username,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            bio: `@${username} Xabarchi foydalanuvchisi`,
            isOnline: true
          });
        }
      } catch {
        if (!mounted) return;
        // Default to user profile layout
        setTargetType('user');
        setUserData({
          id: 'usr_' + username,
          firstName: username,
          username,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          bio: `@${username} Telegram Xabarchi foydalanuvchisi`,
          isOnline: true
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchPublicData();

    return () => {
      mounted = false;
    };
  }, [username]);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`https://t.me/${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDirectChat = async () => {
    setIsOpeningChat(true);
    try {
      const res = await api.post(`/api/chats/open-direct/${encodeURIComponent(username)}`);
      if (res.data?.success && res.data?.chat) {
        const createdChat = normalizeChat(res.data.chat);
        addChat(createdChat);
        selectChat(createdChat.id);
        window.location.assign('/');
        return;
      }
    } catch {
      // Fallback local chat creation
      const localChat: Chat = {
        id: 'chat_' + username,
        name: userData?.firstName || username,
        type: 'user',
        avatar: userData?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        lastMessage: 'Muloqot boshlandi',
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        folder: 'personal',
        username: username,
        description: userData?.bio
      };
      addChat(localChat);
      selectChat(localChat.id);
      window.location.assign('/');
    } finally {
      setIsOpeningChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#000000] text-white select-none">
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Loader2 size={18} className="animate-spin text-[#229ED9]" />
          Yuklanmoqda...
        </div>
      </div>
    );
  }

  // --- USER PROFILE VIEW (Telegram Style) ---
  if (targetType === 'user' || userData) {
    const displayName = `${userData?.firstName || username} ${userData?.lastName || ''}`.trim();

    return (
      <div className="flex h-screen w-screen bg-[#000000] text-white justify-center items-center p-4 select-none relative overflow-hidden font-sans">
        <div className="w-full max-w-md bg-[#0B0B0B] border border-white/10 rounded-3xl p-8 shadow-2xl relative flex flex-col items-center text-center">
          <button
            onClick={() => window.location.assign('/')}
            className="absolute top-5 left-5 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-subtle cursor-pointer"
            title="Orqaga"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Profile Avatar */}
          <div className="relative mb-4 mt-2">
            {userData?.avatarUrl ? (
              <img
                src={userData.avatarUrl}
                alt={displayName}
                className="w-28 h-28 rounded-full object-cover border-2 border-[#229ED9]/40 p-0.5 shadow-xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-[#229ED9]/20 text-[#229ED9] text-4xl font-bold flex items-center justify-center border-2 border-[#229ED9]/40 shadow-xl">
                {displayName[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-[#34C759] border-2 border-[#0B0B0B]" title="Tarmoqda online" />
          </div>

          {/* Name & Username */}
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-1.5 justify-center">
            {displayName}
            <ShieldCheck size={18} className="text-[#229ED9]" />
          </h2>
          <p className="text-sm font-medium text-[#229ED9] mt-1">@{userData?.username || username}</p>

          {/* Bio section */}
          <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/5 w-full text-xs text-white/70 leading-relaxed">
            {userData?.bio || 'Xabarchi ilovasidan foydalanmoqda ✨'}
          </div>

          {/* Telegram Send Message Button */}
          <div className="w-full space-y-3 mt-6">
            <button
              onClick={handleOpenDirectChat}
              disabled={isOpeningChat}
              className="w-full bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-semibold text-sm py-3.5 px-4 rounded-2xl transition-subtle flex items-center justify-center gap-2.5 shadow-lg shadow-[#229ED9]/20 cursor-pointer disabled:opacity-50"
            >
              {isOpeningChat ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={16} className="transform -rotate-12" />
                  <span>Xabar yozish</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyUsername}
              className="w-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium text-xs py-3 px-4 rounded-2xl border border-white/5 transition-subtle flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-[#34C759]" /> Havola nusxalandi!
                </>
              ) : (
                <>
                  <Copy size={14} /> Linkni nusxalash
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- CHANNEL / GROUP PUBLIC VIEW ---
  return (
    <div className="flex h-screen w-screen bg-[#000000] text-white overflow-hidden select-none">
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
              <h1 className="text-sm font-semibold truncate">{chat?.name || username}</h1>
              <p className="text-[11px] text-white/45 truncate">@{username}</p>
            </div>
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
          <button
            onClick={handleOpenDirectChat}
            className="w-full bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#229ED9]/20"
          >
            <Send size={16} /> Chatni ochish
          </button>
        </div>
      </main>
    </div>
  );
};
