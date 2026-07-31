import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, User as UserIcon, Bell, Lock, Palette, Globe, Monitor, Info, LogOut, Check, Camera, PhoneOff, Phone, Loader2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import '../../styles/SettingsModal.css';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, user, updateProfile, logout } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'appearance' | 'sessions' | 'about'>('profile');

  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [allowCalls, setAllowCalls] = useState(user?.allowCalls !== false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Username validation state
  const [usernameCheck, setUsernameCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string | null;
    error: string | null;
  }>({ checking: false, available: null, message: null, error: null });

  useEffect(() => {
    const clean = username.trim().replace(/^@+/, '').toLowerCase();
    if (!clean) {
      setUsernameCheck({ checking: false, available: false, message: null, error: "Username kiritilishi shart" });
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

    if (user?.username && clean === user.username.toLowerCase()) {
      setUsernameCheck({ checking: false, available: true, message: "Joriy username", error: null });
      return;
    }

    setUsernameCheck({ checking: true, available: null, message: null, error: null });
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/chats/check-username/${encodeURIComponent(clean)}?currentId=${user?.id || ''}`);
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
  }, [username, user?.username, user?.id]);

  if (!isSettingsOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ firstName, lastName, username, bio, allowCalls });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleToggleCalls = (value: boolean) => {
    setAllowCalls(value);
    updateProfile({ allowCalls: value });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
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

  const navItems = [
    { key: 'profile', label: 'Mening Profilim', icon: UserIcon },
    { key: 'notifications', label: 'Bildirishnomalar', icon: Bell },
    { key: 'privacy', label: 'Maxfiylik va Xavfsizlik', icon: Lock },
    { key: 'appearance', label: 'Tashqi Ko‘rinish', icon: Palette },
    { key: 'sessions', label: 'Faol Qurilmalar', icon: Monitor },
    { key: 'about', label: 'Ilova Haqida', icon: Info },
  ];

  return (
    <div className="settings-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="settings-card"
      >
        {/* Left Sidebar Tabs */}
        <div className="settings-sidebar">
          <div>
            <h3 className="settings-sidebar-title">Sozlamalar</h3>
            <div className="settings-nav-list">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key as any)}
                    className={`btn-settings-nav transition-subtle ${
                      isActive
                        ? 'btn-settings-nav-active'
                        : 'btn-settings-nav-inactive'
                    }`}
                  >
                    <Icon size={16} /> {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              setIsSettingsOpen(false);
              void handleLogout();
            }}
            className="btn-settings-logout transition-subtle"
          >
            <LogOut size={16} /> Tizimdan chiqish
          </button>
        </div>

        {/* Right Content */}
        <div className="settings-content">
          {/* Header */}
          <div className="settings-content-header">
            <h4 className="settings-content-title">
              {navItems.find((n) => n.key === activeTab)?.label}
            </h4>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="btn-close-settings transition-subtle"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="settings-content-body">
            {saveSuccess && (
              <div className="settings-toast-success">
                <Check size={14} /> Sozlamalar saqlandi!
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="profile-form">
                <div className="profile-avatar-row">
                  <div className="profile-avatar-wrapper">
                    <img
                      src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=avatar'}
                      alt="Avatar"
                      className="profile-avatar-img"
                    />
                    <div className="profile-avatar-hover-overlay">
                      <Camera size={20} style={{ color: '#ffffff' }} />
                    </div>
                  </div>
                  <div>
                    <h5 className="profile-user-name">{user?.firstName} {user?.lastName}</h5>
                    <p className="profile-user-username">@{user?.username}</p>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label className="input-label">Ism</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input-text transition-subtle"
                    />
                  </div>
                  <div>
                    <label className="input-label">Familiya</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input-text transition-subtle"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Foydalanuvchi nomi (Username)</label>
                  <div className={`input-text-prefix-wrapper ${usernameCheck.error ? 'input-error-border' : usernameCheck.available && usernameCheck.message ? 'input-success-border' : ''}`}>
                    <span className="input-prefix-icon">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-text-prefix transition-subtle"
                    />
                  </div>
                  {usernameCheck.checking && (
                    <p style={{ fontSize: '11px', color: '#93c5fd', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 size={12} className="animate-spin" /> Backend bo'yicha tekshirilmoqda...
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
                  <label className="input-label">Haqida (Bio)</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="textarea-bio transition-subtle"
                  />
                </div>

                <button
                  type="submit"
                  disabled={Boolean(usernameCheck.error) || usernameCheck.checking || !firstName.trim()}
                  className={`btn-save-profile transition-subtle ${
                    usernameCheck.error || usernameCheck.checking || !firstName.trim()
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : ''
                  }`}
                >
                  O‘zgarishlarni Saqlash
                </button>
              </form>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="tab-settings-list">
                <div className="setting-toggle-row">
                  <div>
                    <p className="setting-toggle-title">Shaxsiy suhbatlar bildirishnomasi</p>
                    <p className="setting-toggle-desc">Yangi xabarlar kelganda tovush chiqarish</p>
                  </div>
                  <input type="checkbox" defaultChecked style={{ accentColor: '#229ED9', width: 16, height: 16 }} />
                </div>
                <div className="setting-toggle-row">
                  <div>
                    <p className="setting-toggle-title">Guruhlar bildirishnomasi</p>
                    <p className="setting-toggle-desc">Guruh xabarlarini ko'rsatish</p>
                  </div>
                  <input type="checkbox" defaultChecked style={{ accentColor: '#229ED9', width: 16, height: 16 }} />
                </div>
              </div>
            )}

            {/* TAB: PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="tab-settings-list">
                {/* Qo'ng'iroq qilishni o'chirib qo'yish sozlamasi */}
                <div className="privacy-call-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {allowCalls ? <Phone size={18} style={{ color: '#229ED9' }} /> : <PhoneOff size={18} style={{ color: '#FF3B30' }} />}
                    <div>
                      <p className="setting-toggle-title">Audio va Video Qo'ng'iroqlar</p>
                      <p className="setting-toggle-desc">{allowCalls ? "Barcha foydalanuvchilar sizga qo'ng'iroq qila oladi" : "Qo'ng'iroqlar o'chirilgan (Hech kim qo'ng'iroq qila olmaydi)"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCalls(!allowCalls)}
                    className={`toggle-switch-track transition-subtle ${allowCalls ? 'track-active' : 'track-inactive'}`}
                  >
                    <span className={`toggle-switch-thumb ${allowCalls ? 'thumb-active' : 'thumb-inactive'}`} />
                  </button>
                </div>

                <div className="privacy-call-row">
                  <div>
                    <p className="setting-toggle-title">Oxirgi marta ko'ringan vaqt</p>
                    <p className="setting-toggle-desc">Barchaga ruxsat berilgan</p>
                  </div>
                  <span className="text-[#229ED9] font-medium cursor-pointer">Barchaga</span>
                </div>
              </div>
            )}

            {/* TAB: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="tab-settings-list">
                <div className="theme-card">
                  <p className="setting-toggle-title" style={{ marginBottom: '0.5rem' }}>Mavzu uslubi</p>
                  <div className="flex gap-3">
                    <div className="theme-option">
                      <div className="theme-circle" />
                      <span className="text-white font-semibold">Qorong'u Minimal (Apple)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SESSIONS */}
            {activeTab === 'sessions' && (
              <div className="tab-settings-list">
                <div className="session-card">
                  <div className="flex items-center justify-between mb-1">
                    <p className="setting-toggle-title">Xabarchi Web (Ushbu brauzer)</p>
                    <span className="text-emerald-400 font-bold text-[10px]">FAOL</span>
                  </div>
                  <p className="setting-toggle-desc">Toshkent, O‘zbekiston</p>
                </div>
              </div>
            )}

            {/* TAB: ABOUT */}
            {activeTab === 'about' && (
              <div className="about-box">
                <div className="about-logo">
                  <Globe size={32} />
                </div>
                <h4 className="text-base font-bold text-white">Xabarchi Web v1.0.0</h4>
                <p className="text-white/55 max-w-xs mx-auto">
                  Telegram Web talablari asosida Apple uslubidagi premium va tezkor messenjer kloni.
                </p>
                <p className="text-white/30 text-[10px] pt-4">© 2026 Xabarchi Inc. Barcha huquqlar himoyalangan.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
