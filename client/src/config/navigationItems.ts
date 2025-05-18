import { NavigationItem, NavigationSection } from "@/types/navigation";

// Configuración para el menú principal (izquierdo)
export const mainNavigationConfig: NavigationSection[] = [
  
  {
    title: "Herramientas",
    items: [
      {
        label: "Verificador de Propiedad",
        path: "/property-verifier",
        icon: "ri-shield-keyhole-line",
      },
      {
        label: "Contract Generator",
        path: "/contracts",
        icon: "ri-file-contract-line",
      },
      {
        label: "Mervin DeepSearch",
        path: "/permit-advisor",
        icon: "ri-robot-2-line",
      },
      {
        label: "AI Project Manager",
        path: "/ai-project-manager",
        icon: "ri-brain-line",
      },
      {
        label: "AR Fence Estimator",
        path: "/ar-fence-estimator",
        icon: "ri-3d-cube-sphere-line",
      },
    ],
  },
  {
    title: "Proyectos",
    items: [
      {
        label: "Dashboard",
        path: "/projects",
        icon: "ri-briefcase-4-line",
      },
      {
        label: "Clientes",
        path: "/clients",
        icon: "ri-user-star-line",
      },
      {
        label: "Estimados",
        path: "/estimates",
        icon: "ri-file-list-3-line",
      },
      {
        label: "My Inventory",
        path: "/materials",
        icon: "ri-archive-line",
      },
    ],
  }
];

// Configuración para el menú de usuario (derecho)
export const userNavigationConfig: NavigationSection[] = [
  {
    title: "Mi Cuenta",
    items: [
      {
        label: "Perfil Personal",
        path: "/settings/account",
        icon: "ri-user-settings-line",
      },
      {
        label: "Mejorar Plan",
        path: "/subscription",
        icon: "ri-vip-crown-line",
      },
    ],
  },
  {
    title: "Configuración",
    items: [
      {
        label: "Perfil de Empresa",
        path: "/profile",
        icon: "ri-building-4-line",
      },
      {
        label: "Empleados",
        path: "/settings/employees",
        icon: "ri-team-line",
      },
    ],
  },
  {
    title: "Ayuda y Soporte",
    items: [
      {
        label: "Contactar Soporte",
        path: "mailto:mervin@owlfenc.com",
        icon: "ri-customer-service-2-line",
      },
      {
        label: "Acerca de Owl Fence",
        path: "/about-owlfenc",
        icon: "ri-store-3-line",
      },
      {
        label: "Acerca de Mervin",
        path: "/about-mervin",
        icon: "ri-robot-2-line",
      },
      {
        label: "Política Legal",
        path: "/legal-policy",
        icon: "ri-file-shield-2-line",
      },
    ],
  },
];