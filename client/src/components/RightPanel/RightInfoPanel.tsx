import React from 'react';
import { X, Bell, BellOff, Users, Megaphone, MessageSquare, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import '../../styles/RightInfoPanel.css';

export const RightInfoPanel: React.FC = () => {
  const { chats, activeChatId, messagesMap, isRightPanelOpen, toggleRightPanel, toggleMuteChat, deleteChat } = useStore();

  const currentChat = chats.find((chat) => chat.id === activeChatId);
  const currentMessages = currentChat ? messagesMap[currentChat.id] || [] : [];

  if (!isRightPanelOpen || !currentChat) return null;

  const totalViews = currentMessages.reduce((sum, message) => sum + (message.views || 0), 0);

  const handleDeleteChat = () => {
    if (!activeChatId) return;
    if (window.confirm(`"${currentChat.name}" muloqotini va unga tegishli barcha xabarlarni o'chirmoqchimisiz?`)) {
      toggleRightPanel();
      void deleteChat(activeChatId);
    }
  };

  return (
    <aside className="right-panel-aside">
      <div className="right-panel-header">
        <h3 className="right-panel-title">Ma'lumotlar</h3>
        <button
          onClick={toggleRightPanel}
          className="btn-close-panel transition-subtle"
        >
          <X size={20} />
        </button>
      </div>

      <div className="right-panel-body">
        <div className="panel-info-card">
          {currentChat.type === 'saved' ? (
            <div className="panel-icon-box">
              <MessageSquare size={36} />
            </div>
          ) : currentChat.type === 'channel' ? (
            <div className="panel-icon-box">
              <Megaphone size={36} />
            </div>
          ) : currentChat.type === 'group' ? (
            <div className="panel-icon-box">
              <Users size={36} />
            </div>
          ) : currentChat.avatar ? (
            <img
              src={currentChat.avatar}
              alt={currentChat.name}
              className="panel-avatar-img"
            />
          ) : (
            <div className="panel-avatar-placeholder">
              {currentChat.name[0]}
            </div>
          )}

          <h4 className="panel-chat-name">{currentChat.name}</h4>
          {currentChat.username && <p className="panel-chat-username">@{currentChat.username}</p>}
          <p className="panel-chat-desc">
            {currentChat.description || (currentChat.type === 'channel'
              ? 'Kanal postlari va ko‘rishlar statistikasi'
              : currentChat.type === 'group'
                ? 'Guruhdagi suhbatlar va a’zolar'
                : 'Shaxsiy suhbat')}
          </p>
        </div>

        <div className="panel-stats-grid">
          <div className="stat-card">
            <p className="stat-label">Xabarlar</p>
            <p className="stat-value">{currentMessages.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{currentChat.type === 'channel' ? 'Ko‘rishlar' : 'Holat'}</p>
            <p className="stat-value">
              {currentChat.type === 'channel' ? totalViews : currentChat.isMuted ? 'Jim' : 'Faol'}
            </p>
          </div>
        </div>

        <div className="panel-details-list">
          {currentChat.type === 'group' && (
            <div className="panel-details-row">
              <span className="details-label">A'zolar soni</span>
              <span className="details-value">{currentChat.membersCount || 1}</span>
            </div>
          )}

          {currentChat.type === 'channel' && (
            <>
              <div className="panel-details-row">
                <span className="details-label">Obunachilar</span>
                <span className="details-value">{currentChat.membersCount || 1}</span>
              </div>
              <div className="panel-details-row">
                <span className="details-label">Kanal turi</span>
                <span className="details-value">{currentChat.isPublic ? 'Ochiq' : 'Yopiq'}</span>
              </div>
            </>
          )}

          <div className="panel-details-row">
            <span className="details-label">Bildirishnomalar</span>
            <button
              onClick={() => activeChatId && toggleMuteChat(activeChatId)}
              className="btn-mute-toggle"
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

        {currentChat.type !== 'saved' && (
          <button
            onClick={handleDeleteChat}
            className="btn-delete-chat-right transition-subtle"
          >
            <Trash2 size={16} /> Chatni o'chirish
          </button>
        )}
      </div>
    </aside>
  );
};
