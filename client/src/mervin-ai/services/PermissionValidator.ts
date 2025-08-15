/**
 * PERMISSION VALIDATOR - VALIDACIÓN INTELIGENTE DE PERMISOS
 * 
 * Sistema de validación de permisos que verifica capacidades del usuario
 * en tiempo real y proporciona sugerencias de upgrade cuando sea necesario.
 * 
 * Responsabilidades:
 * - Validación de permisos en tiempo real
 * - Sugerencias de upgrade inteligentes
 * - Tracking de límites de uso
 * - Gestión de features premium
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
  requiredPlan: string;
  category: 'basic' | 'premium' | 'enterprise';
  usageLimit?: number;
  resetPeriod?: 'daily' | 'monthly' | 'yearly';
}

export interface UserPermissions {
  userId: string;
  planLevel: string;
  permissions: Record<string, boolean>;
  usageLimits: Record<string, number>;
  currentUsage: Record<string, number>;
  lastUpdated: Date;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  suggestionType?: 'upgrade' | 'limit' | 'feature';
  suggestionMessage?: string;
  upgradeUrl?: string;
  remainingUsage?: number;
}

export class PermissionValidator {
  private userPermissions: UserPermissions | null = null;
  private permissionDefinitions: Map<string, Permission>;
  
  constructor() {
    this.permissionDefinitions = new Map();
    this.initializePermissions();
  }

  /**
   * Inicializar permisos del usuario
   */
  async initializeUserPermissions(userId: string): Promise<void> {
    try {
      // Cargar permisos desde localStorage o API
      const stored = localStorage.getItem(`permissions_${userId}`);
      if (stored) {
        this.userPermissions = JSON.parse(stored);
        this.userPermissions!.lastUpdated = new Date(this.userPermissions!.lastUpdated);
      } else {
        // Crear permisos por defecto
        this.userPermissions = await this.createDefaultPermissions(userId);
      }

      // Verificar si necesita actualización
      if (this.needsPermissionRefresh()) {
        await this.refreshPermissions();
      }

    } catch (error) {
      console.error('❌ [PERMISSION-VALIDATOR] Error inicializando permisos:', error);
      this.userPermissions = await this.createDefaultPermissions(userId);
    }
  }

  /**
   * Validar permiso específico
   */
  async validatePermission(permissionId: string, requestedUsage: number = 1): Promise<ValidationResult> {
    if (!this.userPermissions) {
      return {
        allowed: false,
        reason: 'Permisos no inicializados',
        suggestionType: 'upgrade',
        suggestionMessage: 'Necesitas inicializar tu cuenta para usar esta función'
      };
    }

    const permission = this.permissionDefinitions.get(permissionId);
    if (!permission) {
      return {
        allowed: false,
        reason: `Permiso no definido: ${permissionId}`
      };
    }

    // Verificar si el usuario tiene el permiso
    if (!this.userPermissions.permissions[permissionId]) {
      return {
        allowed: false,
        reason: `Permiso no otorgado: ${permission.name}`,
        suggestionType: 'upgrade',
        suggestionMessage: `Necesitas plan ${permission.requiredPlan} para usar ${permission.name}`,
        upgradeUrl: '/subscription'
      };
    }

    // Verificar límites de uso si aplica
    if (permission.usageLimit) {
      const currentUsage = this.userPermissions.currentUsage[permissionId] || 0;
      const limit = this.userPermissions.usageLimits[permissionId] || permission.usageLimit;

      if (currentUsage + requestedUsage > limit) {
        return {
          allowed: false,
          reason: `Límite de uso excedido para ${permission.name}`,
          suggestionType: 'limit',
          suggestionMessage: `Has alcanzado el límite de ${limit} usos para ${permission.name}. ${this.getResetMessage(permission.resetPeriod)}`,
          remainingUsage: Math.max(0, limit - currentUsage),
          upgradeUrl: '/subscription'
        };
      }

      return {
        allowed: true,
        remainingUsage: limit - currentUsage - requestedUsage
      };
    }

    return { allowed: true };
  }

  /**
   * Validar múltiples permisos
   */
  async validateMultiplePermissions(permissionIds: string[]): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};
    
    for (const permissionId of permissionIds) {
      results[permissionId] = await this.validatePermission(permissionId);
    }
    
    return results;
  }

  /**
   * Registrar uso de un permiso
   */
  async recordUsage(permissionId: string, usageAmount: number = 1): Promise<void> {
    if (!this.userPermissions) return;

    // Incrementar uso actual
    this.userPermissions.currentUsage[permissionId] = 
      (this.userPermissions.currentUsage[permissionId] || 0) + usageAmount;

    // Guardar cambios
    this.savePermissions();

    console.log(`📊 [PERMISSION-VALIDATOR] Recorded usage: ${permissionId} (+${usageAmount})`);
  }

  /**
   * Obtener estado de permisos del usuario
   */
  getUserPermissionStatus(): UserPermissions | null {
    return this.userPermissions ? { ...this.userPermissions } : null;
  }

  /**
   * Obtener sugerencias de upgrade
   */
  getUpgradeSuggestions(): string[] {
    if (!this.userPermissions) return [];

    const suggestions: string[] = [];
    const currentPlan = this.userPermissions.planLevel;

    // Analizar permisos faltantes
    for (const [permissionId, permission] of this.permissionDefinitions.entries()) {
      if (!this.userPermissions.permissions[permissionId]) {
        if (this.isPlanUpgrade(currentPlan, permission.requiredPlan)) {
          suggestions.push(`Upgrade a ${permission.requiredPlan} para usar ${permission.name}`);
        }
      }
    }

    // Analizar límites próximos a agotarse
    for (const [permissionId, permission] of this.permissionDefinitions.entries()) {
      if (permission.usageLimit && this.userPermissions.permissions[permissionId]) {
        const currentUsage = this.userPermissions.currentUsage[permissionId] || 0;
        const limit = this.userPermissions.usageLimits[permissionId] || permission.usageLimit;
        const percentage = (currentUsage / limit) * 100;

        if (percentage >= 80) {
          suggestions.push(`${permission.name}: ${currentUsage}/${limit} usos (${Math.round(percentage)}%)`);
        }
      }
    }

    return suggestions.slice(0, 5); // Top 5 sugerencias
  }

  /**
   * Resetear contadores de uso
   */
  async resetUsageCounters(resetType: 'daily' | 'monthly' | 'yearly'): Promise<void> {
    if (!this.userPermissions) return;

    let resetCount = 0;
    for (const [permissionId, permission] of this.permissionDefinitions.entries()) {
      if (permission.resetPeriod === resetType) {
        this.userPermissions.currentUsage[permissionId] = 0;
        resetCount++;
      }
    }

    if (resetCount > 0) {
      this.savePermissions();
      console.log(`🔄 [PERMISSION-VALIDATOR] Reset ${resetCount} usage counters (${resetType})`);
    }
  }

  /**
   * Actualizar plan del usuario
   */
  async updateUserPlan(newPlan: string): Promise<void> {
    if (!this.userPermissions) return;

    const oldPlan = this.userPermissions.planLevel;
    this.userPermissions.planLevel = newPlan;

    // Actualizar permisos basados en el nuevo plan
    this.updatePermissionsForPlan(newPlan);

    // Actualizar límites de uso
    this.updateUsageLimitsForPlan(newPlan);

    this.userPermissions.lastUpdated = new Date();
    this.savePermissions();

    console.log(`📈 [PERMISSION-VALIDATOR] Plan updated: ${oldPlan} → ${newPlan}`);
  }

  /**
   * Inicializar definiciones de permisos
   */
  private initializePermissions(): void {
    const permissions: Permission[] = [
      // Basic Features
      {
        id: 'basic_estimates',
        name: 'Estimados Básicos',
        description: 'Crear estimados simples',
        requiredPlan: 'free',
        category: 'basic',
        usageLimit: 5,
        resetPeriod: 'monthly'
      },
      {
        id: 'client_management',
        name: 'Gestión de Clientes',
        description: 'Administrar base de datos de clientes',
        requiredPlan: 'free',
        category: 'basic'
      },

      // Premium Features
      {
        id: 'ai_estimates',
        name: 'Estimados con IA',
        description: 'Estimados avanzados con análisis de IA',
        requiredPlan: 'pro',
        category: 'premium',
        usageLimit: 50,
        resetPeriod: 'monthly'
      },
      {
        id: 'contracts',
        name: 'Generación de Contratos',
        description: 'Crear contratos legales profesionales',
        requiredPlan: 'pro',
        category: 'premium',
        usageLimit: 25,
        resetPeriod: 'monthly'
      },
      {
        id: 'dual_signature',
        name: 'Firma Dual Digital',
        description: 'Sistema de firma digital para contratos',
        requiredPlan: 'pro',
        category: 'premium',
        usageLimit: 25,
        resetPeriod: 'monthly'
      },
      {
        id: 'permit_advisor',
        name: 'Asesor de Permisos',
        description: 'Análisis de permisos municipales requeridos',
        requiredPlan: 'pro',
        category: 'premium',
        usageLimit: 15,
        resetPeriod: 'monthly'
      },

      // Enterprise Features
      {
        id: 'property_verification',
        name: 'Verificación de Propiedades',
        description: 'Verificación avanzada de ownership de propiedades',
        requiredPlan: 'enterprise',
        category: 'enterprise',
        usageLimit: 100,
        resetPeriod: 'monthly'
      },
      {
        id: 'payment_tracking',
        name: 'Seguimiento de Pagos',
        description: 'Integración con QuickBooks y tracking avanzado',
        requiredPlan: 'enterprise',
        category: 'enterprise'
      },
      {
        id: 'analytics',
        name: 'Analíticas Avanzadas',
        description: 'Dashboard y reportes detallados',
        requiredPlan: 'enterprise',
        category: 'enterprise'
      },
      {
        id: 'unlimited_ai',
        name: 'IA Ilimitada',
        description: 'Uso ilimitado de todas las funciones de IA',
        requiredPlan: 'enterprise',
        category: 'enterprise'
      }
    ];

    permissions.forEach(permission => {
      this.permissionDefinitions.set(permission.id, permission);
    });
  }

  /**
   * Crear permisos por defecto
   */
  private async createDefaultPermissions(userId: string): Promise<UserPermissions> {
    const defaultPermissions: UserPermissions = {
      userId,
      planLevel: 'free',
      permissions: {
        basic_estimates: true,
        client_management: true
      },
      usageLimits: {
        basic_estimates: 5
      },
      currentUsage: {},
      lastUpdated: new Date()
    };

    this.savePermissions();
    return defaultPermissions;
  }

  /**
   * Verificar si necesita refresh de permisos
   */
  private needsPermissionRefresh(): boolean {
    if (!this.userPermissions) return true;

    const lastUpdate = this.userPermissions.lastUpdated.getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    return (now - lastUpdate) > oneHour;
  }

  /**
   * Refrescar permisos desde servidor
   */
  private async refreshPermissions(): Promise<void> {
    try {
      // En una implementación real, esto haría una llamada al servidor
      // Por ahora, solo actualizar timestamp
      if (this.userPermissions) {
        this.userPermissions.lastUpdated = new Date();
        this.savePermissions();
      }
    } catch (error) {
      console.error('❌ [PERMISSION-VALIDATOR] Error refreshing permissions:', error);
    }
  }

  /**
   * Actualizar permisos para un plan específico
   */
  private updatePermissionsForPlan(planLevel: string): void {
    if (!this.userPermissions) return;

    const planPermissions: Record<string, string[]> = {
      free: ['basic_estimates', 'client_management'],
      pro: ['basic_estimates', 'client_management', 'ai_estimates', 'contracts', 'dual_signature', 'permit_advisor'],
      enterprise: ['basic_estimates', 'client_management', 'ai_estimates', 'contracts', 'dual_signature', 'permit_advisor', 'property_verification', 'payment_tracking', 'analytics', 'unlimited_ai']
    };

    // Reset all permissions
    this.userPermissions.permissions = {};

    // Set permissions for current plan
    const allowedPermissions = planPermissions[planLevel] || planPermissions.free;
    allowedPermissions.forEach(permissionId => {
      this.userPermissions!.permissions[permissionId] = true;
    });
  }

  /**
   * Actualizar límites de uso para un plan específico
   */
  private updateUsageLimitsForPlan(planLevel: string): void {
    if (!this.userPermissions) return;

    const planLimits: Record<string, Record<string, number>> = {
      free: {
        basic_estimates: 5
      },
      pro: {
        basic_estimates: 100,
        ai_estimates: 50,
        contracts: 25,
        dual_signature: 25,
        permit_advisor: 15
      },
      enterprise: {
        basic_estimates: -1, // unlimited
        ai_estimates: -1,
        contracts: -1,
        dual_signature: -1,
        permit_advisor: -1,
        property_verification: 100
      }
    };

    this.userPermissions.usageLimits = planLimits[planLevel] || planLimits.free;
  }

  /**
   * Verificar si es upgrade de plan
   */
  private isPlanUpgrade(currentPlan: string, requiredPlan: string): boolean {
    const planHierarchy = ['free', 'pro', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);
    
    return requiredIndex > currentIndex;
  }

  /**
   * Obtener mensaje de reset
   */
  private getResetMessage(resetPeriod?: string): string {
    switch (resetPeriod) {
      case 'daily':
        return 'Los límites se resetean diariamente a medianoche.';
      case 'monthly':
        return 'Los límites se resetean el primer día de cada mes.';
      case 'yearly':
        return 'Los límites se resetean anualmente.';
      default:
        return 'Contacta soporte para más información.';
    }
  }

  /**
   * Guardar permisos
   */
  private savePermissions(): void {
    if (this.userPermissions) {
      try {
        localStorage.setItem(
          `permissions_${this.userPermissions.userId}`,
          JSON.stringify(this.userPermissions)
        );
      } catch (error) {
        console.error('❌ [PERMISSION-VALIDATOR] Error saving permissions:', error);
      }
    }
  }
}