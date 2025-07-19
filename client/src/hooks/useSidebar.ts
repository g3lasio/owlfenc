import { useState, useEffect } from "react";

interface SidebarState {
  isSidebarExpanded: boolean;
  isMobileMenuOpen: boolean;
}

export const useSidebar = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarExpanded(prev => !prev);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const setSidebarExpanded = (expanded: boolean) => {
    setIsSidebarExpanded(expanded);
  };

  const setMobileMenuOpen = (open: boolean) => {
    setIsMobileMenuOpen(open);
  };

  // Listen for mobile menu toggle events from header
  useEffect(() => {
    const handleToggleMobileSidebar = (event: CustomEvent) => {
      setIsMobileMenuOpen(event.detail.isOpen);
    };

    window.addEventListener('toggleMobileSidebar', handleToggleMobileSidebar as EventListener);

    return () => {
      window.removeEventListener('toggleMobileSidebar', handleToggleMobileSidebar as EventListener);
    };
  }, []);

  return {
    isSidebarExpanded,
    isMobileMenuOpen,
    toggleSidebar,
    toggleMobileMenu,
    setSidebarExpanded,
    setMobileMenuOpen,
  };
};