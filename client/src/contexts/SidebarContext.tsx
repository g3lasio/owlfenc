import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SidebarContextType {
  isSidebarExpanded: boolean;
  isMobileMenuOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isSidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Efecto para manejar el redimensionado de ventana y eventos del header
  useEffect(() => {
    const handleResize = () => {
      // En tablets y desktop, asegurar que el sidebar sea visible como iconos
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false); // Cerrar menú móvil si está abierto
      } else {
        // En móviles, cerrar sidebar expandido si está abierto
        setSidebarExpanded(false);
      }
    };

    // Manejar eventos del botón de menú móvil del header
    const handleToggleMobileSidebar = (event: CustomEvent) => {
      setMobileMenuOpen(event.detail.isOpen);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('toggleMobileSidebar', handleToggleMobileSidebar as EventListener);
    
    // Ejecutar una vez al cargar
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggleMobileSidebar', handleToggleMobileSidebar as EventListener);
    };
  }, []);

  const toggleSidebar = () => {
    // En tablets y desktop (768px+), alternar entre iconos y expandido
    if (window.innerWidth >= 768) {
      setSidebarExpanded(!isSidebarExpanded);
    }
  };

  const toggleMobileMenu = () => {
    // Solo en móviles (menos de 768px)
    if (window.innerWidth < 768) {
      setMobileMenuOpen(!isMobileMenuOpen);
    }
  };

  const value = {
    isSidebarExpanded,
    isMobileMenuOpen,
    toggleSidebar,
    toggleMobileMenu,
    setSidebarExpanded,
    setMobileMenuOpen,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};