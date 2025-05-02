/**
 * Configuración centralizada de navegación
 * 
 * Este archivo define todas las rutas y elementos de navegación de la aplicación.
 * Tanto el menú móvil como la barra lateral utilizan esta configuración,
 * garantizando consistencia entre ambas interfaces.
 */

// Tipos para elementos de navegación
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  requiredPermission?: string;
}

export interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

// Definición de todos los elementos de navegación
export const navigationGroups: NavigationGroup[] = [
  {
    title: "Herramientas",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        path: "/",
        icon: "ri-dashboard-line"
      },
      {
        id: "projects",
        label: "Proyectos",
        path: "/projects",
        icon: "ri-briefcase-4-line"
      },
      {
        id: "clients",
        label: "Clientes",
        path: "/clients",
        icon: "ri-user-star-line"
      },
      {
        id: "history",
        label: "Historial",
        path: "/history",
        icon: "ri-time-line"
      }
    ]
  },
  {
    title: "Funcionalidades",
    items: [
      {
        id: "property-verifier",
        label: "Verificación de Propiedad",
        path: "/property-ownership-verifier",
        icon: "ri-shield-keyhole-line"
      },
      {
        id: "permit-advisor",
        label: "Mervin DeepSearch",
        path: "/permit-advisor",
        icon: "ri-robot-2-line"
      },
      {
        id: "ai-project-manager",
        label: "AI Project Manager",
        path: "/ai-project-manager",
        icon: "ri-3d-cube-sphere-line"
      },
      {
        id: "ar-fence-estimator",
        label: "AR Fence Estimator",
        path: "/ar-fence-estimator",
        icon: "ri-ruler-line"
      }
    ]
  },
  {
    title: "Mi Perfil",
    items: [
      {
        id: "account",
        label: "Perfil Personal",
        path: "/account",
        icon: "lucide-user"
      },
      {
        id: "security",
        label: "Seguridad",
        path: "/security-settings",
        icon: "ri-shield-keyhole-line"
      },
      {
        id: "billing",
        label: "Facturación",
        path: "/billing",
        icon: "lucide-credit-card"
      },
      {
        id: "subscription",
        label: "Mi Suscripción",
        path: "/subscription",
        icon: "ri-vip-crown-line"
      }
    ]
  },
  {
    title: "Empresa",
    items: [
      {
        id: "company-profile",
        label: "Perfil de Empresa",
        path: "/profile",
        icon: "lucide-building"
      },
      {
        id: "settings",
        label: "Preferencias",
        path: "/settings",
        icon: "lucide-settings"
      }
    ]
  }
];

// Función auxiliar para obtener todos los elementos de navegación en una sola lista plana
export const getAllNavigationItems = (): NavigationItem[] => {
  return navigationGroups.flatMap(group => group.items);
};

// Función para encontrar un elemento por su ID
export const findNavigationItemById = (id: string): NavigationItem | undefined => {
  return getAllNavigationItems().find(item => item.id === id);
};

// Función para encontrar un elemento por su ruta
export const findNavigationItemByPath = (path: string): NavigationItem | undefined => {
  return getAllNavigationItems().find(item => item.path === path);
};