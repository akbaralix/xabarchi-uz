import React, { useState } from 'react';
import { Check, CheckCheck, Clock, Reply, Trash2, Pin, Eye, Edit3, Play, Pause, Volume2 } from 'lucide-react';
import type { ChatType, Message } from '../../types';
import { useStore } from '../../store/useStore';

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
    if (message.status === 'sending') return <Clock size={12} className="text-white/40" />;
    if (message.status === 'delivered') return <Check size={12} className="text-white/40" />;
    return <CheckCheck size={14} className="text-[#229ED9]" />;
  };

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`group relative flex flex-col my-1.5 ${isOutgoing ? 'items-end' : 'items-start'}`}
    >
      {/* Lightbox Modal for Full Image View */}
      {isLightboxOpen && message.media?.url && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={message.media.url}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

      <div className="relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
        {showActions && (
          <div
            className={`absolute -top-7 ${
              isOutgoing ? 'right-0' : 'left-0'
            } z-20 flex items-center gap-1 bg-[#0B0B0B] border border-white/10 px-2 py-1 rounded-xl shadow-lg backdrop-blur-md animate-fade-in`}
          >
            {EMOJI_OPTIONS.slice(0, 3).map((emoji) => (
              <button
                key={emoji}
                onClick={() => activeChatId && toggleReaction(activeChatId, message.id, emoji)}
                className="hover:scale-125 transition-transform text-xs cursor-pointer px-0.5"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setReplyingTo(message)}
              className="text-white/60 hover:text-white p-1 transition-subtle cursor-pointer"
              title="Javob berish"
            >
              <Reply size={13} />
            </button>

            {isOutgoing && message.text && (
              <button
                onClick={() => setEditingMessage(message)}
                className="text-white/60 hover:text-[#229ED9] p-1 transition-subtle cursor-pointer"
                title="Tahrirlash"
              >
                <Edit3 size={13} />
              </button>
            )}

            <button
              onClick={() => activeChatId && pinMessage(activeChatId, message.id)}
              className="text-white/60 hover:text-[#229ED9] p-1 transition-subtle cursor-pointer"
              title="Qadash"
            >
              <Pin size={13} />
            </button>
            <button
              onClick={() => activeChatId && deleteMessage(activeChatId, message.id)}
              className="text-white/60 hover:text-[#FF3B30] p-1 transition-subtle cursor-pointer"
              title="O'chirish"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        <div
          className={`relative p-3 rounded-2xl text-xs sm:text-sm leading-relaxed border select-text ${
            isOutgoing
              ? 'bg-[#111111] text-white border-white/10 rounded-br-xs'
              : 'bg-[#0B0B0B] text-white border-white/5 rounded-bl-xs'
          }`}
        >
          {!isOutgoing && message.senderName && (
            <p className="text-[11px] font-semibold text-[#229ED9] mb-1">{message.senderName}</p>
          )}

          {message.replyTo && (
            <div className="mb-2 p-2 rounded-xl bg-white/5 border-l-2 border-[#229ED9] text-[11px]">
              <span className="font-semibold text-[#229ED9] block">{message.replyTo.senderName}</span>
              <span className="text-white/60 line-clamp-1">{message.replyTo.text}</span>
            </div>
          )}

          {/* Media Attachments */}
          {message.media && (
            <div className="mb-2">
              {message.media.type === 'image' && (
                <div className="relative group/img overflow-hidden rounded-xl cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
                  <img
                    src={message.media.url}
                    alt="Attachment"
                    className="max-h-60 w-full object-cover rounded-xl hover:opacity-90 transition-opacity"
                  />
                </div>
              )}

              {message.media.type === 'voice' && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 min-w-[180px]">
                  <button
                    onClick={() => toggleAudio(message.media!.url)}
                    className="w-8 h-8 rounded-full bg-[#229ED9] text-white flex items-center justify-center cursor-pointer hover:bg-[#229ED9]/80 transition-subtle shrink-0"
                  >
                    {isPlayingAudio ? <Pause size={14} /> : <Play size={14} className="transform translate-x-0.5" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-white/80">
                      <Volume2 size={12} className="text-[#229ED9]" />
                      <span>Ovozli xabar</span>
                    </div>
                    <span className="text-[10px] text-white/40">{message.media.duration || '0:05'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}

          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-white/40 select-none">
            {message.isEdited && <span className="text-[9px] text-white/40 italic">tahrirlandi</span>}
            {message.isPinned && <Pin size={10} className="transform rotate-45 text-[#229ED9]" />}
            {isChannelPost && typeof message.views === 'number' && (
              <span className="flex items-center gap-1 text-white/45">
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
            className={`flex items-center gap-1 mt-1 ${
              isOutgoing ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.reactions.map((emoji, i) => (
              <span
                key={i}
                onClick={() => activeChatId && toggleReaction(activeChatId, message.id, emoji)}
                className="bg-[#0B0B0B] border border-white/10 px-2 py-0.5 rounded-full text-xs cursor-pointer hover:border-[#229ED9]/50 transition-subtle"
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
