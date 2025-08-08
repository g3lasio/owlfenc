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

  // Efecto para manejar el redimensionado de ventana
  useEffect(() => {
    const handleResize = () => {
      // En tablets y desktop, mantener sidebar colapsado por defecto (solo iconos)
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false); // Cerrar menú móvil si está abierto
        // No forzar expansión - mantener estado actual o colapsado por defecto
      } else {
        // En móviles, cerrar sidebar por defecto
        setSidebarExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    // Ejecutar una vez al cargar
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    // Permitir toggle del sidebar en todas las pantallas
    setSidebarExpanded(!isSidebarExpanded);
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