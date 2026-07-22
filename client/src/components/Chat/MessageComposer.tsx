import React, { useState, useRef } from 'react';
import { Smile, Send, X, Reply } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const MessageComposer: React.FC = () => {
  const { activeChatId, chats, sendMessage, replyingTo, setReplyingTo } = useStore();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentChat = chats.find((chat) => chat.id === activeChatId);
  const isChannel = currentChat?.type === 'channel';

  const EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '👏', '🚀', '😍', '🎉', '💡', '😎', '🙏', '💯', '✨', '💻'];

  const handleSend = () => {
    if (!text.trim() || !activeChatId) return;
    sendMessage(activeChatId, text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  if (!activeChatId) return null;

  return (
    <div className="p-3 bg-[#000000] border-t border-white/5 relative select-none">
      {replyingTo && (
        <div className="mb-2 p-2 rounded-xl bg-[#0B0B0B] border border-white/5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Reply size={14} className="text-[#229ED9]" />
            <div className="min-w-0">
              <span className="font-semibold text-[#229ED9] text-[11px] block">{replyingTo.senderName}</span>
              <span className="text-white/60 truncate block">{replyingTo.text}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-white/40 hover:text-white transition-subtle"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-30 bg-[#0B0B0B] border border-white/10 p-3 rounded-2xl shadow-2xl w-64">
          <div className="grid grid-cols-5 gap-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setText((prev) => prev + emoji)}
                className="text-xl p-1.5 hover:bg-white/5 rounded-xl transition-subtle cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {isChannel && (
        <div className="mb-2 text-[11px] text-white/40 px-1">
          Kanal postlari barcha obunachilarga ko‘rinadi.
        </div>
      )}

      <div className="flex items-end gap-2 bg-[#0B0B0B] border border-white/5 rounded-2xl px-3 py-2">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-white/40 hover:text-white transition-subtle p-1.5 rounded-xl cursor-pointer"
          title="Emoji"
        >
          <Smile size={20} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isChannel ? 'Kanalga post yozing...' : 'Xabar yozing...'}
          className="flex-1 bg-transparent text-white text-xs sm:text-sm outline-none resize-none py-1 max-h-32 placeholder:text-white/40 leading-relaxed"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center transition-subtle hover:bg-[#229ED9]/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          title={isChannel ? 'Post qilish' : 'Yuborish'}
        >
          <Send size={16} className="transform translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
