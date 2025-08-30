/**
 * MONITOR DE INTEGRIDAD DE DATOS
 * Previene pérdida de contactos y datos críticos
 * Sistema de nivel enterprise
 */

import { robustAuth } from './robust-auth-manager';

interface DataIntegrityReport {
  timestamp: string;
  userId: string;
  clientCount: number;
  dataConsistency: boolean;
  issues: string[];
  autoFixed: boolean;
}

class DataIntegrityMonitor {
  private static instance: DataIntegrityMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastKnownCounts: Map<string, number> = new Map();

  static getInstance(): DataIntegrityMonitor {
    if (!DataIntegrityMonitor.instance) {
      DataIntegrityMonitor.instance = new DataIntegrityMonitor();
    }
    return DataIntegrityMonitor.instance;
  }

  /**
   * INICIAR MONITOREO AUTOMÁTICO
   */
  public startMonitoring(): void {
    console.log('🔍 [DATA-MONITOR] Iniciando monitoreo de integridad...');

    // Verificar integridad cada 2 minutos
    this.monitoringInterval = setInterval(async () => {
      await this.performIntegrityCheck();
    }, 120000); // 2 minutos

    // Verificación inicial
    setTimeout(() => this.performIntegrityCheck(), 5000);
  }

  /**
   * VERIFICACIÓN COMPLETA DE INTEGRIDAD
   */
  public async performIntegrityCheck(): Promise<DataIntegrityReport> {
    const user = robustAuth.getCurrentUser();
    if (!user) {
      return this.createEmptyReport();
    }

    console.log('🔍 [DATA-MONITOR] Verificando integridad para:', user.email);

    const report: DataIntegrityReport = {
      timestamp: new Date().toISOString(),
      userId: user.uid,
      clientCount: 0,
      dataConsistency: true,
      issues: [],
      autoFixed: false
    };

    try {
      // 1. Verificar conteo de clientes
      const clientCount = await this.verifyClientCount(user.uid);
      report.clientCount = clientCount;

      // 2. Verificar consistencia de datos
      const consistencyIssues = await this.checkDataConsistency(user.uid);
      report.issues.push(...consistencyIssues);

      // 3. Verificar sincronización entre dispositivos
      const syncIssues = await this.checkCrossDeviceSync(user.uid);
      report.issues.push(...syncIssues);

      // 4. Auto-reparar si es posible
      if (report.issues.length > 0) {
        report.autoFixed = await this.attemptAutoFix(user.uid, report.issues);
        report.dataConsistency = report.autoFixed;
      }

      // 5. Alertas si es crítico
      if (report.issues.length > 0 && !report.autoFixed) {
        await this.sendCriticalAlert(report);
      }

      // 6. Backup de seguridad
      await this.createDataBackup(user.uid);

      console.log('✅ [DATA-MONITOR] Verificación completada:', {
        clientCount: report.clientCount,
        issues: report.issues.length,
        autoFixed: report.autoFixed
      });

    } catch (error) {
      console.error('❌ [DATA-MONITOR] Error en verificación:', error);
      report.issues.push(`Error en verificación: ${error.message}`);
    }

    return report;
  }

  /**
   * VERIFICAR CONTEO DE CLIENTES
   */
  private async verifyClientCount(userId: string): Promise<number> {
    try {
      // Usar el sistema de autenticación robusto
      const token = await robustAuth.getAuthToken();
      
      const response = await fetch('/api/clients/count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      const currentCount = data.count || 0;

      // Verificar si hubo pérdida de datos
      const lastKnownCount = this.lastKnownCounts.get(userId) || 0;
      if (lastKnownCount > 0 && currentCount < lastKnownCount * 0.9) {
        console.warn('🚨 [DATA-MONITOR] Posible pérdida de datos detectada:', {
          lastKnown: lastKnownCount,
          current: currentCount,
          difference: lastKnownCount - currentCount
        });
      }

      this.lastKnownCounts.set(userId, currentCount);
      return currentCount;

    } catch (error) {
      console.error('❌ [DATA-MONITOR] Error verificando conteo:', error);
      return 0;
    }
  }

  /**
   * VERIFICAR CONSISTENCIA DE DATOS
   */
  private async checkDataConsistency(userId: string): Promise<string[]> {
    const issues: string[] = [];

    try {
      const token = await robustAuth.getAuthToken();
      
      const response = await fetch('/api/clients/integrity-check', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.issues && data.issues.length > 0) {
          issues.push(...data.issues.map((issue: any) => `Consistencia: ${issue}`));
        }
      }
    } catch (error) {
      issues.push(`Error verificando consistencia: ${error.message}`);
    }

    return issues;
  }

