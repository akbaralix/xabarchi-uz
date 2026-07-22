import React from 'react';
import { SidebarHeader } from './SidebarHeader';
import { FoldersNav } from './FoldersNav';
import { ChatListItem } from './ChatListItem';
import { useStore } from '../../store/useStore';
import { Pin } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { chats, searchQuery, activeFolder } = useStore();

  // Filter chats by search and active folder
  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full bg-[#000000] border-r border-white/5 flex flex-col shrink-0 select-none relative">
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

        {filteredChats.length === 0 && (
          <div className="py-16 text-center text-xs text-white/40">
            Hech qanday muloqot topilmadi
          </div>
        )}
      </div>
    </aside>
  );
};
