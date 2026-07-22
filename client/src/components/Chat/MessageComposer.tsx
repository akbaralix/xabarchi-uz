import React, { useState, useRef, useEffect } from 'react';
import { Smile, Send, X, Reply, Paperclip, Mic, Edit3 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

export const MessageComposer: React.FC = () => {
  const {
    activeChatId,
    chats,
    sendMessage,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    editMessage,
    sendTypingSignal
  } = useStore();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentChat = chats.find((chat) => chat.id === activeChatId);
  const isChannel = currentChat?.type === 'channel';

  const EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '👏', '🚀', '😍', '🎉', '💡', '😎', '🙏', '💯', '✨', '💻'];

  // Handle Edit mode initialization
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [editingMessage]);

  const handleSend = async () => {
    if (!text.trim() || !activeChatId) return;

    if (editingMessage) {
      await editMessage(activeChatId, editingMessage.id, text.trim());
      setText('');
      setEditingMessage(null);
    } else {
      await sendMessage(activeChatId, text.trim());
      setText('');
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    sendTypingSignal(activeChatId, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    if (activeChatId) {
      sendTypingSignal(activeChatId, val.length > 0);
    }
  };

  // Image File Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await api.post('/api/upload', {
          base64Data,
          fileName: file.name,
          mimeType: file.type
        });
        const imageUrl = res.data?.url || base64Data;
        await sendMessage(activeChatId, text.trim(), {
          type: 'image',
          url: imageUrl,
          name: file.name
        });
        setText('');
      } catch {
        // Fallback to Base64 data URL
        await sendMessage(activeChatId, text.trim(), {
          type: 'image',
          url: base64Data,
          name: file.name
        });
        setText('');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  // Voice Recording (Web Audio MediaRecorder API)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      alert("Mikrofon funksiyasiga ruxsat berilmadi yoki qo'llab-quvvatlanmaydi.");
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !activeChatId) return;

    clearInterval(timerRef.current);
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const durationStr = `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`;

      const reader = new FileReader();
      reader.onload = async () => {
        const audioUrl = reader.result as string;
        await sendMessage(activeChatId, '', {
          type: 'voice',
          url: audioUrl,
          duration: durationStr
        });
      };
      reader.readAsDataURL(audioBlob);

      // Stop all tracks
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      clearInterval(timerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  if (!activeChatId) return null;

  return (
    <div className="p-3 bg-[#000000] border-t border-white/5 relative select-none">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Reply Banner */}
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

      {/* Edit Banner */}
      {editingMessage && (
        <div className="mb-2 p-2 rounded-xl bg-[#0B0B0B] border border-[#229ED9]/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Edit3 size={14} className="text-[#229ED9]" />
            <div className="min-w-0">
              <span className="font-semibold text-[#229ED9] text-[11px] block">Xabarni tahrirlash</span>
              <span className="text-white/60 truncate block">{editingMessage.text}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="text-white/40 hover:text-white transition-subtle"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
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

      {/* Voice Recording Mode */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-[#0B0B0B] border border-red-500/30 rounded-2xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-red-400 animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Ovoz yozilmoqda... ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-1.5 text-white/40 hover:text-white transition-subtle cursor-pointer"
              title="Bekor qilish"
            >
              <X size={18} />
            </button>

            <button
              onClick={stopAndSendRecording}
              className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center transition-subtle hover:bg-red-600 cursor-pointer"
              title="Yuborish"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Regular Message Bar */
        <div className="flex items-end gap-2 bg-[#0B0B0B] border border-white/5 rounded-2xl px-3 py-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-white/40 hover:text-white transition-subtle p-1.5 rounded-xl cursor-pointer"
            title="Emoji"
          >
            <Smile size={20} />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-white/40 hover:text-white transition-subtle p-1.5 rounded-xl cursor-pointer disabled:opacity-50"
            title="Rasm yuklash"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? 'Tahrirlangan matnni kiriting...' : isChannel ? 'Kanalga post yozing...' : 'Xabar yozing...'}
            className="flex-1 bg-transparent text-white text-xs sm:text-sm outline-none resize-none py-1 max-h-32 placeholder:text-white/40 leading-relaxed"
          />

          {text.trim() || editingMessage ? (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center transition-subtle hover:bg-[#229ED9]/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              title={editingMessage ? 'Saqlash' : isChannel ? 'Post qilish' : 'Yuborish'}
            >
              <Send size={16} className="transform translate-x-0.5" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-9 h-9 rounded-xl bg-white/5 text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-subtle cursor-pointer shrink-0"
              title="Ovozli xabar yozish"
            >
              <Mic size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
