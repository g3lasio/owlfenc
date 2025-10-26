import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { smartPermissionLoader } from '@/services/smartPermissionLoader';
import { devModeManager, debugLog } from '@/utils/devModeUtils';
import { PLAN_IDS, getPlanLimits, PLAN_NAMES, PLAN_FEATURES, PLAN_MOTTOS, planNameToId } from '@shared/permissions-config';

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
  deepsearch: number;        // Búsquedas avanzadas con IA por estimado
}

export interface UserUsage {
  basicEstimates: number;
  aiEstimates: number;
  contracts: number;
  propertyVerifications: number;
  permitAdvisor: number;
  projects: number;
  deepsearch: number;
  month: string; // YYYY-MM format
}

export interface PermissionContextValue {
  userPlan: Plan | null;
  userUsage: UserUsage | null;
  loading: boolean;
  
  // Trial information
  isTrialUser: boolean;
  trialDaysRemaining: number;
  
  // Permission methods
  hasAccess: (feature: string) => boolean;
  canUse: (feature: string, count?: number) => boolean;
  getRemainingUsage: (feature: string) => number;
  isLimitReached: (feature: string) => boolean;
  
  // UI methods
  showUpgradeModal: (feature: string, message?: string) => void;
  incrementUsage: (feature: string, count?: number) => Promise<void>;
  
  // Helper methods
  getUpgradeReason: (feature: string) => string;
}

