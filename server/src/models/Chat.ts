import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  name: string;
  type: 'user' | 'group' | 'channel' | 'bot' | 'saved';
  avatar?: string;
  lastMessage?: string;
  time?: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  folder: 'all' | 'personal' | 'groups' | 'channels' | 'unread' | 'archived';
  members: string[];
  description?: string;
  username?: string;
  createdAt: Date;
}

const ChatSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['user', 'group', 'channel', 'bot', 'saved'], required: true },
    avatar: { type: String },
    lastMessage: { type: String },
    time: { type: String },
    unreadCount: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    folder: { type: String, default: 'personal' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    description: { type: String },
    username: { type: String }
  },
  { timestamps: true }
);

export const ChatModel = mongoose.model<IChat>('Chat', ChatSchema);
