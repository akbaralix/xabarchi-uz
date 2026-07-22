import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { RightInfoPanel } from './components/RightPanel/RightInfoPanel';
import { LoginModal } from './components/Auth/LoginModal';
import { SettingsModal } from './components/Settings/SettingsModal';
import { useStore } from './store/useStore';

export function App() {
  const { isAuthenticated, activeChatId } = useStore();

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
