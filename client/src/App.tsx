import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { RightInfoPanel } from './components/RightPanel/RightInfoPanel';
import { LoginModal } from './components/Auth/LoginModal';
import { SettingsModal } from './components/Settings/SettingsModal';
import { PublicChatPage } from './components/Public/PublicChatPage';
import { useStore } from './store/useStore';
import { api } from './lib/api';

export function App() {
  const { isAuthenticated, activeChatId, login, loadChats } = useStore();
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const isPublicChatRoute = Boolean(pathname) && pathname !== 'index.html';

  useEffect(() => {
    let isMounted = true;

    api.get('/api/auth/me')
      .then((res) => {
        if (isMounted && res.data?.success && res.data?.user) {
          login(res.data.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setAuthChecked(true);
      });

    return () => {
      isMounted = false;
    };
  }, [login]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadChats();
  }, [isAuthenticated, loadChats]);

  if (!authChecked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#000000] text-white">
        <div className="text-xs text-white/50">Kirish tekshirilmoqda...</div>
      </div>
    );
  }

  if (isPublicChatRoute) {
    return <PublicChatPage username={pathname} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#000000] text-white overflow-hidden select-none font-sans relative">
      {!isAuthenticated ? (
        <LoginModal />
      ) : (
        <>
          {/* Desktop & Mobile Responsive Views */}
          <div className="flex w-full h-full">
            {/* Sidebar: Always visible on desktop. On mobile, visible only when no active chat selected */}
            <div className={`h-full w-full md:w-auto ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
              <Sidebar />
            </div>

            {/* ChatArea: Always visible on desktop. On mobile, visible only when active chat selected */}
            <div className={`h-full flex-1 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
              <ChatArea />
            </div>

            {/* Right Info Panel */}
            <RightInfoPanel />
          </div>

          <SettingsModal />
        </>
      )}
    </div>
  );
}

export default App;
