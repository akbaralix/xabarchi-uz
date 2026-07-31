import React, { useState } from 'react';
import { Check, CheckCheck, Clock, Reply, Trash2, Pin, Eye, Edit3, Play, Pause, Volume2 } from 'lucide-react';
import type { ChatType, Message } from '../../types';
import { useStore } from '../../store/useStore';
import '../../styles/MessageItem.css';

interface Props {
  message: Message;
  chatType?: ChatType;
}

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '😂', '👏'];

export const MessageItem: React.FC<Props> = ({ message, chatType }) => {
  const { toggleReaction, deleteMessage, pinMessage, setReplyingTo, setEditingMessage, activeChatId } = useStore();
  const [showActions, setShowActions] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isOutgoing = message.isOutgoing;
  const isChannelPost = chatType === 'channel';

  const toggleAudio = (url: string) => {
    if (isPlayingAudio && audioObj) {
      audioObj.pause();
      setIsPlayingAudio(false);
    } else {
      const audio = new Audio(url);
      setAudioObj(audio);
      audio.play();
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
    }
  };

  const renderStatus = () => {
    if (!isOutgoing || isChannelPost) return null;
    if (message.status === 'sending') return <Clock size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />;
    if (message.status === 'delivered') return <Check size={12} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />;
    return <CheckCheck size={14} className="text-[#229ED9]" />;
  };

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`message-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}`}
    >
      {/* Lightbox Modal for Full Image View */}
      {isLightboxOpen && message.media?.url && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="lightbox-overlay"
        >
          <img
            src={message.media.url}
            alt="Full size"
            className="lightbox-image"
          />
        </div>
      )}

      <div className="message-container">
        {showActions && (
          <div
            className={`message-actions-popover animate-fade-in ${
              isOutgoing ? 'popover-right' : 'popover-left'
            }`}
          >
            {EMOJI_OPTIONS.slice(0, 3).map((emoji) => (
              <button
                key={emoji}
                onClick={() => activeChatId && toggleReaction(activeChatId, message.id, emoji)}
                className="btn-action-emoji"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setReplyingTo(message)}
              className="btn-action-icon transition-subtle"
              title="Javob berish"
            >
              <Reply size={13} />
            </button>

            {isOutgoing && message.text && (
              <button
                onClick={() => setEditingMessage(message)}
                className="btn-action-icon-blue transition-subtle"
                title="Tahrirlash"
              >
                <Edit3 size={13} />
              </button>
            )}

            <button
              onClick={() => activeChatId && pinMessage(activeChatId, message.id)}
              className="btn-action-icon-blue transition-subtle"
              title="Qadash"
            >
              <Pin size={13} />
            </button>
            <button
              onClick={() => activeChatId && deleteMessage(activeChatId, message.id)}
              className="btn-action-icon-red transition-subtle"
              title="O'chirish"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        <div
          className={`message-bubble ${
            isOutgoing ? 'bubble-outgoing' : 'bubble-incoming'
          }`}
        >
          {!isOutgoing && message.senderName && (
            <p className="msg-sender-name">{message.senderName}</p>
          )}

          {message.replyTo && (
            <div className="msg-reply-box">
              <span className="reply-box-sender">{message.replyTo.senderName}</span>
              <span className="reply-box-text line-clamp-1">{message.replyTo.text}</span>
            </div>
          )}

          {/* Media Attachments */}
          {message.media && (
            <div className="msg-media-container">
              {message.media.type === 'image' && (
                <div className="msg-media-img-wrapper" onClick={() => setIsLightboxOpen(true)}>
                  <img
                    src={message.media.url}
                    alt="Attachment"
                    className="msg-media-img"
                  />
                </div>
              )}

              {message.media.type === 'voice' && (
                <div className="msg-voice-box">
                  <button
                    onClick={() => toggleAudio(message.media!.url)}
                    className="btn-voice-toggle transition-subtle"
                  >
                    {isPlayingAudio ? <Pause size={14} /> : <Play size={14} style={{ transform: 'translateX(1px)' }} />}
                  </button>
                  <div className="voice-info-container">
                    <div className="voice-info-header">
                      <Volume2 size={12} className="text-[#229ED9]" />
                      <span>Ovozli xabar</span>
                    </div>
                    <span className="voice-duration">{message.media.duration || '0:05'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {message.text && <p className="message-text">{message.text}</p>}

          <div className="message-meta-row">
            {message.isEdited && <span className="edited-tag">tahrirlandi</span>}
            {message.isPinned && <Pin size={10} className="pin-icon" />}
            {isChannelPost && typeof message.views === 'number' && (
              <span className="views-tag">
                <Eye size={10} />
                {message.views}
              </span>
            )}
            <span>{message.time}</span>
            {renderStatus()}
          </div>
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`reactions-row ${
              isOutgoing ? 'reactions-outgoing' : 'reactions-incoming'
            }`}
          >
            {message.reactions.map((emoji, i) => (
              <span
                key={i}
                onClick={() => activeChatId && toggleReaction(activeChatId, message.id, emoji)}
                className="reaction-chip transition-subtle"
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
