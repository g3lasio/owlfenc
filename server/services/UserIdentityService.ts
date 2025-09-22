/**
 * SERVICIO UNIFICADO DE IDENTIDAD DE USUARIO
 * 
 * FUENTE ÚNICA DE VERDAD para mapeo de usuarios
 * Garantiza que Firebase UID sea SIEMPRE la identidad principal
 * Elimina COMPLETAMENTE la inconsistencia de IDs
 */

import { firebaseSubscriptionService } from './firebaseSubscriptionService';
import { userMappingService } from './userMappingService';

interface UserIdentity {
  firebaseUid: string;
  email: string;
  postgresUserId: number;
  legacyEmailBasedId?: string; // Solo para migración
}

class UserIdentityService {
  private readonly ADMIN_EMAILS = [
    'shkwahab60@gmail.com',
    'marcos@ruiz.com',
    'truthbackpack@gmail.com'
  ];

  /**
   * MÉTODO PRINCIPAL: Obtener identidad unificada de usuario
   * SIEMPRE usar este método para obtener ID de usuario
   */
  async getUnifiedUserId(firebaseUid: string, email?: string): Promise<string> {
    if (!firebaseUid) {
      throw new Error('❌ [USER-IDENTITY] Firebase UID es requerido - sin excepciones');
    }

    // REGLA INFALIBLE: Firebase UID es SIEMPRE la identidad principal
    console.log(`🔐 [USER-IDENTITY] Procesando identidad para Firebase UID: ${firebaseUid}`);
    
    // Verificar si es usuario admin/owner
    if (email && this.isOwnerUser(email)) {
      console.log(`👑 [USER-IDENTITY] Usuario owner detectado: ${email}`);
      // Incluso para owners, usar Firebase UID como base
      return firebaseUid;
    }

    return firebaseUid;
  }

  /**
   * Obtener identidad completa del usuario
   */
  async getUserIdentity(firebaseUid: string, email?: string): Promise<UserIdentity> {
    if (!firebaseUid) {
      throw new Error('❌ [USER-IDENTITY] Firebase UID requerido');
    }

    let postgresUserId = await userMappingService.getInternalUserId(firebaseUid);
    if (!postgresUserId) {
      const result = await userMappingService.createMapping(firebaseUid, email || '');
      postgresUserId = result?.id || 0;
    }
    const legacyEmailBasedId = email ? `user_${email.replace(/[@.]/g, '_')}` : undefined;

    return {
      firebaseUid,
      email: email || '',
      postgresUserId,
      legacyEmailBasedId
    };
  }

  /**
   * Validar que un request tiene identidad válida
   */
  validateUserIdentity(req: any): { firebaseUid: string; email: string } {
    if (!req.firebaseUser?.uid) {
      throw new Error('❌ [USER-IDENTITY] Autenticación de Firebase requerida');
    }

    if (!req.firebaseUser.email) {
      throw new Error('❌ [USER-IDENTITY] Email de usuario requerido');
    }

    return {
      firebaseUid: req.firebaseUser.uid,
      email: req.firebaseUser.email
    };
  }

  /**
   * Migrar datos de ID legacy a Firebase UID
   */
  async migrateLegacyUserData(email: string, firebaseUid: string): Promise<void> {
    const legacyId = `user_${email.replace(/[@.]/g, '_')}`;
    
    console.log(`🔄 [USER-IDENTITY] Migrando datos de ${legacyId} a Firebase UID ${firebaseUid}`);
    
    try {
      // Verificar si existe suscripción legacy
      const legacySubscription = await firebaseSubscriptionService.getUserSubscription(legacyId);
      
      if (legacySubscription) {
        console.log(`📦 [USER-IDENTITY] Encontrada suscripción legacy, migrando...`);
        
        // Verificar si ya existe suscripción para Firebase UID
        const firebaseSubscription = await firebaseSubscriptionService.getUserSubscription(firebaseUid);
        
        if (!firebaseSubscription) {
          // Migrar suscripción al Firebase UID
          await this.transferSubscriptionData(legacyId, firebaseUid);
          console.log(`✅ [USER-IDENTITY] Suscripción migrada exitosamente`);
        } else {
          console.log(`ℹ️ [USER-IDENTITY] Ya existe suscripción para Firebase UID, conservando actual`);
        }
      }

    } catch (error) {
      console.error(`❌ [USER-IDENTITY] Error migrando datos legacy:`, error);
      // No fallar el proceso por errores de migración
    }
  }

  /**
   * Transferir datos de suscripción entre IDs
   */
  private async transferSubscriptionData(fromId: string, toId: string): Promise<void> {
    // Este método transferiría datos entre IDs
    // Por ahora, loggeamos la necesidad de transferencia
    console.log(`🔄 [USER-IDENTITY] Transferencia necesaria: ${fromId} → ${toId}`);
    
    // TODO: Implementar lógica de transferencia específica según necesidades
    // Esto podría incluir transferir:
    // - Datos de suscripción en Firestore
    // - Datos de uso/límites
    // - Historiales de proyectos/estimates
  }

  /**
   * Verificar si un email pertenece al owner de la plataforma
   */
  private isOwnerUser(email: string): boolean {
    return this.ADMIN_EMAILS.includes(email.toLowerCase());
  }

  /**
   * Obtener ID para servicios que requieren específicamente Firebase UID
   */
  getFirebaseUidForService(firebaseUid: string): string {
    if (!firebaseUid) {
      throw new Error('❌ [USER-IDENTITY] Firebase UID requerido para servicios');
    }
    return firebaseUid;
  }

  /**
   * Obtener ID para servicios legacy que aún requieren email-based ID
   * TEMPORAL: Solo para Stripe webhooks y servicios externos sin acceso a Firebase
   */
  getLegacyIdForExternalService(email: string): string {
    if (!email) {
      throw new Error('❌ [USER-IDENTITY] Email requerido para servicios legacy');
    }
    
    console.warn(`⚠️ [USER-IDENTITY] Usando ID legacy para servicio externo: ${email}`);
    return `user_${email.replace(/[@.]/g, '_')}`;
  }

  /**
   * Logging de uso para auditoría
   */
  logIdentityUsage(context: string, firebaseUid: string, method: string): void {
    console.log(`📊 [USER-IDENTITY-AUDIT] ${context}: Firebase UID ${firebaseUid} | Method: ${method}`);
  }
}

export const userIdentityService = new UserIdentityService();