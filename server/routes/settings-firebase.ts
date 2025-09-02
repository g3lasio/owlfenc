/**
 * API Routes para configuraciones de usuario
 * USANDO SOLO FIREBASE - NO PostgreSQL
 */

import express from 'express';
import { z } from 'zod';
import { verifyFirebaseAuth as requireAuth } from '../middleware/firebase-auth';
import { firebaseSettingsService } from '../services/firebaseSettingsService';

const router = express.Router();

// Schema de validación para configuraciones
const updateSettingsSchema = z.object({
  displayName: z.string().optional(),
  companyName: z.string().optional(),
  companyLogo: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional(),
  companyWebsite: z.string().url().optional(),
  companyLicense: z.string().optional(),
  companyDescription: z.string().optional(),
  language: z.enum(['en', 'es', 'fr']).optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'MXN']).optional(),
  measurementUnit: z.enum(['imperial', 'metric']).optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional()
});

// GET /api/settings - Obtener configuración del usuario
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('⚙️ [SETTINGS-API] Obteniendo configuración para usuario:', userId);
    
    const settings = await firebaseSettingsService.getUserSettings(userId);
    
    if (!settings) {
      // Crear configuración por defecto si no existe
      const defaultSettings = await firebaseSettingsService.saveUserSettings(userId, {});
      return res.json(defaultSettings);
    }
    
    res.json(settings);
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al obtener configuración:', error);
    res.status(500).json({ 
      error: 'Error al obtener configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/settings - Actualizar configuración del usuario
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('💾 [SETTINGS-API] Actualizando configuración para usuario:', userId);
    
    // Validar datos
    const validationResult = updateSettingsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Datos de configuración inválidos',
        details: validationResult.error.format()
      });
    }
    
    const updatedSettings = await firebaseSettingsService.saveUserSettings(
      userId,
      validationResult.data
    );
    
    console.log('✅ [SETTINGS-API] Configuración actualizada exitosamente');
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al actualizar configuración:', error);
    res.status(500).json({ 
      error: 'Error al actualizar configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PATCH /api/settings/:key - Actualizar configuración específica
router.patch('/:key', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const key = req.params.key;
    const value = req.body.value;
    
    console.log(`🔧 [SETTINGS-API] Actualizando ${key} para usuario ${userId}`);
    
    await firebaseSettingsService.updateUserSetting(userId, key, value);
    
    res.json({ success: true, message: `${key} actualizado exitosamente` });
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al actualizar configuración específica:', error);
    res.status(500).json({ 
      error: 'Error al actualizar configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/settings/notifications - Actualizar preferencias de notificación
router.put('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🔔 [SETTINGS-API] Actualizando preferencias de notificación');
    
    await firebaseSettingsService.updateNotificationPreferences(userId, req.body);
    
    res.json({ success: true, message: 'Preferencias de notificación actualizadas' });
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al actualizar notificaciones:', error);
    res.status(500).json({ 
      error: 'Error al actualizar preferencias de notificación',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/settings/branding - Actualizar configuración de marca
router.put('/branding', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🎨 [SETTINGS-API] Actualizando configuración de marca');
    
    await firebaseSettingsService.updateBranding(userId, req.body);
    
    res.json({ success: true, message: 'Configuración de marca actualizada' });
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al actualizar marca:', error);
    res.status(500).json({ 
      error: 'Error al actualizar configuración de marca',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/settings/integrations - Actualizar integraciones
router.put('/integrations', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🔌 [SETTINGS-API] Actualizando integraciones');
    
    await firebaseSettingsService.updateIntegrations(userId, req.body);
    
    res.json({ success: true, message: 'Integraciones actualizadas' });
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al actualizar integraciones:', error);
    res.status(500).json({ 
      error: 'Error al actualizar integraciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/settings/onboarding/complete - Completar onboarding
router.post('/onboarding/complete', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🎉 [SETTINGS-API] Completando onboarding para usuario:', userId);
    
    await firebaseSettingsService.completeOnboarding(userId);
    
    res.json({ success: true, message: 'Onboarding completado' });
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al completar onboarding:', error);
    res.status(500).json({ 
      error: 'Error al completar onboarding',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/settings/login - Actualizar último login
router.post('/login', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    await firebaseSettingsService.updateLastLogin(userId);
    
    res.json({ success: true });
  } catch (error) {
    // No es crítico, solo log
    console.error('⚠️ [SETTINGS-API] Error al actualizar último login:', error);
    res.json({ success: true }); // Retornar success de todas formas
  }
});

// GET /api/settings/export - Exportar configuración (GDPR)
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('📤 [SETTINGS-API] Exportando configuración para usuario:', userId);
    
    const exportData = await firebaseSettingsService.exportUserSettings(userId);
    
    if (!exportData) {
      return res.status(404).json({ error: 'No se encontró configuración para exportar' });
    }
    
    res.json(exportData);
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al exportar configuración:', error);
    res.status(500).json({ 
      error: 'Error al exportar configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// DELETE /api/settings - Eliminar configuración del usuario
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🗑️ [SETTINGS-API] Eliminando configuración para usuario:', userId);
    
    const success = await firebaseSettingsService.deleteUserSettings(userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Error al eliminar configuración' });
    }
    
    res.json({ success: true, message: 'Configuración eliminada exitosamente' });
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al eliminar configuración:', error);
    res.status(500).json({ 
      error: 'Error al eliminar configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/settings/migrate - Migrar configuración desde otro sistema
router.post('/migrate', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🔄 [SETTINGS-API] Migrando configuración para usuario:', userId);
    
    const migratedSettings = await firebaseSettingsService.migrateSettings(userId, req.body);
    
    res.json({
      success: true,
      message: 'Configuración migrada exitosamente',
      settings: migratedSettings
    });
  } catch (error) {
    console.error('❌ [SETTINGS-API] Error al migrar configuración:', error);
    res.status(500).json({ 
      error: 'Error al migrar configuración',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;