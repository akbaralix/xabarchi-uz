import React, { useState, useEffect } from 'react';
import { SidebarHeader } from './SidebarHeader';
import { FoldersNav } from './FoldersNav';
import { ChatListItem } from './ChatListItem';
import { useStore } from '../../store/useStore';
import { Pin, User, Users, Megaphone, SearchX, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import type { Chat } from '../../types';
import '../../styles/Sidebar.css';

export const Sidebar: React.FC = () => {
  const { chats, searchQuery, activeFolder, addChat, selectChat } = useStore();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    users: any[];
    channels: any[];
    groups: any[];
  } | null>(null);

  const cleanSearch = searchQuery.trim().replace(/^@+/, '').toLowerCase();

  // Debounced API search request
  useEffect(() => {
    if (!cleanSearch) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.data?.success) {
          setSearchResults({
            users: res.data.users || [],
            channels: res.data.channels || [],
            groups: res.data.groups || []
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, cleanSearch]);

  // Filter local chats by search and active folder
  const filteredChats = chats.filter((chat) => {
    if (!cleanSearch) {
      if (activeFolder === 'all') return true;
      if (activeFolder === 'personal') return chat.folder === 'personal' || chat.type === 'user' || chat.type === 'saved';
      if (activeFolder === 'groups') return chat.type === 'group';
      if (activeFolder === 'channels') return chat.type === 'channel';
      if (activeFolder === 'unread') return chat.unreadCount > 0;
      if (activeFolder === 'archived') return chat.folder === 'archived';
      return true;
    }

    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.username && chat.username.toLowerCase().includes(cleanSearch)) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const pinnedChats = filteredChats.filter((c) => c.isPinned);
  const unpinnedChats = filteredChats.filter((c) => !c.isPinned);

  const handleOpenUser = async (username: string, userObj?: any) => {
    if (!username) return;
    try {
      const res = await api.post(`/api/chats/open-direct/${encodeURIComponent(username)}`);
      if (res.data?.success && res.data?.chat) {
        const chatData: Chat = {
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
          username: res.data.chat.username || username
        };
        addChat(chatData);
        selectChat(chatData.id);
      }
    } catch {
      const fallbackChat: Chat = {
        id: userObj?.id ? `user_${userObj.id}` : `user_${username}`,
        name: userObj ? `${userObj.firstName} ${userObj.lastName || ''}`.trim() : username,
        type: 'user',
        avatar: userObj?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        lastMessage: 'Muloqot boshlandi',
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        folder: 'personal',
        username
      };
      addChat(fallbackChat);
      selectChat(fallbackChat.id);
    }
  };

  const handleOpenChatResult = async (chatItem: any) => {
    try {
      const res = await api.post(`/api/chats/${chatItem.id}/join`);
      if (res.data?.success && res.data?.chat) {
        const chatData: Chat = {
          id: res.data.chat.id,
          name: res.data.chat.name,
          type: res.data.chat.type,
          avatar: res.data.chat.avatar,
          lastMessage: res.data.chat.lastMessage || (chatItem.type === 'channel' ? 'Kanalga qo\'shildingiz' : 'Guruhga qo\'shildingiz'),
          time: res.data.chat.time || new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          folder: chatItem.type === 'channel' ? 'channels' : 'groups',
          username: res.data.chat.username,
          membersCount: res.data.chat.membersCount
        };
        addChat(chatData);
        selectChat(chatData.id);
        return;
      }
    } catch {
      // fallback
    }

    const fallbackChat: Chat = {
      id: chatItem.id,
      name: chatItem.name,
      type: chatItem.type,
      avatar: chatItem.avatar,
      lastMessage: chatItem.lastMessage || '',
      time: chatItem.time || '',
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      folder: chatItem.type === 'channel' ? 'channels' : 'groups',
      username: chatItem.username,
      membersCount: chatItem.membersCount
    };
    addChat(fallbackChat);
    selectChat(fallbackChat.id);
  };

  const hasSearchContent = Boolean(
    filteredChats.length > 0 ||
    (searchResults && (searchResults.users.length > 0 || searchResults.channels.length > 0 || searchResults.groups.length > 0))
  );

  return (
    <aside className="sidebar-aside">
      <SidebarHeader />
      {!cleanSearch && <FoldersNav />}

      {/* Chat List & Search Results Area */}
      <div className="sidebar-chat-list">

        {/* 1. Local Existing Chats */}
        {pinnedChats.length > 0 && (
          <div className="sidebar-pinned-block">
            <div className="sidebar-section-header">
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
              <div className="sidebar-section-header">
                Barcha Muloqotlar
              </div>
            )}
            {unpinnedChats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} />
            ))}
          </div>
        )}

        {/* 2. Skeleton Loading UI */}
        {isSearching && (
          <div className="search-skeletons-wrapper">
            <div className="sidebar-section-header">
              Qidirilmoqda...
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="search-skeleton-item animate-pulse">
                <div className="search-skeleton-avatar" />
                <div className="search-skeleton-lines">
                  <div className="search-skeleton-line-title" />
                  <div className="search-skeleton-line-sub" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Global Categorized Search Results */}
        {!isSearching && cleanSearch && searchResults && (
          <div className="global-categorized-results">

            {/* Category 1: Foydalanuvchilar (Users) */}
            {searchResults.users.length > 0 && (
              <div className="search-category-block">
                <div className="search-category-header">
                  <User size={12} className="text-[#229ED9]" /> Foydalanuvchilar ({searchResults.users.length})
                </div>
                {searchResults.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleOpenUser(u.username, u)}
                    className="search-result-row transition-subtle"
                  >
                    <div className="search-row-avatar-box">
                      <img src={u.avatarUrl} alt={u.firstName} className="search-row-avatar-img" />
                      {u.isOnline && <span className="search-row-online-dot" />}
                    </div>
                    <div className="search-row-info">
                      <div className="search-row-name">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="search-row-sub">
                        @{u.username} • {u.bio || 'Foydalanuvchi'}
                      </div>
                    </div>
                    <ChevronRight size={16} className="search-row-arrow" />
                  </button>
                ))}
              </div>
            )}

            {/* Category 2: Kanallar (Channels) */}
            {searchResults.channels.length > 0 && (
              <div className="search-category-block">
                <div className="search-category-header">
                  <Megaphone size={12} className="text-[#34d399]" /> Kanallar ({searchResults.channels.length})
                </div>
                {searchResults.channels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleOpenChatResult(c)}
                    className="search-result-row transition-subtle"
                  >
                    <div className="search-row-avatar-box">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="search-row-avatar-img" />
                      ) : (
                        <div className="search-row-avatar-placeholder bg-emerald-500/20 text-emerald-400">
                          <Megaphone size={18} />
                        </div>
                      )}
                    </div>
                    <div className="search-row-info">
                      <div className="search-row-name">{c.name}</div>
                      <div className="search-row-sub">
                        @{c.username || 'kanal'} • {c.membersCount || 1} obunachi
                      </div>
                    </div>
                    <ChevronRight size={16} className="search-row-arrow" />
                  </button>
                ))}
              </div>
            )}

            {/* Category 3: Guruhlar / Chatlar (Groups/Chats) */}
            {searchResults.groups.length > 0 && (
              <div className="search-category-block">
                <div className="search-category-header">
                  <Users size={12} className="text-[#fbbf24]" /> Guruhlar ({searchResults.groups.length})
                </div>
                {searchResults.groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleOpenChatResult(g)}
                    className="search-result-row transition-subtle"
                  >
                    <div className="search-row-avatar-box">
                      {g.avatar ? (
                        <img src={g.avatar} alt={g.name} className="search-row-avatar-img" />
                      ) : (
                        <div className="search-row-avatar-placeholder bg-amber-500/20 text-amber-400">
                          <Users size={18} />
                        </div>
                      )}
                    </div>
                    <div className="search-row-info">
                      <div className="search-row-name">{g.name}</div>
                      <div className="search-row-sub">
                        @{g.username || 'guruh'} • {g.membersCount || 1} a'zo
                      </div>
                    </div>
                    <ChevronRight size={16} className="search-row-arrow" />
                  </button>
                ))}
              </div>
            )}

          </div>
        )}

        {/* 4. Empty State UI */}
        {!isSearching && cleanSearch && !hasSearchContent && (
          <div className="search-empty-state">
            <div className="search-empty-icon-box">
              <SearchX size={32} />
            </div>
            <h4 className="search-empty-title">Natija topilmadi</h4>
            <p className="search-empty-desc">
              "@{cleanSearch}" bo'yicha hech qanday foydalanuvchi, guruh yoki kanal topilmadi.
            </p>
          </div>
        )}

        {/* 5. Default No Chat Empty State when not searching */}
        {!cleanSearch && filteredChats.length === 0 && (
          <div className="sidebar-empty-text">
            Hech qanday muloqot topilmadi
          </div>
        )}
      </div>
    </aside>
  );
};

