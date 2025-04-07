import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [location] = useLocation();
  const menuPanelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Close the menu when location changes
    onClose();
  }, [location, onClose]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        menuPanelRef.current && 
        !menuPanelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  return (
    <div 
      className={`fixed inset-0 bg-background bg-opacity-80 z-50 md:hidden ${
        isOpen ? "block" : "hidden"
      }`}
    >
      <div 
        ref={menuPanelRef}
        className={`bg-card w-64 h-full p-4 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <i className="ri-fence-line text-white"></i>
            </div>
            <h1 className="ml-2 text-lg font-bold">FenceQuote Pro</h1>
          </div>
          <button 
            className="p-1 rounded-md hover:bg-accent"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <nav className="space-y-1">
          <Link 
            href="/" 
            className={`flex items-center p-2 rounded-md ${
              location === "/" 
                ? "bg-primary bg-opacity-20 text-primary" 
                : "hover:bg-accent"
            }`}
          >
            <i className="ri-chat-1-line mr-3"></i>
            <span>New Estimate</span>
          </Link>
          <Link 
            href="/history" 
            className={`flex items-center p-2 rounded-md ${
              location === "/history" 
                ? "bg-primary bg-opacity-20 text-primary" 
                : "hover:bg-accent"
            }`}
          >
            <i className="ri-history-line mr-3"></i>
            <span>History</span>
          </Link>
          <Link 
            href="/templates" 
            className={`flex items-center p-2 rounded-md ${
              location === "/templates" 
                ? "bg-primary bg-opacity-20 text-primary" 
                : "hover:bg-accent"
            }`}
          >
            <i className="ri-template-line mr-3"></i>
            <span>Templates</span>
          </Link>
          <Link 
            href="/settings" 
            className={`flex items-center p-2 rounded-md ${
              location === "/settings" 
                ? "bg-primary bg-opacity-20 text-primary" 
                : "hover:bg-accent"
            }`}
          >
            <i className="ri-settings-3-line mr-3"></i>
            <span>Settings</span>
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-accent text-center leading-8">J</div>
            <div className="ml-2">
              <div className="text-sm font-medium">John Contractor</div>
              <div className="text-xs text-muted-foreground">Premium Plan</div>
            </div>
            <button className="ml-auto p-1 rounded-md hover:bg-accent">
              <i className="ri-logout-box-r-line"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
