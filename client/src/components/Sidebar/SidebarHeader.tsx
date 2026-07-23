import React, { useState } from 'react';
import { Search, Settings, Edit3, X, Archive, Bookmark, LogOut, Plus, Users, Megaphone, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

export const SidebarHeader: React.FC = () => {
  const { searchQuery, setSearchQuery, setIsSettingsOpen, user, logout, createChat, selectChat, chats } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'group' | 'channel'>('group');
  const [newChatName, setNewChatName] = useState('');
  const [newChatUsername, setNewChatUsername] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [isPublicChannel, setIsPublicChannel] = useState(true);

  const resetForm = () => {
    setNewChatName('');
    setNewChatUsername('');
    setNewChatDescription('');
    setIsPublicChannel(true);
    setNewChatType('group');
  };

  const openCreateModal = (type: 'group' | 'channel') => {
    setNewChatType(type);
    setIsNewChatOpen(true);
    setIsMenuOpen(false);
  };

  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatName.trim()) return;

    await createChat({
      name: newChatName.trim(),
      type: newChatType,
      username: newChatUsername.trim() ? newChatUsername.trim().replace('@', '') : undefined,
      description: newChatDescription.trim() || undefined,
      isPublic: newChatType === 'channel' ? isPublicChannel : undefined
    });

    resetForm();
    setIsNewChatOpen(false);
  };

  const openSavedMessages = () => {
    const savedChat = chats.find((c) => c.type === 'saved');
    if (savedChat) {
      selectChat(savedChat.id);
    } else {
      selectChat('chat_saved');
    }
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore logout network errors; local state will still clear
    } finally {
      logout();
    }
  };

  return (
    <div className="p-3 border-b border-white/5 bg-[#000000] relative">
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-xl bg-[#0B0B0B] border border-white/5 flex items-center justify-center text-white/70 hover:text-white transition-subtle cursor-pointer"
            title="Menyu"
          >
            <div className="w-4 h-3.5 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-current rounded-full" />
              <span className="w-3/4 h-0.5 bg-current rounded-full" />
              <span className="w-full h-0.5 bg-current rounded-full" />
            </div>
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-12 left-0 z-40 w-64 bg-[#0B0B0B] border border-white/10 rounded-2xl shadow-2xl p-2 space-y-1">
                <div className="p-3 border-b border-white/5 flex items-center gap-3">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#229ED9]/20 text-[#229ED9] font-bold flex items-center justify-center">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-white/40 truncate">@{user?.username || 'username'}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/5 transition-subtle cursor-pointer"
                >
                  <Settings size={16} className="text-[#229ED9]" /> Sozlamalar
                </button>

                <button
                  onClick={openSavedMessages}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/5 transition-subtle cursor-pointer"
                >
                  <Bookmark size={16} className="text-emerald-400" /> Saqlangan xabarlar
                </button>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/5 transition-subtle cursor-pointer"
                >
                  <Archive size={16} className="text-amber-400" /> Arxiv
                </button>

                <div className="border-t border-white/5 pt-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      void handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-subtle cursor-pointer"
                  >
                    <LogOut size={16} /> Tizimdan chiqish
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-white/40" size={16} />
          <input
            type="text"
            placeholder="Qidiruv..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B0B0B] border border-white/5 text-white text-xs rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-[#229ED9]/50 transition-subtle placeholder:text-white/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-white/40 hover:text-white transition-subtle"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => openCreateModal('group')}
          className="w-10 h-10 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] hover:bg-[#229ED9]/25 transition-subtle cursor-pointer shrink-0"
          title="Yangi Guruh yoki Kanal"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-white/40">
        <button
          onClick={() => openCreateModal('group')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-subtle"
        >
          <Users size={12} /> Guruh Yaratish
        </button>
        <button
          onClick={() => openCreateModal('channel')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-subtle"
        >
          <Megaphone size={12} /> Kanal Yaratish
        </button>
      </div>

      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0B0B0B] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {newChatType === 'group' ? <Users size={18} className="text-[#229ED9]" /> : <Megaphone size={18} className="text-[#229ED9]" />}
                  {newChatType === 'group' ? 'Yangi guruh' : 'Yangi kanal'}
                </h3>
                <p className="text-xs text-white/45 mt-1">
                  {newChatType === 'group'
                    ? 'Guruh nomi va tavsifni kiriting.'
                    : 'Kanal nomi va username belgilang. Kanal postlari obunachilarga ko‘rinadi.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsNewChatOpen(false);
                  resetForm();
                }}
                className="text-white/40 hover:text-white transition-subtle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setNewChatType('group')}
                className={`py-2.5 rounded-2xl text-xs font-semibold transition-subtle cursor-pointer ${newChatType === 'group' ? 'bg-[#229ED9] text-white' : 'bg-[#111111] text-white/60'}`}
              >
                Guruh
              </button>
              <button
                type="button"
                onClick={() => setNewChatType('channel')}
                className={`py-2.5 rounded-2xl text-xs font-semibold transition-subtle cursor-pointer ${newChatType === 'channel' ? 'bg-[#229ED9] text-white' : 'bg-[#111111] text-white/60'}`}
              >
                Kanal
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/50 mb-1 font-medium">
                  {newChatType === 'group' ? 'Guruh nomi' : 'Kanal nomi'}
                </label>
                <input
                  type="text"
                  placeholder={newChatType === 'group' ? 'Masalan: Dasturchilar guruhi' : 'Masalan: Xabarchi News'}
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full bg-[#111111] border border-white/10 text-white rounded-2xl px-3 py-3 outline-none focus:border-[#229ED9]"
                  required
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1 font-medium">
                  {newChatType === 'channel' ? 'Kanal username' : 'Username (ixtiyoriy)'}
                </label>
                <input
                  type="text"
                  placeholder={newChatType === 'channel' ? '@xabarchi_news' : '@dev_group'}
                  value={newChatUsername}
                  onChange={(e) => setNewChatUsername(e.target.value)}
                  className="w-full bg-[#111111] border border-white/10 text-white rounded-2xl px-3 py-3 outline-none focus:border-[#229ED9]"
                />
              </div>

              <div>
                <label className="block text-white/50 mb-1 font-medium">Tavsif</label>
                <textarea
                  placeholder={newChatType === 'channel' ? 'Kanal tavsifi' : 'Guruh tavsifi'}
                  value={newChatDescription}
                  onChange={(e) => setNewChatDescription(e.target.value)}
                  className="w-full min-h-24 bg-[#111111] border border-white/10 text-white rounded-2xl px-3 py-3 outline-none focus:border-[#229ED9] resize-none"
                />
              </div>

              {newChatType === 'channel' && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#111111] border border-white/10">
                  <div>
                    <p className="text-white font-medium">Ochiq kanal</p>
                    <p className="text-[11px] text-white/40">Boshqalar username orqali topa oladi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublicChannel(!isPublicChannel)}
                    className={`w-14 h-8 rounded-full border transition-subtle relative ${isPublicChannel ? 'bg-[#229ED9] border-[#229ED9]' : 'bg-white/10 border-white/10'}`}
                  >
                    <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${isPublicChannel ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}

              {newChatType === 'group' && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#111111] border border-white/10 text-[11px] text-white/45">
                  <Lock size={14} className="text-white/45" />
                  Guruhda xabarlar ikki tomonlama bo'ladi va suhbat erkin davom etadi.
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#229ED9] text-white font-medium py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  {newChatType === 'group' ? 'Guruh yaratish' : 'Kanal yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
