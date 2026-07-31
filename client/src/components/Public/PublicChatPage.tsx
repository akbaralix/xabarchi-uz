import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Send,
  ShieldCheck,
  Check,
  Copy,
  UserX
} from "lucide-react";
import { api } from "../../lib/api";
import type { Chat, Message } from "../../types";
import { useStore } from "../../store/useStore";
import "../../styles/PublicChatPage.css";

interface Props {
  username: string;
}

interface UserProfileData {
  id: string;
  firstName: string;
  lastName?: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
}

const normalizeChat = (chat: any): Chat => ({
  id: chat.id || chat._id?.toString() || `chat_${Date.now()}`,
  name: chat.name || "Nomsiz chat",
  type: chat.type || "group",
  avatar: chat.avatar || "",
  lastMessage: chat.lastMessage || "",
  time: chat.time || "",
  unreadCount: typeof chat.unreadCount === "number" ? chat.unreadCount : 0,
  isPinned: Boolean(chat.isPinned),
  isMuted: Boolean(chat.isMuted),
  folder: chat.folder || (chat.type === "channel" ? "channels" : "groups"),
  membersCount: typeof chat.membersCount === "number" ? chat.membersCount : 0,
  description: chat.description,
  username: chat.username,
  isPublic: typeof chat.isPublic === "boolean" ? chat.isPublic : true,
});

const normalizeMessage = (message: any): Message => ({
  id: message.id || message._id?.toString() || `m_${Date.now()}`,
  chatId: message.chatId,
  senderId: message.senderId,
  senderName: message.senderName,
  text: message.text || "",
  time: message.time || "",
  date: message.date || "Bugun",
  isOutgoing: Boolean(message.isOutgoing),
  status: message.status || "delivered",
  reactions: message.reactions,
  replyTo: message.replyTo,
  media: message.media,
  isPinned: Boolean(message.isPinned),
  views: typeof message.views === "number" ? message.views : undefined,
});

export const PublicChatPage: React.FC<Props> = ({ username }) => {
  const { addChat, selectChat } = useStore();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [targetType, setTargetType] = useState<"user" | "chat">("user");
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copied, setCopied] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);

    const fetchPublicData = async () => {
      try {
        const res = await api.get(
          `/api/public/chats/${encodeURIComponent(username)}`,
        );
        if (!mounted) return;

        if (res.data?.targetType === "chat" && res.data?.chat) {
          setTargetType("chat");
          setChat(normalizeChat(res.data.chat));

          try {
            const msgRes = await api.get(
              `/api/public/chats/${encodeURIComponent(username)}/messages`,
            );
            if (mounted && Array.isArray(msgRes.data?.messages)) {
              setMessages(msgRes.data.messages.map(normalizeMessage));
            }
          } catch {
            // Ignore messages fetch failure for chats
          }
        } else if (res.data?.targetType === "user" && res.data?.user) {
          setTargetType("user");
          setUserData(res.data.user);
        } else {
          setNotFound(true);
        }
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchPublicData();

    return () => {
      mounted = false;
    };
  }, [username]);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`https://t.me/${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDirectChat = async () => {
    setIsOpeningChat(true);
    try {
      const res = await api.post(
        `/api/chats/open-direct/${encodeURIComponent(username)}`,
      );
      if (res.data?.success && res.data?.chat) {
        const createdChat = normalizeChat(res.data.chat);
        addChat(createdChat);
        selectChat(createdChat.id);
        window.location.assign("/");
        return;
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Bunday foydalanuvchi topilmadi");
    } finally {
      setIsOpeningChat(false);
    }
  };

  if (loading) {
    return (
      <div className="public-loading-root">
        <div className="public-loading-box">
          <Loader2 size={18} className="animate-spin text-[#229ED9]" />
          Yuklanmoqda...
        </div>
      </div>
    );
  }

  // --- 404 NOT FOUND VIEW ---
  if (notFound) {
    return (
      <div className="public-page-container">
        <div className="public-card">
          <div className="not-found-icon-box">
            <UserX size={40} />
          </div>
          <h2 className="not-found-title">Bunday profil yoki chat topilmadi</h2>
          <p className="not-found-desc">
            <b>@{username}</b> nomli foydalanuvchi, guruh yoki kanal ma'lumotlar bazasida mavjud emas.
          </p>
          <button
            onClick={() => window.location.assign("/")}
            className="btn-back-home transition-subtle"
          >
            <ArrowLeft size={16} /> Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    );
  }

  // --- USER PROFILE VIEW ---
  if (targetType === "user" && userData) {
    const displayName = `${userData.firstName} ${userData.lastName || ""}`.trim();

    return (
      <div className="public-page-container">
        <div className="public-card">
          <button
            onClick={() => window.location.assign("/")}
            className="btn-profile-back transition-subtle"
            title="Orqaga"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Profile Avatar */}
          <div className="profile-avatar-container">
            {userData.avatarUrl ? (
              <img
                src={userData.avatarUrl}
                alt={displayName}
                className="profile-avatar-img"
              />
            ) : (
              <div className="profile-avatar-placeholder">
                {displayName[0]?.toUpperCase() || "U"}
              </div>
            )}
            {userData.isOnline && (
              <span
                className="online-badge"
                title="Tarmoqda online"
              />
            )}
          </div>

          {/* Name & Username */}
          <h2 className="profile-display-name">
            {displayName}
            <ShieldCheck size={18} className="text-[#229ED9]" />
          </h2>
          <p className="profile-username">
            @{userData.username || username}
          </p>

          {/* Bio section */}
          <div className="profile-bio-box">
            {userData.bio || "Xabarchi ilovasidan foydalanmoqda ✨"}
          </div>

          {/* Telegram Send Message Button */}
          <div className="profile-btn-group">
            <button
              onClick={handleOpenDirectChat}
              disabled={isOpeningChat}
              className="btn-send-message-public transition-subtle"
            >
              {isOpeningChat ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={16} style={{ transform: 'rotate(-12deg)' }} />
                  <span>Xabar yozish</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyUsername}
              className="btn-copy-link-public transition-subtle"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-[#34C759]" /> Havola nusxalandi!
                </>
              ) : (
                <>
                  <Copy size={14} /> Linkni nusxalash
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- CHANNEL / GROUP PUBLIC VIEW ---
  return (
    <div className="public-channel-layout">
      <main className="public-channel-main">
        <div className="public-channel-header">
          <div className="public-channel-header-info">
            <button
              onClick={() => window.location.assign("/")}
              className="btn-channel-back transition-subtle"
              title="Orqaga"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="public-channel-header-text">
              <h1 className="public-channel-title">
                {chat?.name || username}
              </h1>
              <p className="public-channel-username">@{username}</p>
            </div>
          </div>
        </div>

        <div className="public-channel-messages">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div key={message.id} className="public-message-wrapper">
                <div className="public-message-card">
                  {message.senderName && (
                    <p className="public-msg-sender">
                      {message.senderName}
                    </p>
                  )}
                  {message.text && (
                    <p className="public-msg-text">
                      {message.text}
                    </p>
                  )}
                  <div className="public-msg-meta">
                    <span>{message.time}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="public-no-messages">
              Hozircha xabar yo‘q
            </div>
          )}
        </div>

        <div className="public-channel-footer">
          <button
            onClick={handleOpenDirectChat}
            className="btn-open-chat-public"
          >
            <Send size={16} /> Chatni ochish
          </button>
        </div>
      </main>
    </div>
  );
};