  /**
   * VERIFICAR SINCRONIZACIÓN ENTRE DISPOSITIVOS
   */
  private async checkCrossDeviceSync(userId: string): Promise<string[]> {
    const issues: string[] = [];

    // Verificar timestamp de última actualización
    const lastSync = localStorage.getItem('last_data_sync');
    if (lastSync) {
      const timeSinceSync = Date.now() - parseInt(lastSync);
      const hoursSinceSync = timeSinceSync / (1000 * 60 * 60);

      if (hoursSinceSync > 24) {
        issues.push(`Datos no sincronizados por ${hoursSinceSync.toFixed(1)} horas`);
      }
    }

    return issues;
  }

  /**
   * INTENTAR AUTO-REPARACIÓN
   */
  private async attemptAutoFix(userId: string, issues: string[]): Promise<boolean> {
    console.log('🔧 [DATA-MONITOR] Iniciando auto-reparación...');

    let fixedCount = 0;

    for (const issue of issues) {
      try {
        if (issue.includes('no sincronizado')) {
          // Forzar sincronización
          await this.forceSyncData(userId);
          fixedCount++;
        }
        
        if (issue.includes('Consistencia')) {
          // Intentar reparar consistencia
          await this.repairDataConsistency(userId);
          fixedCount++;
        }
      } catch (error) {
        console.error('❌ [DATA-MONITOR] Error en auto-fix:', error);
      }
    }

    const success = fixedCount > 0;
    if (success) {
      console.log(`✅ [DATA-MONITOR] Auto-reparación exitosa: ${fixedCount}/${issues.length} problemas resueltos`);
    }

    return success;
  }

  /**
   * FORZAR SINCRONIZACIÓN DE DATOS
   */
  private async forceSyncData(userId: string): Promise<void> {
    try {
      const token = await robustAuth.getAuthToken();
      
      await fetch('/api/clients/force-sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      localStorage.setItem('last_data_sync', Date.now().toString());
      console.log('✅ [DATA-MONITOR] Sincronización forzada completada');
    } catch (error) {
      console.error('❌ [DATA-MONITOR] Error en sincronización forzada:', error);
      throw error;
    }
  }

  /**
   * REPARAR CONSISTENCIA DE DATOS
   */
  private async repairDataConsistency(userId: string): Promise<void> {
    try {
      const token = await robustAuth.getAuthToken();
      
      await fetch('/api/clients/repair-consistency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ [DATA-MONITOR] Consistencia de datos reparada');
    } catch (error) {
      console.error('❌ [DATA-MONITOR] Error reparando consistencia:', error);
      throw error;
    }
  }

  /**
   * CREAR BACKUP DE SEGURIDAD
   */
  private async createDataBackup(userId: string): Promise<void> {
    try {
      const token = await robustAuth.getAuthToken();
      
      await fetch('/api/clients/create-backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('💾 [DATA-MONITOR] Backup de seguridad creado');
    } catch (error) {
      console.error('❌ [DATA-MONITOR] Error creando backup:', error);
    }
  }

  /**
   * ENVIAR ALERTA CRÍTICA
   */
  private async sendCriticalAlert(report: DataIntegrityReport): Promise<void> {
    try {
      const alertData = {
        type: 'CRITICAL_DATA_INTEGRITY',
        userId: report.userId,
        timestamp: report.timestamp,
        issues: report.issues,
        clientCount: report.clientCount,
        severity: report.issues.length > 3 ? 'HIGH' : 'MEDIUM'
      };

      await fetch('/api/alerts/critical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      });

      console.log('🚨 [DATA-MONITOR] Alerta crítica enviada');
    } catch (error) {
      console.error('❌ [DATA-MONITOR] Error enviando alerta:', error);
    }
  }

  private createEmptyReport(): DataIntegrityReport {
    return {
      timestamp: new Date().toISOString(),
      userId: '',
      clientCount: 0,
      dataConsistency: false,
      issues: ['Usuario no autenticado'],
      autoFixed: false
    };
  }

  /**
   * CLEANUP
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

export const dataMonitor = DataIntegrityMonitor.getInstance();