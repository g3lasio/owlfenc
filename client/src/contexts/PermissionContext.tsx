import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Tipos para el sistema de permisos
export interface Plan {
  id: number;
  name: string;
  motto: string;
  price: number;
  trialDays?: number;
  limits: UserLimits;
  features: string[];
}

export interface UserLimits {
  basicEstimates: number;    // -1 = ilimitado
  aiEstimates: number;       // -1 = ilimitado  
  contracts: number;         // -1 = ilimitado
  propertyVerifications: number;
  permitAdvisor: number;
  projects: number;          // 0 = solo demo
  invoices: number;          // 0 = solo demo
  paymentTracking: number;   // 0 = disabled, 1 = basic, 2 = pro
}

export interface UserUsage {
  basicEstimates: number;
  aiEstimates: number;
  contracts: number;
  propertyVerifications: number;
  permitAdvisor: number;
  projects: number;
  month: string; // YYYY-MM format
}

export interface PermissionContextValue {
  userPlan: Plan | null;
  userUsage: UserUsage | null;
  loading: boolean;
  
  // Permission methods
  hasAccess: (feature: string) => boolean;
  canUse: (feature: string, count?: number) => boolean;
  getRemainingUsage: (feature: string) => number;
  isLimitReached: (feature: string) => boolean;
  
  // UI methods
  showUpgradeModal: (feature: string, message?: string) => void;
  incrementUsage: (feature: string, count?: number) => Promise<void>;
}

