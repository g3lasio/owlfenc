import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };
  
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
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Principal */}
        <div className="space-y-1">
          <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Principal</div>
          <Link href="/" className={`flex items-center p-2 rounded-md ${isActive("/") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-dashboard-line text-lg mr-3"></i>
            <span>Dashboard</span>
          </Link>
          <Link href="/property-verifier" className={`flex items-center p-2 rounded-md ${isActive("/property-verifier") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-shield-check-line text-lg mr-3"></i>
            <span>🛡️ Property Ownership Verifier</span>
          </Link>
          <Link href="/ai-project-manager" className={`flex items-center p-2 rounded-md ${isActive("/ai-project-manager") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-robot-line text-lg mr-3"></i>
            <span>🧠 AI Project Manager</span>
          </Link>
          <Link href="/ar-fence-estimator" className={`flex items-center p-2 rounded-md ${isActive("/ar-fence-estimator") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-augmented-reality-line text-lg mr-3"></i>
            <span>🧱 AR Fence Estimator</span>
          </Link>
        </div>

        {/* Proyectos */}
        <div className="space-y-1">
          <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Proyectos</div>
          <Link href="/projects" className={`flex items-center p-2 rounded-md ${isActive("/projects") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-folder-line text-lg mr-3"></i>
            <span>Proyectos</span>
          </Link>
          <Link href="/history" className={`flex items-center p-2 rounded-md ${isActive("/history") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-history-line text-lg mr-3"></i>
            <span>Historial</span>
          </Link>
        </div>

        {/* Mi Cuenta */}
        <div className="space-y-1">
          <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mi Cuenta</div>
          <Link href="/settings/account" className={`flex items-center p-2 rounded-md ${isActive("/settings/account") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-user-3-line text-lg mr-3"></i>
            <span>Perfil Personal</span>
          </Link>
          <Link href="/settings/notifications" className={`flex items-center p-2 rounded-md ${isActive("/settings/notifications") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-notification-3-line text-lg mr-3"></i>
            <span>Notificaciones</span>
          </Link>
        </div>

        {/* Configuración de Empresa */}
        <div className="space-y-1">
          <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Configuración de Empresa</div>
          <Link href="/profile" className={`flex items-center p-2 rounded-md ${isActive("/profile") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-building-line text-lg mr-3"></i>
            <span>Perfil de Empresa</span>
          </Link>
          <Link href="/settings/pricing" className={`flex items-center p-2 rounded-md ${isActive("/settings/pricing") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-money-dollar-circle-line text-lg mr-3"></i>
            <span>Precios y Tarifas</span>
          </Link>
          <Link href="/settings/billing" className={`flex items-center p-2 rounded-md ${isActive("/settings/billing") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-bank-card-line text-lg mr-3"></i>
            <span>Facturación</span>
          </Link>
          <Link href="/settings/employees" className={`flex items-center p-2 rounded-md ${isActive("/settings/employees") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-team-line text-lg mr-3"></i>
            <span>Empleados</span>
          </Link>
        </div>

        {/* Soporte */}
        <div className="space-y-1">
          <div className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Soporte</div>
          <Link href="/help" className={`flex items-center p-2 rounded-md ${isActive("/help") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-question-line text-lg mr-3"></i>
            <span>Centro de Ayuda</span>
          </Link>
          <Link href="/contact" className={`flex items-center p-2 rounded-md ${isActive("/contact") ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-customer-service-line text-lg mr-3"></i>
            <span>Contactar Soporte</span>
          </Link>
        </div>
      </nav>
      
      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center mb-4 hover:bg-accent/10 rounded-md p-2">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <span className="font-medium text-sm">JC</span>
          </div>
          <div className="ml-2">
            <div className="text-sm font-medium">John Contractor</div>
            <div className="text-xs text-muted-foreground">Plan Premium</div>
          </div>
          <button className="ml-auto p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive">
            <i className="ri-logout-box-r-line"></i>
          </button>
        </div>
        
        <div className="mt-4 bg-accent/5 rounded-md p-3 text-xs border border-border">
          <div className="flex items-center mb-2">
            <i className="ri-rocket-line mr-2 text-primary"></i>
            <span className="font-medium">Próximas Funciones</span>
          </div>
          <div className="flex flex-col mt-1 space-y-2.5 text-muted-foreground">
            <span className="flex items-center">
              <i className="ri-augmented-reality-line mr-2"></i> Integración AR
            </span>
            <span className="flex items-center">
              <i className="ri-robot-line mr-2"></i> Gestor de Proyectos IA
            </span>
            <span className="flex items-center">
              <i className="ri-shield-check-line mr-2"></i> Verificador de Propiedad
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
