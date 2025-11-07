/**
 * SNAPSHOT SERVICE - CENTRALIZED USER CONTEXT
 * 
 * Responsabilidad:
 * - Agregar TODO el contexto del usuario antes de cualquier acción
 * - Proporcionar estimados, contratos, preferencias, materiales, historial
 * - Permitir a Mervin tomar decisiones informadas con contexto completo
 */

import { firebaseEstimatesService } from '../../services/firebaseEstimatesService';
import { firebaseContractsService } from '../../services/firebaseContractsService';
import { firebaseSettingsService } from '../../services/firebaseSettingsService';
import { firebaseSearchService } from '../../services/firebaseSearchService';
import { expertContractorService } from '../../services/expertContractorService';
import type { EstimateData } from '../../services/firebaseEstimatesService';
import type { ContractData } from '../../services/firebaseContractsService';
import type { UserSettings } from '../../services/firebaseSettingsService';
import type { PropertySearchData, PermitSearchData } from '../../services/firebaseSearchService';

export interface UserSnapshot {
  userId: string;
  timestamp: Date;
  
  // Historial de estimados
  estimates: {
    recent: EstimateData[];
    total: number;
    byStatus: {
      draft: number;
      sent: number;
      approved: number;
    };
  };
  
  // Historial de contratos
  contracts: {
    recent: ContractData[];
    total: number;
    byStatus: {
      draft: number;
      sent: number;
      signed: number;
      completed: number;
    };
  };
  
  // Preferencias y configuración
  preferences: {
    settings: UserSettings;
    defaults: {
      taxRate: number;
      paymentTerms: string;
      warrantyPeriod: string;
      depositPercentage: number;
    };
  };
  
  // Historial de búsquedas
  searchHistory: {
    properties: PropertySearchData[];
    permits: PermitSearchData[];
  };
  
  // Catálogo de materiales (referencia)
  materialsAvailable: boolean;
  
  // Contexto resumido para AI
  contextSummary: string;
}

