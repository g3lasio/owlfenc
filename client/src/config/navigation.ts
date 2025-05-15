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
    title: "navigation.tools",
    items: [
      {
        id: "dashboard",
        label: "navigation.dashboard",
        path: "/",
        icon: "ri-dashboard-line"
      },
      {
        id: "mervin",
        label: "navigation.talkToMervin",
        path: "/mervin",
        icon: "ri-chat-voice-line"
      },
      {
        id: "projects",
        label: "navigation.projects",
        path: "/projects",
        icon: "ri-briefcase-4-line"
      },
      {
        id: "project-payments",
        label: "navigation.projectPayments",
        path: "/project-payments",
        icon: "ri-money-dollar-circle-line"
      },
      {
        id: "clients",
        label: "navigation.clients",
        path: "/clients",
        icon: "ri-user-star-line"
      },
      {
        id: "materials",
        label: "navigation.inventory",
        path: "/materials",
        icon: "ri-archive-line"
      },
      {
        id: "history",
        label: "navigation.history",
        path: "/history",
        icon: "ri-time-line"
      }
    ]
  },
  {
    title: "navigation.features",
    items: [
      {
        id: "property-verifier",
        label: "navigation.propertyVerification",
        path: "/property-verifier",
        icon: "ri-shield-keyhole-line"
      },
      {
        id: "contracts",
        label: "navigation.contractGeneration",
        path: "/contracts",
        icon: "ri-file-text-line"
      },
      {
        id: "permit-advisor",
        label: "navigation.permitAdvisor",
        path: "/permit-advisor",
        icon: "ri-robot-2-line"
      },
      {
        id: "ai-project-manager",
        label: "navigation.aiProjectManager",
        path: "/ai-project-manager",
        icon: "lucide-brain"
      },
      {
        id: "ar-fence-estimator",
        label: "navigation.arFenceEstimator",
        path: "/ar-fence-estimator",
        icon: "ri-ruler-line"
      }
    ]
  },
  {
    title: "navigation.profile",
    items: [
      {
        id: "account",
        label: "navigation.profile",
        path: "/account",
        icon: "lucide-user"
      },
      {
        id: "security",
        label: "navigation.security",
        path: "/security",
        icon: "ri-shield-keyhole-line"
      },
      {
        id: "billing",
        label: "navigation.billing",
        path: "/billing",
        icon: "lucide-credit-card"
      },
      {
        id: "subscription",
        label: "navigation.subscription",
        path: "/subscription",
        icon: "ri-vip-crown-line"
      }
    ]
  },
  {
    title: "navigation.company",
    items: [
      {
        id: "company-profile",
        label: "navigation.companyProfile",
        path: "/profile",
        icon: "lucide-building"
      },
      {
        id: "settings",
        label: "navigation.settings",
        path: "/settings",
        icon: "lucide-settings"
      },
      {
        id: "about-mervin",
        label: "navigation.aboutMervin",
        path: "/about-mervin",
        icon: "ri-robot-2-line"
      },
      {
        id: "about-owlfence",
        label: "navigation.aboutOwlFence",
        path: "/about-owlfenc",
        icon: "ri-store-3-line"
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