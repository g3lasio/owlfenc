import { useState, useEffect } from "react";
import Header from "./Header";
import MobileMenu from "./MobileMenu";
import Sidebar from "./Sidebar";
import { Route, Switch, useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser } = useAuth();
  const [location] = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(64);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prevState => {
      const newState = !prevState;
      console.log('Toggling menu state:', newState);
      return newState;
    });
  };

  useEffect(() => {
    console.log('Menu state updated:', isMobileMenuOpen);
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }, [isMobileMenuOpen]);

  // Verificar si la ruta actual es una página de autenticación
  const isAuthPage = location === '/login' || 
                    location === '/signup' || 
                    location === '/recuperar-password' || 
                    location === '/reset-password' || 
                    location === '/login/email-link-callback';

  // Si es una página de autenticación, mostrar solo el contenido sin sidebar ni header
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Owl Fenc - Todos los derechos reservados
        </footer>
      </div>
    );
  }

  // Si es una página pública (about, legal, etc.) pero no de auth, mostrar header pero no sidebar
  const isPublicPage = location === '/about-owlfenc' || 
                      location === '/about-mervin' || 
                      location === '/legal-policy' || 
                      location === '/privacy-policy';

  if (isPublicPage && !currentUser) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-primary">Owl Fenc</a>
            <div className="space-x-4">
              <a href="/login" className="text-gray-600 hover:text-primary">Iniciar Sesión</a>
              <a href="/signup" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Registrarse</a>
            </div>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <footer className="py-6 bg-gray-50">
          <div className="container mx-auto px-4 text-center text-gray-500">
            © {new Date().getFullYear()} Owl Fenc - Todos los derechos reservados
          </div>
        </footer>
      </div>
    );
  }

  // Para el resto de las páginas (protegidas), mostrar el layout completo
  return (
    <div className="app-container">
      {/* Sidebar siempre visible en todas las pantallas */}
      <div className="sidebar-container">
        <Sidebar onWidthChange={setSidebarWidth} />
      </div>

      {/* Contenido principal */}
      <div className="main-content-area" style={{ marginLeft: `${sidebarWidth}px` }}>
        <Header toggleMobileMenu={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />
        <Switch>
          <Route path="/settings/profile" component={Profile} />
          <Route path="*">{children}</Route>
        </Switch>
        
        {/* Footer */}
        <footer style={{ 
          padding: '10px', 
          textAlign: 'center', 
          fontSize: '12px', 
          color: 'hsl(var(--muted-foreground))',
          borderTop: '1px solid hsl(var(--border))',
          flexShrink: 0
        }}>
          © {new Date().getFullYear()} Owl Fence - Todos los derechos reservados
        </footer>
      </div>
    </div>
  );
}