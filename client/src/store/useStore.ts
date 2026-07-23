import { create } from 'zustand';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import type { Chat, FolderType, Message, User } from '../types';

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;

  // Navigation & Folders
  activeFolder: FolderType;
  setActiveFolder: (folder: FolderType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Chats state
  chats: Chat[];
  activeChatId: string | null;
  selectChat: (chatId: string | null) => void;
  addChat: (chat: Chat) => void;
  createChat: (chat: {
    name: string;
    type: Chat['type'];
    username?: string;
    description?: string;
    isPublic?: boolean;
  }) => Promise<Chat | null>;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  togglePinChat: (chatId: string) => void;
  toggleMuteChat: (chatId: string) => void;
  markAsRead: (chatId: string) => void;
  deleteChat: (chatId: string) => Promise<void>;

  // Messages state
  messagesMap: Record<string, Message[]>;
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (msg: Message | null) => void;
  sendMessage: (chatId: string, text: string, media?: Message['media']) => Promise<void>;
  editMessage: (chatId: string, messageId: string, text: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  toggleReaction: (chatId: string, messageId: string, emoji: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  sendTypingSignal: (chatId: string, isTyping: boolean) => void;

  // UI Modals & Panels
  isRightPanelOpen: boolean;
  toggleRightPanel: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  activeSettingsTab: string;
  setActiveSettingsTab: (tab: string) => void;
  
  // Real-time socket initializer
  initSocketListeners: () => void;
}

const createSavedChat = (user?: User | null): Chat => ({
  id: 'chat_saved',
  name: 'Saqlangan xabarlar',
  type: 'saved',
  avatar: '',
  lastMessage: 'Shaxsiy eslatmalaringiz va xabarlaringiz',
  time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
  unreadCount: 0,
  isPinned: true,
  isMuted: false,
  folder: 'personal',
  description: user ? `Sizning shaxsiy saqlangan xabarlaringiz va fayllaringiz, ${user.firstName}.` : 'Sizning shaxsiy saqlangan xabarlaringiz va fayllaringiz'
});

const normalizeChat = (chat: any): Chat => ({
  id: chat.id || chat._id?.toString() || `chat_${Date.now()}`,
  name: chat.name || 'Nomsiz chat',
  type: chat.type || 'user',
  avatar: chat.avatar || '',
  lastMessage: chat.lastMessage || '',
  time: chat.time || '',
  unreadCount: typeof chat.unreadCount === 'number' ? chat.unreadCount : 0,
  isPinned: Boolean(chat.isPinned),
  isMuted: Boolean(chat.isMuted),
  isOnline: chat.isOnline,
  typingStatus: chat.typingStatus,
  folder: chat.folder || (chat.type === 'group' ? 'groups' : chat.type === 'channel' ? 'channels' : 'personal'),
  membersCount: typeof chat.membersCount === 'number' ? chat.membersCount : undefined,
  description: chat.description,
  username: chat.username,
  isPublic: typeof chat.isPublic === 'boolean' ? chat.isPublic : undefined
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
  views: typeof message.views === 'number' ? message.views : undefined,
  isEdited: Boolean(message.isEdited),
  editedAt: message.editedAt
});

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  user: null,

  login: (user: User) => {
    set({
      isAuthenticated: true,
      user
    });

    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('registerUser', user.id);
    get().initSocketListeners();
    void get().loadChats();
  },

  logout: () => {
    socket.disconnect();
    set({
      isAuthenticated: false,
      user: null,
      chats: [],
      messagesMap: {},
      activeChatId: null
    });
  },

  updateProfile: async (data: Partial<User>) => {
    const current = get().user;
    if (!current) return;

    try {
      const res = await api.put('/api/auth/profile', data);
      if (res.data?.user) {
        set({ user: res.data.user });
      } else {
        set({ user: { ...current, ...data } });
      }
    } catch {
      set({ user: { ...current, ...data } });
    }
  },

  // Folders & Search
  activeFolder: 'all',
  setActiveFolder: (folder: FolderType) => set({ activeFolder: folder }),
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  chats: [],
  activeChatId: null,

  loadChats: async () => {
    try {
      const res = await api.get('/api/chats');
      const serverChats = Array.isArray(res.data?.chats) ? res.data.chats.map(normalizeChat) : [];
      const savedChatInServer = serverChats.find((c: Chat) => c.type === 'saved');
      const savedChat = savedChatInServer || createSavedChat(get().user);

      const allChats = [
        savedChat,
        ...serverChats.filter((chat: Chat) => chat.id !== savedChat.id)
      ];

      set((state) => {
        const nextActiveId = state.activeChatId && allChats.some((c: Chat) => c.id === state.activeChatId)
          ? state.activeChatId
          : savedChat.id;

        return {
          chats: allChats,
          activeChatId: nextActiveId
        };
      });

      const currentActiveId = get().activeChatId || savedChat.id;
      if (currentActiveId) {
        void get().loadMessages(currentActiveId);
      }
    } catch {
      const savedChat = createSavedChat(get().user);
      set((state) => ({
        chats: state.chats.length > 0 ? state.chats : [savedChat],
        activeChatId: state.activeChatId && state.chats.some((chat) => chat.id === state.activeChatId)
          ? state.activeChatId
          : savedChat.id
      }));
    }
  },

  loadMessages: async (chatId: string) => {
    if (!chatId) return;

    try {
      const res = await api.get(`/api/chats/${chatId}/messages`);
      const messages = Array.isArray(res.data?.messages) ? res.data.messages.map(normalizeMessage) : [];
      set((state) => ({
        messagesMap: {
          ...state.messagesMap,
          [chatId]: messages
        }
      }));
    } catch {
      // Keep local state
    }
  },

  selectChat: (chatId: string | null) => {
    const previousChatId = get().activeChatId;
    if (previousChatId) {
      socket.emit('leaveChat', previousChatId);
    }

    if (chatId) {
      get().markAsRead(chatId);
      socket.emit('joinChat', chatId);
    }

    set({ activeChatId: chatId, replyingTo: null, editingMessage: null });

    if (chatId && chatId !== 'chat_saved' && !(get().messagesMap[chatId]?.length)) {
      void get().loadMessages(chatId);
    }
  },

  addChat: (chat: Chat) => {
    set((state) => ({
      chats: [chat, ...state.chats.filter(c => c.id !== chat.id)],
      messagesMap: {
        ...state.messagesMap,
        [chat.id]: state.messagesMap[chat.id] || []
      },
      activeChatId: chat.id
    }));
  },

  createChat: async (chat) => {
    const fallbackChat: Chat = {
      id: `chat_${Date.now()}`,
      name: chat.name,
      type: chat.type,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chat.name)}`,
      lastMessage: chat.type === 'channel' ? 'Kanal yaratildi' : 'Muloqot boshlandi',
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      folder: chat.type === 'group' ? 'groups' : chat.type === 'channel' ? 'channels' : 'personal',
      username: chat.username,
      description: chat.description,
      isPublic: chat.isPublic,
      membersCount: chat.type === 'channel' ? 1 : chat.type === 'group' ? 1 : 0
    };

    try {
      const payload = {
        name: chat.name,
        type: chat.type,
        avatar: fallbackChat.avatar,
        description: chat.description,
        username: chat.username,
        isPublic: chat.isPublic
      };
      const res = await api.post('/api/chats', payload);
      const createdChat = normalizeChat(res.data?.chat || fallbackChat);
      set((state) => ({
        chats: [createdChat, ...state.chats.filter((item) => item.id !== createdChat.id)],
        messagesMap: {
          ...state.messagesMap,
          [createdChat.id]: state.messagesMap[createdChat.id] || []
        },
        activeChatId: createdChat.id
      }));
      return createdChat;
    } catch {
      set((state) => ({
        chats: [fallbackChat, ...state.chats.filter((item) => item.id !== fallbackChat.id)],
        messagesMap: {
          ...state.messagesMap,
          [fallbackChat.id]: state.messagesMap[fallbackChat.id] || []
        },
        activeChatId: fallbackChat.id
      }));
      return fallbackChat;
    }
  },

  togglePinChat: (chatId: string) => {
    void api.post(`/api/chats/${chatId}/pin`).catch(() => {});
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    }));
  },

  toggleMuteChat: (chatId: string) => {
    void api.post(`/api/chats/${chatId}/mute`).catch(() => {});
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    }));
  },

  markAsRead: (chatId: string) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    }));
  },

  deleteChat: async (chatId: string) => {
    try {
      await api.delete(`/api/chats/${chatId}`);
    } catch {
      // Optimistic delete
    }

    set((state) => {
      const nextChats = state.chats.filter((c) => c.id !== chatId);
      const nextMap = { ...state.messagesMap };
      delete nextMap[chatId];

      const savedChat = nextChats.find((c) => c.type === 'saved');
      const nextActiveId = state.activeChatId === chatId
        ? (savedChat ? savedChat.id : (nextChats[0]?.id || null))
        : state.activeChatId;

      return {
        chats: nextChats,
        messagesMap: nextMap,
        activeChatId: nextActiveId
      };
    });
  },

  messagesMap: {},
  replyingTo: null,
  setReplyingTo: (msg: Message | null) => set({ replyingTo: msg, editingMessage: null }),
  editingMessage: null,
  setEditingMessage: (msg: Message | null) => set({ editingMessage: msg, replyingTo: null }),

  sendMessage: async (chatId: string, text: string, media?: Message['media']) => {
    const currentUser = get().user;
    const replyingMsg = get().replyingTo;
    const nowTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const currentChat = get().chats.find((chat) => chat.id === chatId);
    const isChannelPost = currentChat?.type === 'channel';

    const tempMsgId = 'msg_' + Date.now();
    const optimisticMsg: Message = {
      id: tempMsgId,
      chatId,
      senderId: currentUser?.id || 'usr_me',
      senderName: currentUser?.firstName || 'Siz',
      text,
      time: nowTime,
      date: 'Bugun',
      isOutgoing: true,
      status: 'sending',
      replyTo: replyingMsg ? {
        id: replyingMsg.id,
        senderName: replyingMsg.senderName || 'Foydalanuvchi',
        text: replyingMsg.text.substring(0, 40)
      } : undefined,
      media,
      views: isChannelPost ? 1 : undefined
    };

    // Instant UI update
    set((state) => {
      const currentList = state.messagesMap[chatId] || [];
      const updatedList = [...currentList, optimisticMsg];
      const updatedChats = state.chats.map((c) => {
        if (c.id === chatId) {
          const nextLastMessage = text || (media ? `[${media.type === 'image' ? 'Rasm' : media.type === 'voice' ? 'Ovozli xabar' : 'Fayl'}]` : '');
          return {
            ...c,
            lastMessage: c.type === 'channel' ? (text || 'Yangi post') : nextLastMessage,
            time: nowTime
          };
        }
        return c;
      });

      return {
        messagesMap: {
          ...state.messagesMap,
          [chatId]: updatedList
        },
        chats: updatedChats,
        replyingTo: null
      };
    });

    // Emit socket event for real-time updates
    socket.emit('sendMessage', optimisticMsg);

    // Save message to database in background
    try {
      const res = await api.post('/api/messages', {
        chatId,
        text,
        senderId: currentUser?.id,
        senderName: currentUser?.firstName,
        replyTo: replyingMsg ? {
          id: replyingMsg.id,
          senderName: replyingMsg.senderName || 'Foydalanuvchi',
          text: replyingMsg.text.substring(0, 40)
        } : undefined,
        media
      });

      const savedMessage = normalizeMessage(res.data?.message || optimisticMsg);

      set((state) => {
        const currentList = state.messagesMap[chatId] || [];
        const updatedList = currentList.map((m) => m.id === tempMsgId ? { ...savedMessage, status: 'delivered' as const } : m);
        return {
          messagesMap: {
            ...state.messagesMap,
            [chatId]: updatedList
          }
        };
      });
    } catch {
      set((state) => {
        const currentList = state.messagesMap[chatId] || [];
        const updatedList = currentList.map((m) => m.id === tempMsgId ? { ...m, status: 'delivered' as const } : m);
        return {
          messagesMap: {
            ...state.messagesMap,
            [chatId]: updatedList
          }
        };
      });
    }
  },

  editMessage: async (chatId: string, messageId: string, text: string) => {
    try {
      const res = await api.put(`/api/messages/${messageId}`, { text });
      const updatedMsg = res.data?.message;

      socket.emit('editMessage', { chatId, messageId, text, isEdited: true });

      set((state) => {
        const list = state.messagesMap[chatId] || [];
        const updated = list.map((m) =>
          m.id === messageId ? { ...m, text: updatedMsg?.text || text, isEdited: true } : m
        );
        return {
          messagesMap: { ...state.messagesMap, [chatId]: updated },
          editingMessage: null
        };
      });
    } catch {
      set((state) => {
        const list = state.messagesMap[chatId] || [];
        const updated = list.map((m) =>
          m.id === messageId ? { ...m, text, isEdited: true } : m
        );
        return {
          messagesMap: { ...state.messagesMap, [chatId]: updated },
          editingMessage: null
        };
      });
    }
  },

  deleteMessage: async (chatId: string, messageId: string) => {
    try {
      await api.delete(`/api/messages/${messageId}`);
    } catch {
      // Continue optimistic state update
    }

    socket.emit('deleteMessage', { chatId, messageId });

    set((state) => {
      const list = state.messagesMap[chatId] || [];
      return {
        messagesMap: {
          ...state.messagesMap,
          [chatId]: list.filter((m) => m.id !== messageId)
        }
      };
    });
  },

  toggleReaction: async (chatId: string, messageId: string, emoji: string) => {
    try {
      const res = await api.post(`/api/messages/${messageId}/reaction`, { emoji });
      const updatedReactions = res.data?.reactions;

      socket.emit('toggleReaction', { chatId, messageId, reactions: updatedReactions || [] });

      set((state) => {
        const list = state.messagesMap[chatId] || [];
        const updated = list.map((m) => {
          if (m.id === messageId) {
            const reactions = updatedReactions || (m.reactions?.includes(emoji)
              ? m.reactions.filter((e) => e !== emoji)
              : [...(m.reactions || []), emoji]);
            return { ...m, reactions };
          }
          return m;
        });
        return { messagesMap: { ...state.messagesMap, [chatId]: updated } };
      });
    } catch {
      set((state) => {
        const list = state.messagesMap[chatId] || [];
        const updated = list.map((m) => {
          if (m.id === messageId) {
            const reactions = m.reactions || [];
            const exists = reactions.includes(emoji);
            const nextReactions = exists ? reactions.filter((e) => e !== emoji) : [...reactions, emoji];
            return { ...m, reactions: nextReactions };
          }
          return m;
        });
        return { messagesMap: { ...state.messagesMap, [chatId]: updated } };
      });
    }
  },

  pinMessage: async (chatId: string, messageId: string) => {
    try {
      const res = await api.post(`/api/messages/${messageId}/pin`);
      const isPinned = res.data?.isPinned;

      socket.emit('pinMessage', { chatId, messageId, isPinned });

      set((state) => {
        const list = state.messagesMap[chatId] || [];
        return {
          messagesMap: {
            ...state.messagesMap,
            [chatId]: list.map((m) => (m.id === messageId ? { ...m, isPinned: isPinned ?? !m.isPinned } : m))
          }
        };
      });
    } catch {
      set((state) => {
        const list = state.messagesMap[chatId] || [];
        return {
          messagesMap: {
            ...state.messagesMap,
            [chatId]: list.map((m) => (m.id === messageId ? { ...m, isPinned: !m.isPinned } : m))
          }
        };
      });
    }
  },

  sendTypingSignal: (chatId: string, isTyping: boolean) => {
    const user = get().user;
    if (!user) return;
    socket.emit('typing', { chatId, username: user.firstName, isTyping });
  },

  // Modals & Panels
  isRightPanelOpen: false,
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  isSettingsOpen: false,
  setIsSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),
  activeSettingsTab: 'profile',
  setActiveSettingsTab: (tab: string) => set({ activeSettingsTab: tab }),

  initSocketListeners: () => {
    socket.off('newMessage');
    socket.off('messageEdited');
    socket.off('messageDeleted');
    socket.off('reactionUpdated');
    socket.off('messagePinned');
    socket.off('userTyping');

    socket.on('newMessage', (msgData: any) => {
      const normalized = normalizeMessage(msgData);
      set((state) => {
        const chatId = normalized.chatId;
        const currentList = state.messagesMap[chatId] || [];
        if (currentList.some((m) => m.id === normalized.id)) return state;

        const isCurrentActive = state.activeChatId === chatId;
        const updatedChats = state.chats.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              lastMessage: normalized.text || '[Rasm]',
              time: normalized.time,
              unreadCount: isCurrentActive ? 0 : c.unreadCount + 1
            };
          }
          return c;
        });

        return {
          messagesMap: {
            ...state.messagesMap,
            [chatId]: [...currentList, normalized]
          },
          chats: updatedChats
        };
      });
    });

    socket.on('messageEdited', (data: { chatId: string; messageId: string; text: string }) => {
      set((state) => {
        const list = state.messagesMap[data.chatId] || [];
        const updated = list.map((m) => (m.id === data.messageId ? { ...m, text: data.text, isEdited: true } : m));
        return { messagesMap: { ...state.messagesMap, [data.chatId]: updated } };
      });
    });

    socket.on('messageDeleted', (data: { chatId: string; messageId: string }) => {
      set((state) => {
        const list = state.messagesMap[data.chatId] || [];
        return {
          messagesMap: {
            ...state.messagesMap,
            [data.chatId]: list.filter((m) => m.id !== data.messageId)
          }
        };
      });
    });

    socket.on('reactionUpdated', (data: { chatId: string; messageId: string; reactions: string[] }) => {
      set((state) => {
        const list = state.messagesMap[data.chatId] || [];
        const updated = list.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
        return { messagesMap: { ...state.messagesMap, [data.chatId]: updated } };
      });
    });

    socket.on('messagePinned', (data: { chatId: string; messageId: string; isPinned: boolean }) => {
      set((state) => {
        const list = state.messagesMap[data.chatId] || [];
        const updated = list.map((m) => (m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m));
        return { messagesMap: { ...state.messagesMap, [data.chatId]: updated } };
      });
    });

    socket.on('userTyping', (data: { chatId: string; username: string; isTyping: boolean }) => {
      set((state) => ({
        chats: state.chats.map((c) =>
          c.id === data.chatId ? { ...c, typingStatus: data.isTyping ? `${data.username} yozmoqda...` : undefined } : c
        )
      }));
    });
  }
}));
