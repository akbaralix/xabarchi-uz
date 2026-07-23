export interface User {
  id: string;
  firstName: string;
  lastName?: string;
  username: string;
  phone: string;
  bio?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  allowCalls?: boolean;
  lastSeen?: string;
}

export type ChatType = 'user' | 'group' | 'channel' | 'bot' | 'saved';
export type FolderType = 'all' | 'personal' | 'groups' | 'channels' | 'unread' | 'archived';

export interface Chat {
  id: string;
  name: string;
  type: ChatType;
  avatar?: string;
  lastMessage?: string;
  time?: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isOnline?: boolean;
  typingStatus?: string;
  folder: FolderType;
  membersCount?: number;
  description?: string;
  username?: string;
  isPublic?: boolean;
  ownerId?: string;
}

export interface MediaAttachment {
  type: 'image' | 'voice' | 'file';
  url: string;
  name?: string;
  duration?: string;
  size?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  text: string;
  time: string;
  date: string;
  isOutgoing: boolean;
  status: 'sending' | 'delivered' | 'seen';
  reactions?: string[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  media?: MediaAttachment;
  isPinned?: boolean;
  views?: number;
  isEdited?: boolean;
  editedAt?: string;
}

export interface CallData {
  callId: string;
  targetUserId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  isVideo: boolean;
  status: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
  signalData?: any;
}
