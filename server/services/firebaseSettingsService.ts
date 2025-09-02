/**
 * Firebase Settings Service
 * Servicio unificado para configuraciones de usuario en Firestore
 * Reemplaza completamente el uso de PostgreSQL/Drizzle
 */

import { db } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Interfaces canónicas
export interface UserSettings {
  userId: string; // OBLIGATORIO - Firebase UID (también es el ID del documento)
  
  // Configuración de perfil
  displayName?: string;
  companyName?: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLicense?: string;
  companyDescription?: string;
  
  // Configuración de aplicación
  language: 'en' | 'es' | 'fr';
  timezone: string;
  dateFormat: string;
  currency: 'USD' | 'EUR' | 'MXN';
  measurementUnit: 'imperial' | 'metric';
  
  // Configuración de notificaciones
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  notificationPreferences: {
    newEstimate?: boolean;
    estimateViewed?: boolean;
    estimateApproved?: boolean;
    contractSigned?: boolean;
    paymentReceived?: boolean;
    dailyDigest?: boolean;
    weeklyReport?: boolean;
  };
  
  // Configuración de estimados/contratos
  estimateDefaults?: {
    validityDays?: number;
    paymentTerms?: string;
    notes?: string;
    terms?: string;
    taxRate?: number;
    includeSignature?: boolean;
  };
  
  contractDefaults?: {
    paymentTerms?: string;
    specialConditions?: string;
    warrantyPeriod?: string;
    cancellationPolicy?: string;
  };
  
  // Configuración de marca
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    emailFooter?: string;
    estimateHeader?: string;
    contractHeader?: string;
  };
  
  // Configuración de integraciones
  integrations?: {
    quickbooks?: {
      enabled: boolean;
      accountId?: string;
      lastSync?: Date;
    };
    stripe?: {
      enabled: boolean;
      accountId?: string;
    };
    twilio?: {
      enabled: boolean;
      phoneNumber?: string;
    };
  };
  
  // Configuración de privacidad
  privacy?: {
    profileVisible: boolean;
    shareAnalytics: boolean;
    allowDataExport: boolean;
  };
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  onboardingCompleted: boolean;
  onboardingStep?: number;
}

class FirebaseSettingsService {
  private collection = 'users';
  private settingsDoc = 'settings';

  /**
   * Obtener configuración del usuario
   * @param userId Firebase UID del usuario
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      console.log(`⚙️ [FIREBASE-SETTINGS] Getting settings for user: ${userId}`);

      // Las configuraciones se guardan en users/{userId}/settings
      const docRef = db.collection(this.collection).doc(userId).collection('settings').doc('preferences');
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        console.log(`📝 [FIREBASE-SETTINGS] No settings found for user ${userId}, will use defaults`);
        return this.getDefaultSettings(userId);
      }

      const data = docSnap.data();
      
      return {
        userId,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
        lastLoginAt: data?.lastLoginAt?.toDate()
      } as UserSettings;
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error getting user settings:', error);
      throw error;
    }
  }

  /**
   * Crear o actualizar configuración del usuario
   * @param userId Firebase UID del usuario
   * @param settings Configuraciones a guardar
   */
  async saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      if (!userId) {
        throw new Error('userId is required');
      }

      console.log(`💾 [FIREBASE-SETTINGS] Saving settings for user: ${userId}`);

      // Eliminar campos que no deben actualizarse
      delete settings.userId;
      delete settings.createdAt;

      const docRef = db.collection(this.collection).doc(userId).collection('settings').doc('preferences');
      
      // Verificar si existe
      const existing = await docRef.get();
      
