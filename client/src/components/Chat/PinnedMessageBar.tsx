import React from 'react';
import { Pin, X } from 'lucide-react';
import type { Message } from '../../types';
import '../../styles/PinnedMessageBar.css';

interface Props {
  pinnedMessage?: Message;
  onUnpin?: () => void;
}

export const PinnedMessageBar: React.FC<Props> = ({ pinnedMessage, onUnpin }) => {
  if (!pinnedMessage) return null;

  return (
    <div className="pinned-bar">
      <div className="pinned-bar-left">
        <div className="pinned-indicator-line" />
        <div className="pinned-text-box">
          <div className="pinned-bar-title">
            <Pin size={11} className="pin-rotate-icon" /> Qadralangan xabar
          </div>
          <p className="pinned-bar-text">{pinnedMessage.text || '[Media]'}</p>
        </div>
      </div>
      {onUnpin && (
        <button
          onClick={onUnpin}
          className="btn-unpin transition-subtle"
          title="Qadralashni bekor qilish"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
