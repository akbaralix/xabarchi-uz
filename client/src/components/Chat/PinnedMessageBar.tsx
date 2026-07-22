import React from 'react';
import { Pin, X } from 'lucide-react';
import type { Message } from '../../types';

interface Props {
  pinnedMessage?: Message;
  onUnpin?: () => void;
}

export const PinnedMessageBar: React.FC<Props> = ({ pinnedMessage, onUnpin }) => {
  if (!pinnedMessage) return null;

  return (
    <div className="px-4 py-2 bg-[#0B0B0B] border-b border-white/5 flex items-center justify-between gap-3 text-xs shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
        <div className="w-0.5 h-7 bg-[#229ED9] rounded-full shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[#229ED9] font-medium text-[11px]">
            <Pin size={11} className="transform rotate-45" /> Qadralangan xabar
          </div>
          <p className="text-white/70 truncate text-xs">{pinnedMessage.text || '[Media]'}</p>
        </div>
      </div>
      {onUnpin && (
        <button
          onClick={onUnpin}
          className="text-white/40 hover:text-white transition-subtle p-1 rounded-lg"
          title="Qadralashni bekor qilish"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
