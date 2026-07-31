import React from 'react';
import { Phone, Video, Search, PanelRight, Bookmark, ArrowLeft, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import '../../styles/ChatHeader.css';

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
    <div className="chat-header">
      {/* Mobile Back Button & User/Group Info */}
      <div className="chat-header-info-wrapper">
        <button
          onClick={() => selectChat(null)}
          className="btn-mobile-back transition-subtle"
          title="Muloqotlar ro'yxatiga qaytish"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          className="chat-header-info"
          onClick={toggleRightPanel}
        >
          {currentChat.type === 'saved' ? (
            <div className="saved-avatar-box">
              <Bookmark size={20} />
            </div>
          ) : currentChat.avatar ? (
            <img
              src={currentChat.avatar}
              alt={currentChat.name}
              className="chat-header-avatar-img"
            />
          ) : (
            <div className="chat-header-avatar-placeholder">
              {currentChat.name[0]}
            </div>
          )}

          <div className="chat-header-text-container">
            <h3 className="chat-header-name">{currentChat.name}</h3>
            <p className="chat-header-subtitle">{renderSubtitle()}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="chat-header-actions">
        <button
          className="btn-chat-header-action transition-subtle"
          title="Qidiruv"
        >
          <Search size={18} />
        </button>

        {currentChat.type === 'user' && (
          <>
            <button
              onClick={() => handleCallClick(false)}
              className="btn-chat-header-call transition-subtle"
              title="Audio qo'ng'iroq"
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => handleCallClick(true)}
              className="btn-chat-header-call transition-subtle"
              title="Video muloqot"
            >
              <Video size={18} />
            </button>
          </>
        )}

        {currentChat.type !== 'saved' && (
          <button
            onClick={handleDeleteChat}
            className="btn-chat-header-delete transition-subtle"
            title="Chatni o'chirish"
          >
            <Trash2 size={18} />
          </button>
        )}

        <button
          onClick={toggleRightPanel}
          className={`btn-chat-header-panel transition-subtle ${
            isRightPanelOpen
              ? 'btn-chat-header-panel-active'
              : ''
          }`}
          title="Ma'lumot paneli"
        >
          <PanelRight size={18} />
        </button>
      </div>
    </div>
  );
};
