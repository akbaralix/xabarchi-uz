import React, { useState } from 'react';
import { SidebarHeader } from './SidebarHeader';
import { FoldersNav } from './FoldersNav';
import { ChatListItem } from './ChatListItem';
import { useStore } from '../../store/useStore';
import { Pin, User, Globe, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import type { Chat } from '../../types';

export const Sidebar: React.FC = () => {
  const { chats, searchQuery, activeFolder, addChat, selectChat } = useStore();
  const [isOpeningGlobal, setIsOpeningGlobal] = useState(false);

  const cleanSearch = searchQuery.trim().replace(/^@+/, '').toLowerCase();

  // Filter chats by search and active folder
  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.username && chat.username.toLowerCase().includes(cleanSearch)) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFolder === 'all') return true;
    if (activeFolder === 'personal') return chat.folder === 'personal' || chat.type === 'user' || chat.type === 'saved';
    if (activeFolder === 'groups') return chat.type === 'group';
    if (activeFolder === 'channels') return chat.type === 'channel';
    if (activeFolder === 'unread') return chat.unreadCount > 0;
    if (activeFolder === 'archived') return chat.folder === 'archived';

    return true;
  });

  const pinnedChats = filteredChats.filter((c) => c.isPinned);
  const unpinnedChats = filteredChats.filter((c) => !c.isPinned);

  const handleGlobalSearchClick = async () => {
    if (!cleanSearch) return;
    setIsOpeningGlobal(true);

    try {
      const res = await api.post(`/api/chats/open-direct/${encodeURIComponent(cleanSearch)}`);
      if (res.data?.success && res.data?.chat) {
        const createdChat: Chat = {
          id: res.data.chat.id,
          name: res.data.chat.name,
          type: res.data.chat.type,
          avatar: res.data.chat.avatar,
          lastMessage: res.data.chat.lastMessage || 'Muloqot boshlandi',
          time: res.data.chat.time || new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          folder: 'personal',
          username: res.data.chat.username || cleanSearch
        };
        addChat(createdChat);
        selectChat(createdChat.id);
      }
    } catch {
      const fallbackChat: Chat = {
        id: 'chat_' + cleanSearch,
        name: cleanSearch,
        type: 'user',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanSearch}`,
        lastMessage: 'Muloqot boshlandi',
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        folder: 'personal',
        username: cleanSearch
      };
      addChat(fallbackChat);
      selectChat(fallbackChat.id);
    } finally {
      setIsOpeningGlobal(false);
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full bg-[#000000] border-r border-white/5 flex flex-col shrink-0 select-none relative font-sans">
      <SidebarHeader />
      <FoldersNav />

      {/* Chat List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {pinnedChats.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
              <Pin size={11} className="transform rotate-45 text-[#229ED9]" /> Qadralangan Muloqotlar
            </div>
            {pinnedChats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}

        {unpinnedChats.length > 0 && (
          <div>
            {pinnedChats.length > 0 && (
              <div className="px-3 py-1 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                Barcha Muloqotlar
              </div>
            )}
            {unpinnedChats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}

        {/* Global Search Section */}
        {cleanSearch.length >= 2 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-[#229ED9] uppercase tracking-wider">
              <Globe size={12} /> Global Qidiruv
            </div>
            <button
              onClick={handleGlobalSearchClick}
              disabled={isOpeningGlobal}
              className="w-full p-2.5 rounded-2xl bg-white/5 hover:bg-[#229ED9]/15 border border-white/5 flex items-center justify-between transition-subtle cursor-pointer group mt-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center font-bold text-sm shrink-0">
                  <User size={18} />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-sm font-medium text-white truncate block">@{cleanSearch}</span>
                  <span className="text-[11px] text-white/45 truncate block">Profilini ochish va xabar yozish</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-white/40 group-hover:text-[#229ED9] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          </div>
        )}

        {filteredChats.length === 0 && !cleanSearch && (
          <div className="py-16 text-center text-xs text-white/40">
            Hech qanday muloqot topilmadi
          </div>
        )}
      </div>
    </aside>
  );
};
