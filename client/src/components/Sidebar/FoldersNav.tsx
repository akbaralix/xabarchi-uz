import React from 'react';
import type { FolderType } from '../../types';
import { useStore } from '../../store/useStore';

interface FolderOption {
  key: FolderType;
  label: string;
}

const folders: FolderOption[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'personal', label: 'Shaxsiy' },
  { key: 'groups', label: 'Guruhlar' },
  { key: 'channels', label: 'Kanallar' },
  { key: 'unread', label: 'O‘qilmagan' },
  { key: 'archived', label: 'Arxiv' },
];

export const FoldersNav: React.FC = () => {
  const { activeFolder, setActiveFolder } = useStore();

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
      {folders.map((folder) => {
        const isActive = activeFolder === folder.key;
        return (
          <button
            key={folder.key}
            onClick={() => setActiveFolder(folder.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-subtle cursor-pointer ${
              isActive
                ? 'bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30'
                : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {folder.label}
          </button>
        );
      })}
    </div>
  );
};