// ✅ MIGRADO: Planes ahora se construyen desde archivo centralizado
// Planes predefinidos (IDs sincronizados con PostgreSQL)
const PLANS: Plan[] = [
  {
    id: PLAN_IDS.PRIMO_CHAMBEADOR,
    name: PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR],
    motto: PLAN_MOTTOS[PLAN_IDS.PRIMO_CHAMBEADOR],
    price: 0,
    limits: getPlanLimits(PLAN_IDS.PRIMO_CHAMBEADOR) as UserLimits,
    features: PLAN_FEATURES[PLAN_IDS.PRIMO_CHAMBEADOR] as string[]
  },
  {
    id: PLAN_IDS.MERO_PATRON,
    name: PLAN_NAMES[PLAN_IDS.MERO_PATRON],
    motto: PLAN_MOTTOS[PLAN_IDS.MERO_PATRON],
    price: 4999,
    limits: getPlanLimits(PLAN_IDS.MERO_PATRON) as UserLimits,
    features: PLAN_FEATURES[PLAN_IDS.MERO_PATRON] as string[]
  },
  {
    id: PLAN_IDS.MASTER_CONTRACTOR,
    name: PLAN_NAMES[PLAN_IDS.MASTER_CONTRACTOR],
    motto: PLAN_MOTTOS[PLAN_IDS.MASTER_CONTRACTOR],
    price: 9900,
    limits: getPlanLimits(PLAN_IDS.MASTER_CONTRACTOR) as UserLimits,
    features: PLAN_FEATURES[PLAN_IDS.MASTER_CONTRACTOR] as string[]
  },
  {
    id: PLAN_IDS.FREE_TRIAL,
    name: PLAN_NAMES[PLAN_IDS.FREE_TRIAL],
    motto: PLAN_MOTTOS[PLAN_IDS.FREE_TRIAL],
    price: 0,
    trialDays: 14,
    limits: getPlanLimits(PLAN_IDS.FREE_TRIAL) as UserLimits,
    features: PLAN_FEATURES[PLAN_IDS.FREE_TRIAL] as string[]
  }
];

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  // ✅ SAFE AUTH ACCESS: Handle case when AuthContext is not yet available
  let currentUser = null;
  try {
    const auth = useAuth();
    currentUser = auth.currentUser;
  } catch (error) {
    // AuthContext not yet available - this is expected during initialization
    console.log("🔄 [PERMISSION-CONTEXT] No hay usuario - usando estado por defecto");
  }
  
  const [userPlan, setUserPlan] = useState<Plan | null>(null);
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(false); // ✅ FIXED: Start with false for better UX
  const [isTrialUser, setIsTrialUser] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false); // ✅ FIXED: Separate initialization state

  // Estado para modal de upgrade
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [upgradeFeature, setUpgradeFeature] = useState('');

  const loadUserPlan = useCallback(async () => {
    if (!currentUser?.uid) {
      console.log(`📭 [PERMISSION-CONTEXT] No user - using default free plan`);
      setUserPlan(PLANS[0]);
      return;
    }

    try {
      // 🔐 CRITICAL FIX: Obtener idToken del usuario autenticado
      let idToken: string | undefined;
      try {
        idToken = await currentUser.getIdToken();
      } catch (tokenError) {
        console.error('❌ [PERMISSION-CONTEXT] Error getting ID token:', tokenError);
        // Continuar sin token - el sistema usará fallback
      }

      // PRIORITY: Use robust backend system
      const response = await fetch(`/api/auth/user-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firebaseUid: currentUser.uid,
          email: currentUser.email,
          idToken: idToken || '' // Enviar token si está disponible
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.subscription) {
          const { planName, daysRemaining, isTrialing } = data.subscription;
          
          // ✅ MIGRADO: Usar función centralizada para mapeo de nombres a IDs
          const planId = planNameToId(planName);
          const plan = PLANS.find(p => p.id === planId) || PLANS[0];
          setUserPlan(plan);
          
          // Set trial information
          setIsTrialUser(isTrialing || false);
          setTrialDaysRemaining(daysRemaining || 0);
          
          console.log(`✅ [PERMISSION-CONTEXT] Loaded plan: ${planName} (ID: ${planId}), Trial: ${isTrialing}, Days: ${daysRemaining}`);
          return;
        }
      }

      // FALLBACK: Only use dev simulation if API fails
      const devSimulation = localStorage.getItem('dev_user_plan_simulation');
      if (devSimulation && process.env.NODE_ENV === 'development') {
        const simData = JSON.parse(devSimulation);
        
        // ✅ MIGRADO: Usar función centralizada para mapeo
        const numericPlanId = planNameToId(simData.currentPlan);
        const simulatedPlan = PLANS.find(p => p.id === numericPlanId) || PLANS[0];
        
        console.log(`🧪 [DEV-SIMULATION] API failed, usando plan simulado: ${simulatedPlan.name} (ID: ${numericPlanId})`);
        
        setUserPlan(simulatedPlan);
        return;
      }

      // Final fallback: default free plan
      console.log(`📭 [PERMISSION-CONTEXT] No API data and no simulation - using default free plan`);
      setUserPlan(PLANS[0]);
      setIsTrialUser(false);
      setTrialDaysRemaining(0);
    } catch (error) {
      console.error('Error loading user plan:', error);
      setUserPlan(PLANS[0]); // Fallback al plan gratuito
    }
  }, [currentUser?.uid]);

  const loadUserUsage = useCallback(async () => {
    if (!currentUser?.uid) {
      setUserUsage({
        basicEstimates: 0,
        aiEstimates: 0,
        contracts: 0,
        propertyVerifications: 0,
        permitAdvisor: 0,
        projects: 0,
        deepsearch: 0,
        month: new Date().toISOString().slice(0, 7)
      });
      setLoading(false);
      setIsInitialized(true); // ✅ FIXED: Mark as initialized even with no user
      return;
    }

    try {
      // 🔧 SECURITY FIX: Load all feature usage from backend
      const [estimatesResponse, contractsResponse] = await Promise.all([
        fetch(`/api/auth/can-access/${currentUser.uid}/basicEstimates`),
        fetch(`/api/auth/can-access/${currentUser.uid}/contracts`)
      ]);
      
      let basicEstimatesUsed = 0;
      let contractsUsed = 0;
      
      // Load basic estimates usage
      if (estimatesResponse.ok) {
        const estimatesData = await estimatesResponse.json();
        if (estimatesData.success && estimatesData.usage) {
          basicEstimatesUsed = estimatesData.usage.used || 0;
        }
      }
      
      // Load contracts usage
      if (contractsResponse.ok) {
        const contractsData = await contractsResponse.json();
        if (contractsData.success && contractsData.usage) {
          contractsUsed = contractsData.usage.used || 0;
        }
      }
      
      const usage = {
        basicEstimates: basicEstimatesUsed,
        aiEstimates: 0, // Will be loaded separately if needed
        contracts: contractsUsed, // ✅ Now loaded from backend
        propertyVerifications: 0, // Will be loaded separately if needed
        permitAdvisor: 0, // Will be loaded separately if needed
        projects: 0,
        deepsearch: 0,
        month: new Date().toISOString().slice(0, 7)
      };
      
      setUserUsage(usage);
      console.log(`✅ [PERMISSION-CONTEXT] Usage loaded - estimates: ${basicEstimatesUsed}, contracts: ${contractsUsed}`);
    } catch (error) {
      console.error('Error loading user usage:', error);
      setUserUsage({
        basicEstimates: 0,
        aiEstimates: 0,
        contracts: 0,
        propertyVerifications: 0,
        permitAdvisor: 0,
        projects: 0,
        deepsearch: 0,
        month: new Date().toISOString().slice(0, 7)
      });
    } finally {
      setLoading(false);
      setIsInitialized(true); // ✅ FIXED: Mark as initialized regardless of success/failure
    }
  }, [currentUser?.uid]);

  // Simplified useEffect to prevent dependency loops
  useEffect(() => {
    if (currentUser) {
      console.log(`🔄 [PERMISSION-CONTEXT] Cargando datos para usuario: ${currentUser.uid}`);
      loadUserPlan();
      loadUserUsage();
    } else {
      console.log(`🔄 [PERMISSION-CONTEXT] No hay usuario - usando estado por defecto`);
      setUserPlan(PLANS[0]); // Plan por defecto
      setUserUsage({
        basicEstimates: 0,
        aiEstimates: 0,
        contracts: 0,
        propertyVerifications: 0,
        permitAdvisor: 0,
        projects: 0,
        deepsearch: 0,
        month: new Date().toISOString().slice(0, 7)
      });
      setLoading(false);
      setIsInitialized(true); // ✅ FIXED: Always mark as initialized in fallback
    }
  }, [currentUser?.uid]); // Solo depender del UID del usuario

  const hasAccess = (feature: string): boolean => {
    // ✅ FIXED: Si estamos cargando datos, permitir acceso temporalmente para evitar bloqueos
    if (!userPlan) {
      // Si hay usuario autenticado pero plan aún cargando, dar acceso temporal
      if (currentUser?.uid && !isInitialized) {
        console.log(`🔓 [PERMISSION-FIX] Permitiendo acceso temporal a ${feature} mientras se cargan datos`);
        return true; // Permitir acceso mientras carga
      }
      return false;
    }

    const limit = userPlan.limits[feature as keyof UserLimits];
    return typeof limit === 'number' && limit !== 0;
  };

  const canUse = (feature: string, count: number = 1): boolean => {
    // ✅ FIXED: Si los datos aún se están cargando pero hay usuario autenticado, permitir acceso temporal
    if ((!userPlan || !userUsage) && currentUser?.uid && !isInitialized) {
      console.log(`🔓 [PERMISSION-FIX] Permitiendo acceso temporal a ${feature} mientras se cargan datos`);
      return true; // Acceso temporal mientras carga
    }
    
    if (!userPlan || !userUsage) return false;

    const limit = userPlan.limits[feature as keyof UserLimits];
    const usage = userUsage[feature as keyof UserUsage] || 0;

    // Si es ilimitado (-1), siempre puede usar
    if (limit === -1) return true;
    
    // Si no tiene acceso (0), no puede usar
    if (limit === 0) return false;

    // Verificar si tiene uso disponible
    return (Number(usage) + count) <= limit;
  };

  const getRemainingUsage = (feature: string): number => {
    if (!userPlan || !userUsage) return 0;

    const limit = userPlan.limits[feature as keyof UserLimits];
    const usage = userUsage[feature as keyof UserUsage] || 0;

    if (limit === -1) return -1; // Ilimitado
    if (limit === 0) return 0; // Sin acceso

    return Math.max(0, limit - Number(usage));
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
      // Usar la misma lógica de detección de desarrollo que loadUserUsage
      const isDevelopment = window.location.hostname.includes('replit') || window.location.hostname.includes('localhost');
      const userId = currentUser.uid;
      
      console.log(`📊 [USAGE-INCREMENT] Incrementando ${feature} por ${count} para usuario: ${userId}`);

      // Usar apiRequest para asegurar autenticación automática
      const { apiRequest } = await import('@/lib/queryClient');
      
      const requestBody: any = {
        feature,
        count,
        month: userUsage.month
      };
      
      // Solo enviar userId en producción
      if (!isDevelopment) {
        requestBody.userId = currentUser.uid;
      }
      
      const response = await apiRequest('POST', '/api/usage/increment', requestBody);

      if (response.ok) {
        // Después del incremento exitoso, recargar el uso actualizado con el mismo userId
        const updatedUsage = await apiRequest('GET', `/api/usage/${userId}`);
        
        if (updatedUsage.ok) {
          const usageData = await updatedUsage.json();
          setUserUsage(usageData);
          console.log(`✅ [USAGE-INCREMENT] ${feature} incrementado y recargado exitosamente. Nuevo valor: ${usageData[feature]}`);
        } else {
          // Fallback: actualizar localmente si falla la recarga
          setUserUsage(prev => ({
            ...prev!,
            [feature]: (prev![feature as keyof UserUsage] as number) + count
          }));
        }
      } else {
        console.error(`❌ [USAGE-INCREMENT] Error al incrementar ${feature}:`, response.status);
      }
    } catch (error) {
      console.error(`❌ [USAGE-INCREMENT] Error incrementando uso de ${feature}:`, error);
    }
  };

  const getUpgradeReason = (feature: string): string => {
    if (!userPlan) return 'Se requiere una suscripción';
    
    const featureMessages: { [key: string]: string } = {
      'basicEstimates': 'Crea estimados básicos ilimitados sin marca de agua',
      'aiEstimates': 'Genera estimados con IA avanzada sin límites',
      'contracts': 'Crea contratos profesionales ilimitados',
      'propertyVerifications': 'Verifica propiedades sin restricciones',
      'permitAdvisor': 'Consulta permisos sin límites mensuales',
      'projects': 'Gestiona proyectos con IA avanzada',
      'invoices': 'Sistema completo de facturación',
      'paymentTracking': 'Seguimiento avanzado de pagos'
    };
    
    return featureMessages[feature] || `Accede a ${feature} sin restricciones`;
  };

  const contextValue: PermissionContextValue = {
    userPlan,
    userUsage,
    loading,
    isTrialUser,
    trialDaysRemaining,
    hasAccess,
    canUse,
    getRemainingUsage,
    isLimitReached,
    showUpgradeModal,
    incrementUsage,
    getUpgradeReason
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