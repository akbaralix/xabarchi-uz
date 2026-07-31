import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ChatArea } from "./components/Chat/ChatArea";
import { RightInfoPanel } from "./components/RightPanel/RightInfoPanel";
import { LoginModal } from "./components/Auth/LoginModal";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { PublicChatPage } from "./components/Public/PublicChatPage";
import { useStore } from "./store/useStore";
import { api } from "./lib/api";
import "./styles/App.css";

export function App() {
  const { isAuthenticated, activeChatId, login, loadChats } = useStore();
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const isPublicChatRoute = Boolean(pathname) && pathname !== "index.html";

  useEffect(() => {
    let isMounted = true;

    api
      .get("/api/auth/me")
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
      <div className="auth-checking-container">
        <div className="auth-checking">
          <img src="/src/assets/xabarchi.png" alt="" />
        </div>
      </div>
    );
  }

  if (isPublicChatRoute) {
    return <PublicChatPage username={pathname} />;
  }

  return (
    <div className="app-root">
      {!isAuthenticated ? (
        <LoginModal />
      ) : (
        <>
          {/* Desktop & Mobile Responsive Views */}
          <div className="app-layout">
            {/* Sidebar: Always visible on desktop. On mobile, visible only when no active chat selected */}
            <div
              className={`app-sidebar-container ${activeChatId ? "hidden-on-mobile" : ""}`}
            >
              <Sidebar />
            </div>

            {/* ChatArea: Always visible on desktop. On mobile, visible only when active chat selected */}
            <div
              className={`app-chat-container ${!activeChatId ? "hidden-on-mobile" : ""}`}
            >
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
