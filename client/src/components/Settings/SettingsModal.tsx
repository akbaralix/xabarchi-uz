import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, User as UserIcon, Bell, Lock, Palette, Globe, Monitor, Info, LogOut, Check, Camera, PhoneOff, Phone
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl h-[560px] bg-[#0B0B0B] border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden relative"
      >
        {/* Left Sidebar Tabs */}
        <div className="w-64 bg-[#000000] border-r border-white/5 p-3 flex flex-col justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white px-3 py-2 mb-2">Sozlamalar</h3>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-subtle cursor-pointer ${
                      isActive
                        ? 'bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-subtle cursor-pointer"
          >
            <LogOut size={16} /> Tizimdan chiqish
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0B0B0B]">
          {/* Header */}
          <div className="h-14 px-6 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">
              {navItems.find((n) => n.key === activeTab)?.label}
            </h4>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-white/40 hover:text-white transition-subtle p-1.5 rounded-xl cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {saveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check size={14} /> Sozlamalar saqlandi!
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative group">
                    <img
                      src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=avatar'}
                      alt="Avatar"
                      className="w-20 h-20 rounded-3xl object-cover border border-white/10"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={20} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</h5>
                    <p className="text-xs text-[#229ED9]">@{user?.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1 font-medium">Ism</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#111111] border border-white/5 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-[#229ED9]/50 transition-subtle"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1 font-medium">Familiya</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#111111] border border-white/5 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-[#229ED9]/50 transition-subtle"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1 font-medium">Foydalanuvchi nomi (Username)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-white/40 text-xs">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#111111] border border-white/5 text-white text-xs rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-[#229ED9]/50 transition-subtle"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1 font-medium">Haqida (Bio)</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-[#111111] border border-white/5 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-[#229ED9]/50 transition-subtle resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-medium text-xs px-5 py-2.5 rounded-xl transition-subtle cursor-pointer"
                >
                  O‘zgarishlarni Saqlash
                </button>
              </form>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 max-w-md text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-white/5">
                  <div>
                    <p className="font-semibold text-white">Shaxsiy suhbatlar bildirishnomasi</p>
                    <p className="text-white/40">Yangi xabarlar kelganda tovush chiqarish</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-[#229ED9] w-4 h-4" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-white/5">
                  <div>
                    <p className="font-semibold text-white">Guruhlar bildirishnomasi</p>
                    <p className="text-white/40">Guruh xabarlarini ko'rsatish</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-[#229ED9] w-4 h-4" />
                </div>
              </div>
            )}

            {/* TAB: PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="space-y-4 max-w-md text-xs">
                {/* Qo'ng'iroq qilishni o'chirib qo'yish sozlamasi */}
                <div className="p-3.5 rounded-xl bg-[#111111] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {allowCalls ? <Phone size={18} className="text-[#229ED9]" /> : <PhoneOff size={18} className="text-[#FF3B30]" />}
                    <div>
                      <p className="font-semibold text-white">Audio va Video Qo'ng'iroqlar</p>
                      <p className="text-white/40">{allowCalls ? "Barcha foydalanuvchilar sizga qo'ng'iroq qila oladi" : "Qo'ng'iroqlar o'chirilgan (Hech kim qo'ng'iroq qila olmaydi)"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCalls(!allowCalls)}
                    className={`w-12 h-7 rounded-full border transition-subtle relative cursor-pointer ${allowCalls ? 'bg-[#229ED9] border-[#229ED9]' : 'bg-white/10 border-white/10'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${allowCalls ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#111111] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">Oxirgi marta ko'ringan vaqt</p>
                    <p className="text-white/40">Barchaga ruxsat berilgan</p>
                  </div>
                  <span className="text-[#229ED9] font-medium cursor-pointer">Barchaga</span>
                </div>
              </div>
            )}

            {/* TAB: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-4 max-w-md text-xs">
                <div className="p-4 rounded-xl bg-[#111111] border border-white/5">
                  <p className="font-semibold text-white mb-2">Mavzu uslubi</p>
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 rounded-xl bg-[#000000] border-2 border-[#229ED9] text-center cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-[#229ED9] mx-auto mb-1" />
                      <span className="text-white font-semibold">Qorong'u Minimal (Apple)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SESSIONS */}
            {activeTab === 'sessions' && (
              <div className="space-y-3 max-w-md text-xs">
                <div className="p-3 rounded-xl bg-[#111111] border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-white">Xabarchi Web (Ushbu brauzer)</p>
                    <span className="text-emerald-400 font-bold text-[10px]">FAOL</span>
                  </div>
                  <p className="text-white/40">Toshkent, O‘zbekiston</p>
                </div>
              </div>
            )}

            {/* TAB: ABOUT */}
            {activeTab === 'about' && (
              <div className="text-center py-8 text-xs space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-[#111111] border border-white/5 flex items-center justify-center mx-auto text-[#229ED9] mb-3">
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
