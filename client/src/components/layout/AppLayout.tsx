import { useState, useEffect } from "react";
import Header from "./Header";
import MobileMenu from "./MobileMenu";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu"; 
import { Route, Switch } from "wouter";

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

  return (
    <div className="flex h-screen">
      {/* Sidebar izquierdo (solo visible en desktop) */}
      <Sidebar />
      
      {/* Contenido principal */}
      <main className="flex-1 flex flex-col overflow-auto">
        <Header toggleMobileMenu={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />
        <div className="flex-1 overflow-auto">
          <Switch>
            <Route path="/settings/profile" component={Profile} />
            <Route path="*">{children}</Route>
          </Switch>
        </div>
      </main>

      {/* UserMenu derecho (solo visible en desktop) */}
      <UserMenu />
      
      {/* Menú móvil (solo visible en mobile cuando se activa) */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
    </div>
  );
}