interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  children?: NavigationItem[];
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const navigationConfig: NavigationSection[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Dashboard",
        path: "/",
        icon: "ri-dashboard-line",
      },
      {
        label: "Ownership Verifier",
        path: "/property-verifier",
        icon: "ri-shield-check-line",
      },
      {
        label: "AI Project Manager",
        path: "/ai-project-manager",
        icon: "ri-robot-line",
      },
      {
        label: "AR Fence Estimator",
        path: "/ar-fence-estimator", 
        icon: "ri-augmented-reality-line",
      },
    ],
  },
  {
    title: "Proyectos",
    items: [
      {
        label: "Proyectos",
        path: "/projects",
        icon: "ri-folder-line",
      },
      {
        label: "Clientes",
        path: "/clients",
        icon: "ri-user-3-line",
      },
      {
        label: "Precios y Tarifas",
        path: "/settings/pricing",
        icon: "ri-money-dollar-circle-line",
      },
      {
        label: "Planes de Suscripción",
        path: "/subscription",
        icon: "ri-vip-crown-line",
      },
      {
        label: "Historial",
        path: "/history",
        icon: "ri-history-line",
      },
    ],
  },
  {
    title: "Mi Cuenta",
    items: [
      {
        label: "Perfil Personal",
        path: "/settings/account",
        icon: "ri-user-3-line",
      },
      {
        label: "Suscripción",
        path: "/subscription",
        icon: "ri-vip-crown-line",
      },
      {
        label: "Notificaciones",
        path: "/settings/notifications",
        icon: "ri-notification-3-line",
      },
    ],
  },
  {
    title: "Configuración de Empresa",
    items: [
      {
        label: "Perfil de Empresa",
        path: "/profile",
        icon: "ri-building-line",
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
        icon: "ri-customer-service-line",
      },
      {
        label: "Acerca de Owl Fence App",
        path: "/about-owlfenc",
        icon: "ri-building-2-line",
      },
      {
        label: "Acerca de Mervin AI",
        path: "/about-mervin",
        icon: "ri-robot-line",
      },
      {
        label: "Políticas Legales",
        path: "/legal-policy",
        icon: "ri-article-line",
      },
      {
        label: "Política de Privacidad",
        path: "/privacy-policy",
        icon: "ri-lock-line",
      },
    ],
  },
];