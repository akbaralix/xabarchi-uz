import React from 'react';
import type { FolderType } from '../../types';
import { useStore } from '../../store/useStore';
import '../../styles/FoldersNav.css';

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
    <div className="folders-nav-bar no-scrollbar">
      {folders.map((folder) => {
        const isActive = activeFolder === folder.key;
        return (
          <button
            key={folder.key}
            onClick={() => setActiveFolder(folder.key)}
            className={`btn-folder-tab transition-subtle ${
              isActive
                ? 'folder-tab-active'
                : 'folder-tab-inactive'
            }`}
          >
            {folder.label}
          </button>
        );
      })}
    </div>
  );
};
