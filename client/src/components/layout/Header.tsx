import { useLocation } from "wouter";

interface HeaderProps {
  toggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({ toggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const [location] = useLocation();
  
  // Determine the title based on the current route
  let title = "New Estimate";
  let subtitle = "Chat with our AI to create your estimate";
  
  if (location === "/history") {
    title = "History";
    subtitle = "View your past estimates and contracts";
  } else if (location === "/templates") {
    title = "Templates";
    subtitle = "Manage your estimate and contract templates";
  } else if (location === "/settings") {
    title = "Settings";
    subtitle = "Configure your account and preferences";
  }
  
  return (
    <header className="h-16 flex items-center px-4 border-b border-border">
      <button 
        className="md:hidden p-2 rounded-md hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        onClick={() => toggleMobileMenu()}
        aria-label="Toggle menu"
        aria-expanded={isMobileMenuOpen}
        type="button"
      >
        <i className="ri-menu-line text-xl"></i>
      </button>
      <div className="md:hidden ml-2 font-bold text-lg">FenceQuote Pro</div>
      <div className="hidden md:block">
        <h2 className="text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="ml-auto flex items-center space-x-4">
        <button className="relative p-2 rounded-md hover:bg-accent">
          <i className="ri-notification-3-line text-xl"></i>
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <button className="p-2 rounded-md hover:bg-accent md:hidden">
          <i className="ri-question-line text-xl"></i>
        </button>
      </div>
    </header>
  );
}
