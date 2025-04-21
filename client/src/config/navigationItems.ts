import { NavigationItem, NavigationSection } from "@/types/navigation";

// Configuración para el menú principal (izquierdo)
export const mainNavigationConfig: NavigationSection[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Dashboard",
        path: "/",
        icon: "ri-layout-grid-line",
      },
      {
        label: "Ownership Verifier",
        path: "/property-verifier",
        icon: "ri-shield-keyhole-line",
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
        icon: "ri-camera-lens-line",
      },
    ],
  },
  {
    title: "Proyectos",
    items: [
      {
        label: "Proyectos",
        path: "/projects",
        icon: "ri-briefcase-4-line",
      },
      {
        label: "Clientes",
        path: "/clients",
        icon: "ri-user-star-line",
      },
      
      {
        label: "Historial",
        path: "/history",
        icon: "ri-time-line",
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
    title: "Configuración de Empresa",
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
    title: "Soporte",
    items: [
      {
        label: "Contactar Soporte",
        path: "mailto:mervin@owlfenc.com",
        icon: "ri-customer-service-2-line",
      },
      {
        label: "Acerca de Owl Fence App",
        path: "/about-owlfenc",
        icon: "ri-store-3-line",
      },
      {
        label: "Acerca de Mervin AI",
        path: "/about-mervin",
        icon: "ri-openai-line",
      },
      {
        label: "Políticas Legales",
        path: "/legal-policy",
        icon: "ri-file-shield-2-line",
      },
      {
        label: "Política de Privacidad",
        path: "/privacy-policy",
        icon: "ri-shield-check-line",
      },
    ],
  },
];