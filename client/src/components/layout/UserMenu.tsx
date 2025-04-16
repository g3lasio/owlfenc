import { Link } from "wouter";
import Navigation from "./Navigation";

export default function UserMenu() {
  return (
    <aside className="hidden md:flex md:w-72 flex-col bg-card border-l border-border">
      {/* User Menu Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
            <span className="font-medium text-sm">JC</span>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">John Contractor</div>
            <div className="text-xs text-muted-foreground">Plan Premium</div>
          </div>
        </div>
      </div>
      
      {/* Navegación usando el componente unificado con tipo "user" */}
      <Navigation variant="sidebar" type="user" />
      
      {/* User Menu Footer */}
      <div className="p-4 border-t border-border">
        <button className="flex items-center w-full p-2 rounded-md hover:bg-destructive/10 hover:text-destructive">
          <i className="ri-logout-box-r-line text-lg mr-3"></i>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}