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
      <div className="min- bg-background flex flex-col">
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
      <div className="flex flex-col min-">
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

  // Layout principal con arquitectura profesional
  return (
    <div className="app-layout">
      {/* Sidebar con ancho dinámico */}
      <Sidebar onWidthChange={setSidebarWidth} />

      {/* Área de contenido principal */}
      <div 
        className="main-content-area"
        style={{ width: `calc(100% - ${sidebarWidth}px)` }}
      >
        {/* Header estático con altura fija */}
        <Header toggleMobileMenu={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />
        
        {/* Viewport de contenido sin scroll innecesario */}
        <div className="content-viewport">
          <Switch>
            <Route path="/settings/profile" component={Profile} />
            <Route path="*">{children}</Route>
          </Switch>
        </div>
        
        {/* Footer profesional siempre visible */}
        <footer className="professional-footer">
          <div className="footer-content">
            <Link to="/privacy-policy" className="footer-link">
              Privacy Policy
            </Link>
            <span className="footer-separator">|</span>
            <Link to="/legal-policy" className="footer-link">
              Terms of Service
            </Link>
            <span className="footer-separator">|</span>
            <span className="font-medium text-cyan-400">
              © {new Date().getFullYear()} Owl Fence
            </span>
          </div>
        </footer>
      </div>

      {/* Overlay de menú móvil */}
      {isMobileMenuOpen && (
        <MobileMenu 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
      )}
    </div>
  );
}