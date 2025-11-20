import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { Route, Switch, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/contexts/ChatContext";
import { MervinExperience } from "@/components/mervin/MervinExperience";
import { ChatLayoutController } from "./ChatLayoutController";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Placeholder Profile component
const Profile = () => {
  return (
    <div>
      <h1>Company Profile</h1>
      <p>This is the company profile page.</p>
    </div>
  );
};

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(64);
  const { layoutMode, chatWidth, isMinimized, toggleMinimize, isChatOpen, openChat, closeChat } = useChat();

  // Verificar si la ruta actual es una página de autenticación
  const isAuthPage =
    location === "/login" ||
    location === "/signup" ||
    location === "/recuperar-password" ||
    location === "/reset-password" ||
    location === "/login/email-link-callback";

  // Si es una página de autenticación, mostrar solo el contenido sin sidebar ni header
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Owl Fenc - Todos los derechos reservados
        </footer>
      </div>
    );
  }

  // Si es una página pública (about, legal, etc.) pero no de auth, mostrar header pero no sidebar
  const isPublicPage =
    location === "/about-owlfenc" ||
    location === "/about-mervin" ||
    location === "/legal-policy" ||
    location === "/privacy-policy";

  if (isPublicPage && !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-primary">
              Owl Fenc
            </a>
            <div className="space-x-4">
              <a href="/login" className="text-gray-600 hover:text-primary">
                Iniciar Sesión
              </a>
              <a
                href="/signup"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Registrarse
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="py-6 bg-gray-50">
          <div className="container mx-auto px-4 text-center text-gray-500">
            © {new Date().getFullYear()} Owl Fenc - Todos los derechos
            reservados
          </div>
        </footer>
      </div>
    );
  }

  // Calculate chat dock width based on layout mode and open state
  const getChatDockWidth = () => {
    if (layoutMode === 'closed') return 0;
    if (layoutMode === 'full') return undefined; // flex-1 will handle this
    // sidebar mode - only show if open
    if (!isChatOpen) return 0;
    return isMinimized ? 48 : chatWidth;
  };

  const chatDockWidth = getChatDockWidth();
  
  // Show floating chat button when in sidebar mode and chat is closed
  const showFloatingChatButton = layoutMode === 'sidebar' && !isChatOpen;

  // Para el resto de las páginas (protegidas), mostrar el layout completo
  return (
    <>
      {/* Route-based layout mode controller */}
      <ChatLayoutController />
      
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar fijo a la izquierda */}
        <Sidebar onWidthChange={setSidebarWidth} />

        {/* Contenido principal - flex layout puro sin marginLeft para evitar líneas negras */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300">
          {/* Header fijo */}
          <Header />

          {/* Content area: Main content + Chat dock in flex row */}
          <div className="flex-1 flex flex-row overflow-hidden">
            {/* Main content area */}
            <main
              className={`${layoutMode === 'full' ? 'hidden' : 'flex-1'} overflow-y-auto`}
              style={{
                paddingTop: 0,
                marginTop: 0,
              }}
            >
              <div className="h-full">
                <Switch>
                  <Route path="/settings/profile" component={Profile} />
                  <Route path="*">{children}</Route>
                </Switch>
              </div>
            </main>

            {/* Chat dock - persistent MervinExperience */}
            <div
              className="flex-shrink-0 transition-all duration-300 overflow-hidden"
              style={{
                width: layoutMode === 'full' ? '100%' : `${chatDockWidth}px`,
                // Full mode: always show | Sidebar: show only if open | Closed: never show
                display: layoutMode === 'closed' ? 'none' : (layoutMode === 'sidebar' && !isChatOpen ? 'none' : 'flex'),
              }}
              data-testid={`chat-dock-${layoutMode}`}
            >
              <MervinExperience
                mode={layoutMode === 'full' ? 'full' : 'sidebar'}
                onMinimize={layoutMode === 'sidebar' ? toggleMinimize : undefined}
                isMinimized={layoutMode === 'sidebar' ? isMinimized : false}
                onClose={layoutMode === 'sidebar' ? closeChat : undefined}
              />
            </div>
          </div>
          
          {/* Floating chat button - shows when sidebar mode and chat is closed */}
          {showFloatingChatButton && (
            <button
              onClick={openChat}
              data-testid="floating-chat-button"
              className="fixed bottom-6 right-6 shadow-xl hover:scale-110 transition-transform z-50"
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
              }}
            >
              {/* Resplandor circular futurista */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, transparent 40%, rgba(34,211,238,0.2) 60%, rgba(168,85,247,0.3) 80%, rgba(34,211,238,0.1) 100%)',
                animation: 'borderGlow 3s ease-in-out infinite'
              }}></div>
              
              {/* Imagen del logo con pulsaciones */}
              <img 
                src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
                alt="Mervin AI" 
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  objectFit: 'contain',
                  zIndex: 10,
                  animation: 'logoGlow 2.5s ease-in-out infinite'
                }}
              />
            </button>
          )}

          {/* Footer fijo */}
          <footer
            className="flex-shrink-0 py-2 px-4 bg-gray-900 border-t border-cyan-900/30 text-xs text-center text-cyan-500/50"
            style={{
              height: "var(--footer-height)",
              minHeight: "var(--footer-height)",
            }}
          >
            <div className="flex justify-center items-center space-x-4 h-full">
              <Link
                to="/privacy-policy"
                className="hover:text-cyan-400 cursor-pointer transition-colors"
              >
                Privacy Policy
              </Link>
              <span>|</span>
              <Link
                to="/legal-policy"
                className="hover:text-cyan-400 cursor-pointer transition-colors"
              >
                Terms of Service
              </Link>
              <span>|</span>
              <span className="font-medium">
                © {new Date().getFullYear()} Owl Fenc
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
