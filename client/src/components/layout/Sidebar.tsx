import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();
  
  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-card border-r border-border">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <i className="ri-fence-line text-white text-xl"></i>
          </div>
          <h1 className="ml-2 text-xl font-bold">FenceQuote Pro</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Estimate & Contract Generator</p>
      </div>
      
      {/* Sidebar Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
      
      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-accent text-center leading-8">J</div>
          <div className="ml-2">
            <div className="text-sm font-medium">John Contractor</div>
            <div className="text-xs text-muted-foreground">Premium Plan</div>
          </div>
          <button className="ml-auto p-1 rounded-md hover:bg-accent">
            <i className="ri-logout-box-r-line"></i>
          </button>
        </div>
        <div className="mt-4 bg-accent rounded-md p-2 text-xs text-muted-foreground">
          <div className="flex items-center">
            <i className="ri-rocket-line mr-2 text-secondary"></i>
            <span>Coming Soon Features</span>
          </div>
          <div className="flex flex-col mt-2 space-y-2">
            <span className="flex items-center">
              <i className="ri-augmented-reality-line mr-1 text-xs"></i> AR Integration
            </span>
            <span className="flex items-center">
              <i className="ri-robot-line mr-1 text-xs"></i> AI Project Manager
            </span>
            <span className="flex items-center">
              <i className="ri-shield-check-line mr-1 text-xs"></i> Property Ownership Verifier
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