export class SnapshotService {
  /**
   * Obtener snapshot completo del contexto del usuario
   */
  async getSnapshot(userId: string): Promise<UserSnapshot> {
    console.log('📸 [SNAPSHOT] Generando snapshot completo para usuario:', userId);
    
    const startTime = Date.now();
    
    try {
      // Obtener datos en paralelo para máxima velocidad
      const [
        estimates,
        contracts,
        settings,
        propertySearches,
        permitSearches
      ] = await Promise.all([
        this.getEstimates(userId),
        this.getContracts(userId),
        this.getSettings(userId),
        this.getPropertySearchHistory(userId),
        this.getPermitSearchHistory(userId)
      ]);
      
      // Calcular defaults desde settings
      const defaults = {
        taxRate: settings.estimateDefaults?.taxRate || 8.75,
        paymentTerms: settings.contractDefaults?.paymentTerms || 'Net 30',
        warrantyPeriod: settings.contractDefaults?.warrantyPeriod || '1 year',
        depositPercentage: 50 // Default 50/50 split
      };
      
      // Generar resumen de contexto para AI
      const contextSummary = this.generateContextSummary({
        estimates,
        contracts,
        settings,
        propertySearches,
        permitSearches,
        defaults
      });
      
      const snapshot: UserSnapshot = {
        userId,
        timestamp: new Date(),
        estimates,
        contracts,
        preferences: {
          settings,
          defaults
        },
        searchHistory: {
          properties: propertySearches,
          permits: permitSearches
        },
        materialsAvailable: true,
        contextSummary
      };
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [SNAPSHOT] Snapshot generado en ${elapsed}ms`);
      console.log(`📊 [SNAPSHOT] Contexto: ${estimates.total} estimados, ${contracts.total} contratos, ${propertySearches.length} búsquedas de propiedad, ${permitSearches.length} búsquedas de permisos`);
      
      return snapshot;
      
    } catch (error) {
      console.error('❌ [SNAPSHOT] Error generando snapshot:', error);
      // Retornar snapshot mínimo en caso de error
      return this.getEmptySnapshot(userId);
    }
  }
  
  /**
   * Obtener historial de estimados
   */
  private async getEstimates(userId: string) {
    try {
      const allEstimates = await firebaseEstimatesService.getEstimatesByUser(userId, { limit: 50 });
      
      const byStatus = {
        draft: allEstimates.filter(e => e.status === 'draft').length,
        sent: allEstimates.filter(e => e.status === 'sent').length,
        approved: allEstimates.filter(e => e.status === 'approved').length
      };
      
      return {
        recent: allEstimates.slice(0, 10), // Últimos 10
        total: allEstimates.length,
        byStatus
      };
    } catch (error) {
      console.warn('⚠️ [SNAPSHOT] Error obteniendo estimados:', error);
      return {
        recent: [],
        total: 0,
        byStatus: { draft: 0, sent: 0, approved: 0 }
      };
    }
  }
  
  /**
   * Obtener historial de contratos
   */
  private async getContracts(userId: string) {
    try {
      const allContracts = await firebaseContractsService.getContractsByUser(userId, { limit: 50 });
      
      const byStatus = {
        draft: allContracts.filter(c => c.status === 'draft').length,
        sent: allContracts.filter(c => c.status === 'sent').length,
        signed: allContracts.filter(c => c.status === 'signed').length,
        completed: allContracts.filter(c => c.status === 'completed').length
      };
      
      return {
        recent: allContracts.slice(0, 10), // Últimos 10
        total: allContracts.length,
        byStatus
      };
    } catch (error) {
      console.warn('⚠️ [SNAPSHOT] Error obteniendo contratos:', error);
      return {
        recent: [],
        total: 0,
        byStatus: { draft: 0, sent: 0, signed: 0, completed: 0 }
      };
    }
  }
  
  /**
   * Obtener configuración del usuario
   */
  private async getSettings(userId: string): Promise<UserSettings> {
    try {
      const settings = await firebaseSettingsService.getUserSettings(userId);
      // getUserSettings ya retorna defaults si no existen settings
      return settings!;
    } catch (error) {
      console.warn('⚠️ [SNAPSHOT] Error obteniendo settings, usando defaults básicos');
      // Fallback manual si falla completamente
      return {
        userId,
        language: 'en',
        timezone: 'America/Los_Angeles',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        measurementUnit: 'imperial',
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        marketingEmails: false,
        notificationPreferences: {},
        estimateDefaults: {
          validityDays: 30,
          paymentTerms: 'Net 30',
          taxRate: 8.75
        },
        contractDefaults: {
          paymentTerms: 'Net 30',
          warrantyPeriod: '1 year'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: false
      };
    }
  }
  
  /**
   * Obtener historial de búsquedas de propiedades
   */
  private async getPropertySearchHistory(userId: string): Promise<PropertySearchData[]> {
    try {
      return await firebaseSearchService.getPropertySearchHistory(userId, { limit: 20 });
    } catch (error) {
      console.warn('⚠️ [SNAPSHOT] Error obteniendo historial de propiedades:', error);
      return [];
    }
  }
  
  /**
   * Obtener historial de búsquedas de permisos
   */
  private async getPermitSearchHistory(userId: string): Promise<PermitSearchData[]> {
    try {
      return await firebaseSearchService.getPermitSearchHistory(userId, { limit: 20 });
    } catch (error) {
      console.warn('⚠️ [SNAPSHOT] Error obteniendo historial de permisos:', error);
      return [];
    }
  }
  
  /**
   * Generar resumen de contexto para AI
   */
  private generateContextSummary(data: any): string {
    const lines: string[] = [];
    
    lines.push('=== USER CONTEXT SNAPSHOT ===');
    lines.push('');
    
    // Estimados
    lines.push(`ESTIMATES: ${data.estimates.total} total`);
    if (data.estimates.total > 0) {
      lines.push(`  - ${data.estimates.byStatus.draft} drafts, ${data.estimates.byStatus.sent} sent, ${data.estimates.byStatus.approved} approved`);
      if (data.estimates.recent.length > 0) {
        const latest = data.estimates.recent[0];
        lines.push(`  - Latest: ${latest.estimateNumber} for ${latest.clientName} ($${latest.total})`);
      }
    }
    lines.push('');
    
    // Contratos
    lines.push(`CONTRACTS: ${data.contracts.total} total`);
    if (data.contracts.total > 0) {
      lines.push(`  - ${data.contracts.byStatus.draft} drafts, ${data.contracts.byStatus.sent} sent, ${data.contracts.byStatus.signed} signed, ${data.contracts.byStatus.completed} completed`);
      if (data.contracts.recent.length > 0) {
        const latest = data.contracts.recent[0];
        lines.push(`  - Latest: ${latest.contractNumber} for ${latest.clientName} ($${latest.totalAmount})`);
      }
    }
    lines.push('');
    
    // Preferencias
    lines.push('DEFAULT SETTINGS:');
    lines.push(`  - Tax Rate: ${data.defaults.taxRate}%`);
    lines.push(`  - Payment Terms: ${data.defaults.paymentTerms}`);
    lines.push(`  - Warranty: ${data.defaults.warrantyPeriod}`);
    lines.push(`  - Deposit: ${data.defaults.depositPercentage}%`);
    lines.push('');
    
    // Historial de búsquedas
    lines.push(`SEARCH HISTORY:`);
    lines.push(`  - ${data.propertySearches.length} property verifications`);
    lines.push(`  - ${data.permitSearches.length} permit searches`);
    
    if (data.propertySearches.length > 0) {
      const latest = data.propertySearches[0];
      lines.push(`  - Latest property: ${latest.address}`);
    }
    
    if (data.permitSearches.length > 0) {
      const latest = data.permitSearches[0];
      lines.push(`  - Latest permit: ${latest.query}`);
    }
    
    lines.push('');
    lines.push('=== END SNAPSHOT ===');
    
    return lines.join('\n');
  }
  
  /**
   * Generar snapshot vacío (fallback)
   */
  private getEmptySnapshot(userId: string): UserSnapshot {
    return {
      userId,
      timestamp: new Date(),
      estimates: {
        recent: [],
        total: 0,
        byStatus: { draft: 0, sent: 0, approved: 0 }
      },
      contracts: {
        recent: [],
        total: 0,
        byStatus: { draft: 0, sent: 0, signed: 0, completed: 0 }
      },
      preferences: {
        settings: {
          userId,
          language: 'en',
          timezone: 'America/Los_Angeles',
          dateFormat: 'MM/DD/YYYY',
          currency: 'USD',
          measurementUnit: 'imperial',
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          marketingEmails: false,
          notificationPreferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          onboardingCompleted: false
        },
        defaults: {
          taxRate: 8.75,
          paymentTerms: 'Net 30',
          warrantyPeriod: '1 year',
          depositPercentage: 50
        }
      },
      searchHistory: {
        properties: [],
        permits: []
      },
      materialsAvailable: true,
      contextSummary: '=== EMPTY SNAPSHOT (New User) ==='
    };
  }
}

export const snapshotService = new SnapshotService();
