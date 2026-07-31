import React, { useState, useEffect } from 'react';
import { Search, Settings, Edit3, X, Archive, Bookmark, LogOut, Plus, Users, Megaphone, Lock, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import '../../styles/SidebarHeader.css';

export const SidebarHeader: React.FC = () => {
  const { searchQuery, setSearchQuery, setIsSettingsOpen, user, logout, createChat, selectChat, chats } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatType, setNewChatType] = useState<'group' | 'channel'>('group');
  const [newChatName, setNewChatName] = useState('');
  const [newChatUsername, setNewChatUsername] = useState('');
  const [newChatDescription, setNewChatDescription] = useState('');
  const [isPublicChannel, setIsPublicChannel] = useState(true);

  // New Chat Username Check
  const [usernameCheck, setUsernameCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string | null;
    error: string | null;
  }>({ checking: false, available: null, message: null, error: null });

  useEffect(() => {
    const clean = newChatUsername.trim().replace(/^@+/, '').toLowerCase();
    
    if (!clean) {
      if (newChatType === 'channel' && isPublicChannel) {
        setUsernameCheck({ checking: false, available: false, message: null, error: "Ochiq kanal uchun username kiritilishi shart" });
      } else {
        setUsernameCheck({ checking: false, available: null, message: null, error: null });
      }
      return;
    }

    if (!/^[a-z0-9_]{3,32}$/.test(clean)) {
      setUsernameCheck({
        checking: false,
        available: false,
        message: null,
        error: "Username 3-32 ta kichik lotin harfi, raqam yoki '_' bo'lishi kerak"
      });
      return;
    }

    setUsernameCheck({ checking: true, available: null, message: null, error: null });
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/chats/check-username/${encodeURIComponent(clean)}`);
        if (res.data?.available) {
          setUsernameCheck({ checking: false, available: true, message: "Bu username bo'sh va foydalanishga tayyor!", error: null });
        } else {
          setUsernameCheck({ checking: false, available: false, message: null, error: res.data?.message || "Bu username allaqachon band" });
        }
      } catch {
        setUsernameCheck({ checking: false, available: false, message: null, error: "Tekshirishda xatolik bor" });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [newChatUsername, newChatType, isPublicChannel]);

  const resetForm = () => {
    setNewChatName('');
    setNewChatUsername('');
    setNewChatDescription('');
    setIsPublicChannel(true);
    setNewChatType('group');
    setUsernameCheck({ checking: false, available: null, message: null, error: null });
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
    <div className="sidebar-header-root">
      <div className="sidebar-header-top">
        <div className="menu-button-relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn-sidebar-menu transition-subtle"
            title="Menyu"
          >
            <div className="hamburger-wrapper">
              <span className="hamburger-line-full" />
              <span className="hamburger-line-three-quarter" />
              <span className="hamburger-line-full" />
            </div>
          </button>

          {isMenuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setIsMenuOpen(false)} />
              <div className="menu-dropdown">
                <div className="menu-user-info">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="menu-user-avatar-img" />
                  ) : (
                    <div className="menu-user-avatar-placeholder">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="menu-user-text">
                    <p className="menu-user-name">{user?.firstName} {user?.lastName}</p>
                    <p className="menu-user-username">@{user?.username || 'username'}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="btn-menu-item transition-subtle"
                >
                  <Settings size={16} className="text-[#229ED9]" /> Sozlamalar
                </button>

                <button
                  onClick={openSavedMessages}
                  className="btn-menu-item transition-subtle"
                >
                  <Bookmark size={16} style={{ color: '#34d399' }} /> Saqlangan xabarlar
                </button>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="btn-menu-item transition-subtle"
                >
                  <Archive size={16} style={{ color: '#fbbf24' }} /> Arxiv
                </button>

                <div className="menu-footer-border">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      void handleLogout();
                    }}
                    className="btn-menu-logout transition-subtle"
                  >
                    <LogOut size={16} /> Tizimdan chiqish
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="search-input-wrapper">
          <Search className="search-icon-left" size={16} />
          <input
            type="text"
            placeholder="Qidiruv..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-field transition-subtle"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-search-clear transition-subtle"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => openCreateModal('group')}
          className="btn-create-chat-icon transition-subtle"
          title="Yangi Guruh yoki Kanal"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <div className="quick-tags-row">
        <button
          onClick={() => openCreateModal('group')}
          className="btn-quick-tag transition-subtle"
        >
          <Users size={12} /> Guruh Yaratish
        </button>
        <button
          onClick={() => openCreateModal('channel')}
          className="btn-quick-tag transition-subtle"
        >
          <Megaphone size={12} /> Kanal Yaratish
        </button>
      </div>

      {isNewChatOpen && (
        <div className="create-modal-overlay">
          <div className="create-modal-card">
            <div className="create-modal-header">
              <div>
                <h3 className="create-modal-title">
                  {newChatType === 'group' ? <Users size={18} className="text-[#229ED9]" /> : <Megaphone size={18} className="text-[#229ED9]" />}
                  {newChatType === 'group' ? 'Yangi guruh' : 'Yangi kanal'}
                </h3>
                <p className="create-modal-desc">
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
                className="btn-create-modal-close transition-subtle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="create-type-switcher">
              <button
                type="button"
                onClick={() => setNewChatType('group')}
                className={`btn-type-tab transition-subtle ${newChatType === 'group' ? 'tab-active' : 'tab-inactive'}`}
              >
                Guruh
              </button>
              <button
                type="button"
                onClick={() => setNewChatType('channel')}
                className={`btn-type-tab transition-subtle ${newChatType === 'channel' ? 'tab-active' : 'tab-inactive'}`}
              >
                Kanal
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="create-chat-form">
              <div>
                <label className="create-field-label">
                  {newChatType === 'group' ? 'Guruh nomi' : 'Kanal nomi'}
                </label>
                <input
                  type="text"
                  placeholder={newChatType === 'group' ? 'Masalan: Dasturchilar guruhi' : 'Masalan: Xabarchi News'}
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="create-input-field"
                  required
                />
              </div>

              <div>
                <label className="create-field-label">
                  {newChatType === 'channel' ? 'Kanal username' : 'Username (ixtiyoriy)'}
                </label>
                <input
                  type="text"
                  placeholder={newChatType === 'channel' ? '@xabarchi_news' : '@dev_group'}
                  value={newChatUsername}
                  onChange={(e) => setNewChatUsername(e.target.value)}
                  className={`create-input-field ${usernameCheck.error ? 'border-red-500' : usernameCheck.available ? 'border-emerald-500' : ''}`}
                />
                {usernameCheck.checking && (
                  <p style={{ fontSize: '11px', color: '#93c5fd', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Loader2 size={12} className="animate-spin" /> Username tekshirilmoqda...
                  </p>
                )}
                {usernameCheck.error && (
                  <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 500 }}>
                    ⚠️ {usernameCheck.error}
                  </p>
                )}
                {usernameCheck.available && usernameCheck.message && (
                  <p style={{ fontSize: '11px', color: '#34d399', marginTop: '4px', fontWeight: 500 }}>
                    ✓ {usernameCheck.message}
                  </p>
                )}
              </div>

              <div>
                <label className="create-field-label">Tavsif</label>
                <textarea
                  placeholder={newChatType === 'channel' ? 'Kanal tavsifi' : 'Guruh tavsifi'}
                  value={newChatDescription}
                  onChange={(e) => setNewChatDescription(e.target.value)}
                  className="create-textarea-field"
                />
              </div>

              {newChatType === 'channel' && (
                <div className="create-public-switch-box">
                  <div>
                    <p style={{ color: '#ffffff', fontWeight: 500, margin: 0 }}>Ochiq kanal</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Boshqalar username orqali topa oladi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublicChannel(!isPublicChannel)}
                    className={`create-switch-track transition-subtle ${isPublicChannel ? 'track-active' : 'track-inactive'}`}
                  >
                    <span className={`create-switch-thumb ${isPublicChannel ? 'thumb-active' : 'thumb-inactive'}`} />
                  </button>
                </div>
              )}

              {newChatType === 'group' && (
                <div className="group-privacy-note">
                  <Lock size={14} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
                  Guruhda xabarlar ikki tomonlama bo'ladi va suhbat erkin davom etadi.
                </div>
              )}

              <div style={{ paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={Boolean(usernameCheck.error) || usernameCheck.checking || !newChatName.trim()}
                  className={`btn-submit-create-chat transition-subtle ${
                    usernameCheck.error || usernameCheck.checking || !newChatName.trim()
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : ''
                  }`}
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
