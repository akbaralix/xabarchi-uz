import React from 'react';
import { Phone, Video, Search, PanelRight, Bookmark, ArrowLeft, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Props {
  onStartCall?: (isVideo: boolean) => void;
}

export const ChatHeader: React.FC<Props> = ({ onStartCall }) => {
  const { chats, activeChatId, selectChat, toggleRightPanel, isRightPanelOpen, user, deleteChat } = useStore();
  const currentChat = chats.find((c) => c.id === activeChatId);

  if (!currentChat) return null;

  const handleCallClick = (isVideo: boolean) => {
    if (user?.allowCalls === false) {
      alert("Siz sozlamalardan qo'ng'iroqlarni o'chirib qo'ygansiz. Qo'ng'iroq qilish uchun sozlamalarni o'zgartiring.");
      return;
    }
    if (onStartCall) {
      onStartCall(isVideo);
    }
  };

  const handleDeleteChat = () => {
    if (!activeChatId) return;
    if (window.confirm(`"${currentChat.name}" muloqotini va unga tegishli barcha xabarlarni o'chirmoqchimisiz?`)) {
      void deleteChat(activeChatId);
    }
  };

  const renderSubtitle = () => {
    if (currentChat.type === 'saved') return 'Shaxsiy saqlangan xabarlar';
    if (currentChat.type === 'group') return `${currentChat.membersCount || 1} a'zo • guruh`;
    if (currentChat.type === 'channel') return `${currentChat.membersCount || 1} obunachi • kanal`;
    if (currentChat.type === 'bot') return 'bot';
    return currentChat.isOnline ? "online" : "yaqinda bo'lgan";
  };

  return (
    <div className="h-16 px-3 md:px-4 bg-[#000000] border-b border-white/5 flex items-center justify-between shrink-0 select-none z-10">
      {/* Mobile Back Button & User/Group Info */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        <button
          onClick={() => selectChat(null)}
          className="md:hidden text-white/70 hover:text-white p-2 rounded-xl active:bg-white/10 transition-subtle shrink-0 cursor-pointer"
          title="Muloqotlar ro'yxatiga qaytish"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
          onClick={toggleRightPanel}
        >
          {currentChat.type === 'saved' ? (
            <div className="w-10 h-10 rounded-2xl bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] shrink-0">
              <Bookmark size={20} />
            </div>
          ) : currentChat.avatar ? (
            <img
              src={currentChat.avatar}
              alt={currentChat.name}
              className="w-10 h-10 rounded-2xl object-cover border border-white/5 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-[#111111] border border-white/5 flex items-center justify-center font-bold text-white text-base shrink-0">
              {currentChat.name[0]}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate leading-tight">{currentChat.name}</h3>
            <p className="text-[11px] text-white/40 truncate font-normal leading-tight mt-0.5">{renderSubtitle()}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/55 hover:text-white hover:bg-white/5 transition-subtle cursor-pointer"
          title="Qidiruv"
        >
          <Search size={18} />
        </button>

        {currentChat.type === 'user' && (
          <>
            <button
              onClick={() => handleCallClick(false)}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-white/55 hover:text-white hover:bg-white/5 transition-subtle cursor-pointer"
              title="Audio qo'ng'iroq"
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => handleCallClick(true)}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-white/55 hover:text-white hover:bg-white/5 transition-subtle cursor-pointer"
              title="Video muloqot"
            >
              <Video size={18} />
            </button>
          </>
        )}

        {currentChat.type !== 'saved' && (
          <button
            onClick={handleDeleteChat}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/55 hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-subtle cursor-pointer"
            title="Chatni o'chirish"
          >
            <Trash2 size={18} />
          </button>
        )}

        <button
          onClick={toggleRightPanel}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-subtle cursor-pointer ${
            isRightPanelOpen
              ? 'bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30'
              : 'text-white/55 hover:text-white hover:bg-white/5'
          }`}
          title="Ma'lumot paneli"
        >
          <PanelRight size={18} />
        </button>
      </div>
    </div>
  );
};
