import { create } from 'zustand';
import type { Chat, FolderType, Message, User } from '../types';

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;

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
  togglePinChat: (chatId: string) => void;
  toggleMuteChat: (chatId: string) => void;
  markAsRead: (chatId: string) => void;

  // Messages state
  messagesMap: Record<string, Message[]>;
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;
  sendMessage: (chatId: string, text: string, media?: Message['media']) => void;
  toggleReaction: (chatId: string, messageId: string, emoji: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  pinMessage: (chatId: string, messageId: string) => void;

  // UI Modals & Panels
  isRightPanelOpen: boolean;
  toggleRightPanel: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  activeSettingsTab: string;
  setActiveSettingsTab: (tab: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth defaults to FALSE (Lands on Login Screen)
  isAuthenticated: false,
  user: null,

  login: (user: User) => {
    // When logging in, create default Saved Messages for user if no chats exist
    const savedChat: Chat = {
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
      description: 'Sizning shaxsiy saqlangan xabarlaringiz va fayllaringiz'
    };

    set({
      isAuthenticated: true,
      user,
      chats: [savedChat],
      activeChatId: 'chat_saved',
      messagesMap: {
        chat_saved: [
          {
            id: 'm_saved_welcome',
            chatId: 'chat_saved',
            senderId: user.id,
            senderName: user.firstName,
            text: `Xush kelibsiz, ${user.firstName}! Bu sizning saqlangan xabarlaringiz bo'limi.`,
            time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
            date: 'Bugun',
            isOutgoing: true,
            status: 'seen',
            isPinned: true
          }
        ]
      }
    });
  },

  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
      chats: [],
      messagesMap: {},
      activeChatId: null
    });
  },

  updateProfile: (data: Partial<User>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...data } });
    }
  },

  // Folders & Search
  activeFolder: 'all',
  setActiveFolder: (folder: FolderType) => set({ activeFolder: folder }),
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  // Empty initial chats (No mock data!)
  chats: [],
  activeChatId: null,

  selectChat: (chatId: string | null) => {
    const targetChat = chatId ? get().chats.find((chat) => chat.id === chatId) : null;

    if (chatId) {
      get().markAsRead(chatId);
    }

    if (chatId && targetChat?.type === 'channel') {
      set((state) => ({
        messagesMap: {
          ...state.messagesMap,
          [chatId]: (state.messagesMap[chatId] || []).map((message) => (
            typeof message.views === 'number'
              ? { ...message, views: message.views + 1 }
              : message
          ))
        }
      }));
    }

    set({ activeChatId: chatId });
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

  togglePinChat: (chatId: string) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    }));
  },

  toggleMuteChat: (chatId: string) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    }));
  },

  markAsRead: (chatId: string) => {
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    }));
  },

  // Empty initial messages (No mock data!)
  messagesMap: {},
  replyingTo: null,
  setReplyingTo: (msg: Message | null) => set({ replyingTo: msg }),

  sendMessage: (chatId: string, text: string, media?: Message['media']) => {
    const currentUser = get().user;
    const replyingMsg = get().replyingTo;
    const nowTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const currentChat = get().chats.find((chat) => chat.id === chatId);
    const isChannelPost = currentChat?.type === 'channel';

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      chatId,
      senderId: currentUser?.id || 'usr_me',
      senderName: currentUser?.firstName || 'Siz',
      text,
      time: nowTime,
      date: 'Bugun',
      isOutgoing: true,
      status: 'delivered',
      replyTo: replyingMsg ? {
        id: replyingMsg.id,
        senderName: replyingMsg.senderName || 'Foydalanuvchi',
        text: replyingMsg.text.substring(0, 40)
      } : undefined,
      media,
      views: isChannelPost ? 1 : undefined
    };

    set((state) => {
      const currentList = state.messagesMap[chatId] || [];
      const updatedList = [...currentList, newMsg];

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
  },

  toggleReaction: (chatId: string, messageId: string, emoji: string) => {
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
      return {
        messagesMap: { ...state.messagesMap, [chatId]: updated }
      };
    });
  },

  deleteMessage: (chatId: string, messageId: string) => {
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

  pinMessage: (chatId: string, messageId: string) => {
    set((state) => {
      const list = state.messagesMap[chatId] || [];
      return {
        messagesMap: {
          ...state.messagesMap,
          [chatId]: list.map((m) => (m.id === messageId ? { ...m, isPinned: !m.isPinned } : m))
        }
      };
    });
  },

  // Modals & Panels
  isRightPanelOpen: false,
  toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
  isSettingsOpen: false,
  setIsSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),
  activeSettingsTab: 'profile',
  setActiveSettingsTab: (tab: string) => set({ activeSettingsTab: tab }),
}));
