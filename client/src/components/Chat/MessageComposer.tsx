import React, { useState, useRef, useEffect } from 'react';
import { Smile, Send, X, Reply, Paperclip, Mic, Edit3 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import '../../styles/MessageComposer.css';

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

    const currentText = text.trim();
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (editingMessage) {
      const msgId = editingMessage.id;
      setEditingMessage(null);
      await editMessage(activeChatId, msgId, currentText);
    } else {
      void sendMessage(activeChatId, currentText);
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
    <div className="composer-container">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Reply Banner */}
      {replyingTo && (
        <div className="banner-reply">
          <div className="banner-content-left">
            <Reply size={14} className="text-[#229ED9]" />
            <div className="banner-text-box">
              <span className="banner-title">{replyingTo.senderName}</span>
              <span className="banner-desc">{replyingTo.text}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="btn-banner-close transition-subtle"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="banner-edit">
          <div className="banner-content-left">
            <Edit3 size={14} className="text-[#229ED9]" />
            <div className="banner-text-box">
              <span className="banner-title">Xabarni tahrirlash</span>
              <span className="banner-desc">{editingMessage.text}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="btn-banner-close transition-subtle"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="emoji-picker-popup">
          <div className="emoji-grid">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setText((prev) => prev + emoji)}
                className="emoji-item transition-subtle"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {isChannel && (
        <div className="channel-note">
          Kanal postlari barcha obunachilarga ko‘rinadi.
        </div>
      )}

      {/* Voice Recording Mode */}
      {isRecording ? (
        <div className="recording-bar">
          <div className="recording-status animate-pulse">
            <div className="recording-dot" />
            <span>Ovoz yozilmoqda... ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')})</span>
          </div>

          <div className="recording-actions">
            <button
              onClick={cancelRecording}
              className="btn-recording-cancel transition-subtle"
              title="Bekor qilish"
            >
              <X size={18} />
            </button>

            <button
              onClick={stopAndSendRecording}
              className="btn-recording-send transition-subtle"
              title="Yuborish"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Regular Message Bar */
        <div className="composer-main-bar">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn-composer-icon transition-subtle"
            title="Emoji"
          >
            <Smile size={20} />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-composer-icon transition-subtle"
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
            className="composer-textarea"
          />

          {text.trim() || editingMessage ? (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="btn-composer-send transition-subtle"
              title={editingMessage ? 'Saqlash' : isChannel ? 'Post qilish' : 'Yuborish'}
            >
              <Send size={16} style={{ transform: 'translateX(2px)' }} />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="btn-composer-mic transition-subtle"
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
