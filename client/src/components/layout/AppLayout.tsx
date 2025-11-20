import { useState, useEffect } from "react";
import Header from "./Header";

import Sidebar from "./Sidebar";
import { Route, Switch, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/contexts/ChatContext";
import { PersistentChatPanel } from "@/components/chat/PersistentChatPanel";
import { ChatToggleButton } from "@/components/chat/ChatToggleButton";

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
  const { chatWidth, isChatOpen } = useChat();

  // Verificar si la ruta actual es una página de autenticación
  const isAuthPage =
    location === "/login" ||
    location === "/signup" ||
    location === "/recuperar-password" ||
    location === "/reset-password" ||
    location === "/login/email-link-callback";

  // Check if we should show the persistent chat (not in Home or Mervin page)
  // Use startsWith to handle routes like /home/overview, /mervin?tab=ai, etc.
  const isHomeRoute = location === "/" || location.startsWith("/home");
  const isMervinRoute = location.startsWith("/mervin");
  const shouldShowChat = user && !isAuthPage && !isHomeRoute && !isMervinRoute;

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

  // Para el resto de las páginas (protegidas), mostrar el layout completo
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar onWidthChange={setSidebarWidth} />

      {/* Contenido principal - flex layout puro sin marginLeft para evitar líneas negras */}
      <div 
        className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300"
        style={{
          // Compress content when chat is open (not overlapping)
          marginRight: shouldShowChat && isChatOpen && chatWidth > 48 ? `${chatWidth}px` : '0px'
        }}
      >
        {/* Header fijo */}
        <Header />

        {/* Área de contenido principal - sin márgenes adicionales */}
        <main
          className="flex-1 overflow-y-auto"
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

      {/* Persistent Chat Panel - Only shown when not in Home or Mervin page */}
      {shouldShowChat && (
        <>
          <PersistentChatPanel />
          <ChatToggleButton />
        </>
      )}
    </div>
  );
}
