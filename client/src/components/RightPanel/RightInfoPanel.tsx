import React from 'react';
import { X, Bell, BellOff, FileText, Users, Megaphone, Eye, MessageSquare } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const RightInfoPanel: React.FC = () => {
  const { chats, activeChatId, messagesMap, isRightPanelOpen, toggleRightPanel, toggleMuteChat } = useStore();

  const currentChat = chats.find((chat) => chat.id === activeChatId);
  const currentMessages = currentChat ? messagesMap[currentChat.id] || [] : [];

  if (!isRightPanelOpen || !currentChat) return null;

  const totalViews = currentMessages.reduce((sum, message) => sum + (message.views || 0), 0);
  const recentItems = [...currentMessages].slice(-4).reverse();

  return (
    <aside className="fixed inset-0 z-40 md:relative md:z-auto w-full md:w-80 h-full bg-[#000000] md:bg-[#000000] border-l border-white/5 flex flex-col shrink-0 select-none">
      <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Ma'lumotlar</h3>
        <button
          onClick={toggleRightPanel}
          className="text-white/70 hover:text-white p-2 rounded-xl active:bg-white/10 transition-subtle cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#0B0B0B] border border-white/5">
          {currentChat.type === 'saved' ? (
            <div className="w-20 h-20 rounded-3xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] mb-3">
              <MessageSquare size={36} />
            </div>
          ) : currentChat.type === 'channel' ? (
            <div className="w-20 h-20 rounded-3xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] mb-3">
              <Megaphone size={36} />
            </div>
          ) : currentChat.type === 'group' ? (
            <div className="w-20 h-20 rounded-3xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] mb-3">
              <Users size={36} />
            </div>
          ) : currentChat.avatar ? (
            <img
              src={currentChat.avatar}
              alt={currentChat.name}
              className="w-20 h-20 rounded-3xl object-cover border border-white/5 mb-3"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-[#111111] border border-white/5 flex items-center justify-center text-2xl font-bold text-white mb-3">
              {currentChat.name[0]}
            </div>
          )}

          <h4 className="text-base font-bold text-white mb-0.5">{currentChat.name}</h4>
          {currentChat.username && <p className="text-xs text-[#229ED9] font-medium mb-2">@{currentChat.username}</p>}
          <p className="text-xs text-white/50">
            {currentChat.description || (currentChat.type === 'channel'
              ? 'Kanal postlari va ko‘rishlar statistikasi'
              : currentChat.type === 'group'
                ? 'Guruhdagi suhbatlar va a’zolar'
                : 'Shaxsiy suhbat')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-2xl bg-[#0B0B0B] border border-white/5">
            <p className="text-[11px] text-white/40">Xabarlar</p>
            <p className="text-lg font-bold text-white">{currentMessages.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#0B0B0B] border border-white/5">
            <p className="text-[11px] text-white/40">{currentChat.type === 'channel' ? 'Ko‘rishlar' : 'Holat'}</p>
            <p className="text-lg font-bold text-white">
              {currentChat.type === 'channel' ? totalViews : currentChat.isMuted ? 'Jim' : 'Faol'}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#0B0B0B] border border-white/5 space-y-3 text-xs">
          {currentChat.type === 'user' && (
            <div className="flex items-center justify-between py-1">
              <span className="text-white/40 font-medium">Telefon raqam</span>
              <span className="text-white font-medium">+998 90 123 45 67</span>
            </div>
          )}

          {currentChat.type === 'group' && (
            <div className="flex items-center justify-between py-1">
              <span className="text-white/40 font-medium">A'zolar soni</span>
              <span className="text-white font-medium">{currentChat.membersCount || 25}</span>
            </div>
          )}

          {currentChat.type === 'channel' && (
            <>
              <div className="flex items-center justify-between py-1">
                <span className="text-white/40 font-medium">Obunachilar</span>
                <span className="text-white font-medium">{currentChat.membersCount || 120}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-white/40 font-medium">Kanal turi</span>
                <span className="text-white font-medium">{currentChat.isPublic ? 'Ochiq' : 'Yopiq'}</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between py-1">
            <span className="text-white/40 font-medium">Bildirishnomalar</span>
            <button
              onClick={() => activeChatId && toggleMuteChat(activeChatId)}
              className="flex items-center gap-1.5 text-xs text-[#229ED9] font-semibold cursor-pointer"
            >
              {currentChat.isMuted ? (
                <>
                  <BellOff size={14} className="text-[#FF3B30]" /> O'chirilgan
                </>
              ) : (
                <>
                  <Bell size={14} /> Yoqilgan
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-white/40 uppercase tracking-wider">
            <FileText size={12} /> Oxirgi xabarlar / postlar
          </div>

          {recentItems.length > 0 ? (
            recentItems.map((message) => (
              <div key={message.id} className="p-3 rounded-2xl bg-[#0B0B0B] border border-white/5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-medium text-white truncate">{message.text || 'Media bo‘lmagan post'}</p>
                  {currentChat.type === 'channel' && typeof message.views === 'number' && (
                    <span className="flex items-center gap-1 text-[10px] text-white/45 shrink-0">
                      <Eye size={10} />
                      {message.views}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/40">{message.time}</p>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-2xl bg-[#0B0B0B] border border-white/5 text-xs text-white/40 text-center">
              Hali hech qanday xabar yo'q
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