      if (existing.exists) {
        // Actualizar configuración existente
        await docRef.update({
          ...settings,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        console.log(`✅ [FIREBASE-SETTINGS] Settings updated for user ${userId}`);
      } else {
        // Crear nueva configuración
        const defaultSettings = this.getDefaultSettings(userId);
        const newSettings = {
          ...defaultSettings,
          ...settings,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        
        await docRef.set(newSettings);
        
        console.log(`✅ [FIREBASE-SETTINGS] Settings created for user ${userId}`);
      }

      // Retornar configuración actualizada
      return await this.getUserSettings(userId) as UserSettings;
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error saving user settings:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración específica
   */
  async updateUserSetting(userId: string, key: string, value: any): Promise<void> {
    try {
      console.log(`🔧 [FIREBASE-SETTINGS] Updating ${key} for user ${userId}`);

      const docRef = db.collection(this.collection).doc(userId).collection('settings').doc('preferences');
      
      await docRef.update({
        [key]: value,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ [FIREBASE-SETTINGS] Setting ${key} updated for user ${userId}`);
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error updating user setting:', error);
      throw error;
    }
  }

  /**
   * Actualizar preferencias de notificación
   */
  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<UserSettings['notificationPreferences']>
  ): Promise<void> {
    try {
      console.log(`🔔 [FIREBASE-SETTINGS] Updating notification preferences for user ${userId}`);

      const current = await this.getUserSettings(userId);
      const updatedPreferences = {
        ...current?.notificationPreferences,
        ...preferences
      };

      await this.updateUserSetting(userId, 'notificationPreferences', updatedPreferences);
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de marca
   */
  async updateBranding(userId: string, branding: Partial<UserSettings['branding']>): Promise<void> {
    try {
      console.log(`🎨 [FIREBASE-SETTINGS] Updating branding for user ${userId}`);

      const current = await this.getUserSettings(userId);
      const updatedBranding = {
        ...current?.branding,
        ...branding
      };

      await this.updateUserSetting(userId, 'branding', updatedBranding);
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error updating branding:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de integraciones
   */
  async updateIntegrations(userId: string, integrations: Partial<UserSettings['integrations']>): Promise<void> {
    try {
      console.log(`🔌 [FIREBASE-SETTINGS] Updating integrations for user ${userId}`);

      const current = await this.getUserSettings(userId);
      const updatedIntegrations = {
        ...current?.integrations,
        ...integrations
      };

      await this.updateUserSetting(userId, 'integrations', updatedIntegrations);
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error updating integrations:', error);
      throw error;
    }
  }

  /**
   * Marcar onboarding como completado
   */
  async completeOnboarding(userId: string): Promise<void> {
    try {
      console.log(`🎉 [FIREBASE-SETTINGS] Completing onboarding for user ${userId}`);

      await this.updateUserSetting(userId, 'onboardingCompleted', true);
      await this.updateUserSetting(userId, 'onboardingStep', null);
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error completing onboarding:', error);
      throw error;
    }
  }

  /**
   * Actualizar último login
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.updateUserSetting(userId, 'lastLoginAt', FieldValue.serverTimestamp());
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error updating last login:', error);
      // No lanzar error en este caso, es una actualización no crítica
    }
  }

  /**
   * Eliminar configuración del usuario (para GDPR/eliminación de cuenta)
   */
  async deleteUserSettings(userId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [FIREBASE-SETTINGS] Deleting settings for user ${userId}`);

      const docRef = db.collection(this.collection).doc(userId).collection('settings').doc('preferences');
      await docRef.delete();
      
      console.log(`✅ [FIREBASE-SETTINGS] Settings deleted for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error deleting user settings:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración por defecto
   */
  private getDefaultSettings(userId: string): UserSettings {
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
      notificationPreferences: {
        newEstimate: true,
        estimateViewed: true,
        estimateApproved: true,
        contractSigned: true,
        paymentReceived: true,
        dailyDigest: false,
        weeklyReport: true
      },
      estimateDefaults: {
        validityDays: 30,
        paymentTerms: 'Net 30',
        taxRate: 8.75,
        includeSignature: true
      },
      contractDefaults: {
        paymentTerms: 'Net 30',
        warrantyPeriod: '1 year',
        cancellationPolicy: '7 days notice required'
      },
      privacy: {
        profileVisible: true,
        shareAnalytics: false,
        allowDataExport: true
      },
      onboardingCompleted: false,
      onboardingStep: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Migrar configuración desde otro sistema (útil para migración desde PostgreSQL)
   */
  async migrateSettings(userId: string, oldSettings: any): Promise<UserSettings> {
    try {
      console.log(`🔄 [FIREBASE-SETTINGS] Migrating settings for user ${userId}`);

      // Mapear campos antiguos a nuevos si es necesario
      const migratedSettings: Partial<UserSettings> = {
        displayName: oldSettings.displayName || oldSettings.name,
        companyName: oldSettings.companyName || oldSettings.company_name,
        companyPhone: oldSettings.companyPhone || oldSettings.company_phone,
        companyEmail: oldSettings.companyEmail || oldSettings.company_email,
        language: oldSettings.language || 'en',
        timezone: oldSettings.timezone || 'America/Los_Angeles',
        emailNotifications: oldSettings.emailNotifications ?? true,
        smsNotifications: oldSettings.smsNotifications ?? false,
        // ... mapear más campos según sea necesario
      };

      return await this.saveUserSettings(userId, migratedSettings);
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error migrating settings:', error);
      throw error;
    }
  }

  /**
   * Exportar configuración del usuario (para GDPR/backup)
   */
  async exportUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      console.log(`📤 [FIREBASE-SETTINGS] Exporting settings for user ${userId}`);
      
      const settings = await this.getUserSettings(userId);
      
      if (settings) {
        // Eliminar información sensible si es necesario
        const exportData = { ...settings };
        delete (exportData as any).integrations?.stripe?.accountId;
        delete (exportData as any).integrations?.quickbooks?.accountId;
        
        return exportData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [FIREBASE-SETTINGS] Error exporting settings:', error);
      throw error;
    }
  }
}

// Exportar instancia única
export const firebaseSettingsService = new FirebaseSettingsService();