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
  external?: boolean;
  badge?: string;
  hasPreview?: boolean;
}

export interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

// Definición de todos los elementos de navegación
export const navigationGroups: NavigationGroup[] = [
  {
    title: "tools",
    items: [
      {
        id: "mervin",
        label: "navigation.talkToMervin",
        path: "/mervin",
        icon: "ri-chat-voice-line"
      },
      {
        id: "leadprime-crm",
        label: "LeadPrime CRM",
        path: "https://leadprime.chyrris.com/",
        icon: "lucide-zap",
        external: true,
        badge: "NEW",
        hasPreview: true
      },
      {
        id: "projects",
        label: "navigation.projects",
        path: "/projects",
        icon: "ri-briefcase-4-line"
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
      }
    ]
  },
  {
    title: "features",
    items: [
      {
        id: "estimates",
        label: "navigation.estimateGenerator",
        path: "/estimates",
        icon: "ri-file-list-3-line"
      },
      {
        id: "legal-defense",
        label: "navigation.contractGenerator",
        path: "/legal-defense",
        icon: "ri-shield-keyhole-line"
      },
      {
        id: "property-verifier",
        label: "navigation.propertyVerification",
        path: "/property-verifier",
        icon: "ri-shield-keyhole-line"
      },
      {
        id: "project-payments",
        label: "navigation.paymentTracker",
        path: "/project-payments",
        icon: "ri-money-dollar-circle-line"
      },
      {
        id: "invoices",
        label: "Invoices",
        path: "/invoices",
        icon: "ri-file-text-line"
      },

      {
        id: "permit-advisor",
        label: "navigation.permitAdvisor",
        path: "/permit-advisor",
        icon: "ri-robot-2-line"
      },
      {
        id: "owl-funding",
        label: "Owl Funding",
        path: "/owl-funding",
        icon: "ri-money-dollar-box-line"
      }
    ]
  },
  {
    title: "help-support",
    items: [
      {
        id: "help-center",
        label: "Help Center",
        path: "/support/help-center",
        icon: "ri-question-line"
      },
      {
        id: "get-support",
        label: "Get Support",
        path: "/support/get-support",
        icon: "ri-customer-service-2-line"
      }
    ]
  },
  {
    title: "account",
    items: [
      {
        id: "profile",
        label: "navigation.companyProfile",
        path: "/profile",
        icon: "lucide-settings"
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