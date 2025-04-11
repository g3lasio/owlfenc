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
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Principal */}
        <div className="space-y-1">
          <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Principal</div>
          <Link href="/" className={`flex items-center p-2 rounded-md ${location === "/" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-dashboard-line mr-3"></i>
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Proyectos */}
        <div className="space-y-1">
          <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Proyectos</div>
          <Link href="/new-estimate" className={`flex items-center p-2 rounded-md ${location === "/new-estimate" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-file-add-line mr-3"></i>
            <span>Nuevo Estimado</span>
          </Link>
          <Link href="/new-contract" className={`flex items-center p-2 rounded-md ${location === "/new-contract" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-file-text-line mr-3"></i>
            <span>Nuevo Contrato</span>
          </Link>
          <Link href="/projects" className={`flex items-center p-2 rounded-md ${location === "/projects" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-calendar-todo-line mr-3"></i>
            <span>Proyectos Activos</span>
          </Link>
          <Link href="/history" className={`flex items-center p-2 rounded-md ${location === "/history" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-history-line mr-3"></i>
            <span>Historial</span>
          </Link>
        </div>

        {/* Catálogo */}
        <div className="space-y-1">
          <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Catálogo</div>
          <Link href="/category/wood" className={`flex items-center p-2 rounded-md ${location === "/category/wood" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-wood-line mr-3"></i>
            <span>Cercas de Madera</span>
          </Link>
          <Link href="/category/metal" className={`flex items-center p-2 rounded-md ${location === "/category/metal" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-copper-diamond-line mr-3"></i>
            <span>Cercas Metálicas</span>
          </Link>
          <Link href="/category/vinyl" className={`flex items-center p-2 rounded-md ${location === "/category/vinyl" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-layout-line mr-3"></i>
            <span>Cercas de Vinilo</span>
          </Link>
          <Link href="/category/chain" className={`flex items-center p-2 rounded-md ${location === "/category/chain" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-links-line mr-3"></i>
            <span>Cercas Chain Link</span>
          </Link>
        </div>

        {/* Configuración */}
        <div className="space-y-1">
          <div className="px-2 text-sm font-medium text-muted-foreground mb-2">Configuración</div>
          <Link href="/settings/profile" className={`flex items-center p-2 rounded-md ${location === "/settings/profile" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-user-settings-line mr-3"></i>
            <span>Perfil de Empresa</span>
          </Link>
          <Link href="/settings/pricing" className={`flex items-center p-2 rounded-md ${location === "/settings/pricing" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-money-dollar-circle-line mr-3"></i>
            <span>Precios y Tarifas</span>
          </Link>
          <Link href="/templates" className={`flex items-center p-2 rounded-md ${location === "/templates" ? "bg-primary bg-opacity-20 text-primary" : "hover:bg-accent"}`}>
            <i className="ri-file-list-3-line mr-3"></i>
            <span>Plantillas</span>
          </Link>
        </div>
      </nav>
      
      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <Link href="/profile" className="flex items-center mb-4 hover:bg-accent rounded-md p-2">
          <div className="w-8 h-8 rounded-full bg-accent text-center leading-8">J</div>
          <div className="ml-2">
            <div className="text-sm font-medium">John Contractor</div>
            <div className="text-xs text-muted-foreground">Premium Plan</div>
          </div>
          <button className="ml-auto p-1 rounded-md hover:bg-accent/50">
            <i className="ri-logout-box-r-line"></i>
          </button>
        </Link>
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