// Planes predefinidos
const PLANS: Plan[] = [
  {
    id: 1,
    name: "Primo Chambeador",
    motto: "Ningún trabajo es pequeño cuando tu espíritu es grande",
    price: 0,
    limits: {
      basicEstimates: 10,
      aiEstimates: 3,
      contracts: 3,
      propertyVerifications: 5,
      permitAdvisor: 5,
      projects: 0,
      invoices: 0,
      paymentTracking: 0
    },
    features: [
      "10 estimados básicos/mes (con marca de agua)",
      "3 estimados con IA/mes (con marca de agua)",
      "3 contratos/mes (con marca de agua)",
      "5 Property Verification/mes",
      "5 Permit Advisor/mes",
      "Vista demo de funciones premium"
    ]
  },
  {
    id: 2,
    name: "Mero Patrón",
    motto: "No eres solo un patrón, eres el estratega que transforma el reto en victoria",
    price: 4999,
    limits: {
      basicEstimates: -1,
      aiEstimates: 50,
      contracts: -1,
      propertyVerifications: 50,
      permitAdvisor: 50,
      projects: 5,
      invoices: -1,
      paymentTracking: 1
    },
    features: [
      "Estimados básicos ilimitados (sin marca de agua)",
      "50 estimados con IA/mes (sin marca de agua)",
      "Contratos ilimitados (sin marca de agua)",
      "50 Property Verification/mes",
      "50 Permit Advisor/mes",
      "5 proyectos AI/mes",
      "Sistema de facturación completo"
    ]
  },
  {
    id: 3,
    name: "Master Contractor",
    motto: "Tu voluntad es acero, tu obra es ley. Lidera como un verdadero campeón",
    price: 9999,
    limits: {
      basicEstimates: -1,
      aiEstimates: -1,
      contracts: -1,
      propertyVerifications: -1,
      permitAdvisor: -1,
      projects: -1,
      invoices: -1,
      paymentTracking: 2
    },
    features: [
      "TODO ILIMITADO",
      "Sin marcas de agua",
      "Integración QuickBooks",
      "Soporte VIP 24/7",
      "Análisis predictivo avanzado"
    ]
  },
  {
    id: 4,
    name: "Trial Master",
    motto: "Prueba el poder total por 21 días",
    price: 0,
    trialDays: 21,
    limits: {
      basicEstimates: -1,
      aiEstimates: -1,
      contracts: -1,
      propertyVerifications: -1,
      permitAdvisor: -1,
      projects: -1,
      invoices: -1,
      paymentTracking: 2
    },
    features: [
      "ACCESO TOTAL por 21 días",
      "Todas las funciones premium",
      "Sin marcas de agua",
      "Soporte premium"
    ]
  }
];

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { currentUser } = useAuth();
  const [userPlan, setUserPlan] = useState<Plan | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado para modal de upgrade
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [upgradeFeature, setUpgradeFeature] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadUserPlan();
      loadUserUsage();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const loadUserPlan = async () => {
    try {
      // Verificar simulación de desarrollo primero
      const devSimulation = localStorage.getItem('dev_user_plan_simulation');
      if (devSimulation && process.env.NODE_ENV === 'development') {
        const simData = JSON.parse(devSimulation);
        
        // Mapear IDs de string a IDs numéricos
        const planIdMapping: { [key: string]: number } = {
          'free-trial': 4,          // Trial Master
          'primo-chambeador': 1,    // Primo Chambeador  
          'mero-patron': 2,         // Mero Patrón
          'emperador-del-negocio': 3 // Master Contractor
        };
        
        const numericPlanId = planIdMapping[simData.currentPlan] || 1;
        const simulatedPlan = PLANS.find(p => p.id === numericPlanId) || PLANS[0];
        
        // Agregar información de simulación para debugging
        console.log(`🧪 [DEV-SIMULATION] Usando plan simulado: ${simulatedPlan.name} (ID: ${numericPlanId})`);
        
        setUserPlan(simulatedPlan);
        return;
      }

      // Comportamiento normal - llamar a la API
      const response = await fetch('/api/subscription/user-subscription', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const planData = data.plan;
        
        // Mapear plan del servidor a nuestro formato local
        const plan = PLANS.find(p => p.id === planData.id) || PLANS[0];
        setUserPlan(plan);
      } else {
        // Por defecto, plan gratuito
        setUserPlan(PLANS[0]);
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
      setUserPlan(PLANS[0]); // Fallback al plan gratuito
    }
  };

  const loadUserUsage = async () => {
    if (!currentUser) return;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const response = await fetch(`/api/usage/${currentUser.uid}?month=${currentMonth}`);
      
      if (response.ok) {
        const usage = await response.json();
        setUserUsage(usage);
      } else {
        // Inicializar uso vacío para el mes actual
        setUserUsage({
          basicEstimates: 0,
          aiEstimates: 0,
          contracts: 0,
          propertyVerifications: 0,
          permitAdvisor: 0,
          projects: 0,
          month: currentMonth
        });
      }
    } catch (error) {
      console.error('Error loading user usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (feature: string): boolean => {
    if (!userPlan) return false;

    const limit = userPlan.limits[feature as keyof UserLimits];
    return typeof limit === 'number' && limit !== 0;
  };

  const canUse = (feature: string, count: number = 1): boolean => {
    if (!userPlan || !userUsage) return false;

    const limit = userPlan.limits[feature as keyof UserLimits];
    const usage = userUsage[feature as keyof UserUsage] || 0;

    // Si es ilimitado (-1), siempre puede usar
    if (limit === -1) return true;
    
    // Si no tiene acceso (0), no puede usar
    if (limit === 0) return false;

    // Verificar si tiene uso disponible
    return (usage + count) <= limit;
  };

  const getRemainingUsage = (feature: string): number => {
    if (!userPlan || !userUsage) return 0;

    const limit = userPlan.limits[feature as keyof UserLimits];
    const usage = userUsage[feature as keyof UserUsage] || 0;

    if (limit === -1) return 999999; // Ilimitado
    if (limit === 0) return 0; // Sin acceso

    return Math.max(0, limit - usage);
  };

  const isLimitReached = (feature: string): boolean => {
    return getRemainingUsage(feature) === 0;
  };

  const showUpgradeModal = (feature: string, message?: string) => {
    setUpgradeFeature(feature);
    setUpgradeMessage(message || `Necesitas un plan superior para usar ${feature}`);
    setUpgradeModalOpen(true);
  };

  const incrementUsage = async (feature: string, count: number = 1): Promise<void> => {
    if (!currentUser || !userUsage) return;

    try {
      const response = await fetch('/api/usage/increment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          feature,
          count,
          month: userUsage.month
        })
      });

      if (response.ok) {
        // Actualizar uso local
        setUserUsage(prev => ({
          ...prev!,
          [feature]: (prev![feature as keyof UserUsage] as number) + count
        }));
      }
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  const contextValue: PermissionContextValue = {
    userPlan,
    userUsage,
    loading,
    hasAccess,
    canUse,
    getRemainingUsage,
    isLimitReached,
    showUpgradeModal,
    incrementUsage
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
      
      {/* Modal de upgrade - aquí integrarías tu componente de modal existente */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Upgrade Necesario</h3>
            <p className="text-gray-600 mb-6">{upgradeMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setUpgradeModalOpen(false);
                  // Redirigir a página de suscripción
                  window.location.href = '/subscription';
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Ver Planes
              </button>
            </div>
          </div>
        </div>
      )}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}