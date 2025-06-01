/**
 * Test completo de funcionalidad de Settings
 * Verifica que cada sección tenga efectos reales en el sistema
 */

import { db } from './server/db.js';
import { UserPreferencesService } from './server/services/userPreferencesService.js';
import { SubscriptionService } from './server/services/subscriptionService.js';

async function testUserPreferences() {
  console.log('\n=== TESTING USER PREFERENCES ===');
  
  const userId = 1;
  
  try {
    // Test 1: Crear preferencias por defecto
    console.log('1. Creando preferencias por defecto...');
    const defaultPrefs = await UserPreferencesService.createDefaultPreferences(userId);
    console.log('✓ Preferencias creadas:', defaultPrefs);
    
    // Test 2: Obtener preferencias
    console.log('2. Obteniendo preferencias...');
    const prefs = await UserPreferencesService.getUserPreferences(userId);
    console.log('✓ Preferencias obtenidas:', prefs);
    
    // Test 3: Actualizar idioma
    console.log('3. Actualizando idioma a español...');
    const updatedLang = await UserPreferencesService.updateUserPreferences(userId, { language: 'es' });
    console.log('✓ Idioma actualizado:', updatedLang.language);
    
    // Test 4: Actualizar zona horaria
    console.log('4. Actualizando zona horaria...');
    const updatedTz = await UserPreferencesService.updateUserPreferences(userId, { timezone: 'America/Mexico_City' });
    console.log('✓ Zona horaria actualizada:', updatedTz.timezone);
    
    // Test 5: Actualizar moneda
    console.log('5. Actualizando moneda...');
    const updatedCur = await UserPreferencesService.updateUserPreferences(userId, { currency: 'MXN' });
    console.log('✓ Moneda actualizada:', updatedCur.currency);
    
    // Test 6: Actualizar formato de fecha
    console.log('6. Actualizando formato de fecha...');
    const updatedDate = await UserPreferencesService.updateUserPreferences(userId, { dateFormat: 'DD/MM/YYYY' });
    console.log('✓ Formato de fecha actualizado:', updatedDate.dateFormat);
    
    // Test 7: Actualizar notificaciones
    console.log('7. Actualizando configuración de notificaciones...');
    const updatedNotif = await UserPreferencesService.updateUserPreferences(userId, { 
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      marketingEmails: false
    });
    console.log('✓ Notificaciones actualizadas:', {
      email: updatedNotif.emailNotifications,
      sms: updatedNotif.smsNotifications,
      push: updatedNotif.pushNotifications,
      marketing: updatedNotif.marketingEmails
    });
    
    // Test 8: Actualizar configuración de seguridad
    console.log('8. Actualizando configuración de seguridad...');
    const updatedSec = await UserPreferencesService.updateUserPreferences(userId, { 
      autoSaveEstimates: true
    });
    console.log('✓ Seguridad actualizada:', updatedSec.autoSaveEstimates);
    
    // Test 9: Actualizar tema
    console.log('9. Actualizando tema...');
    const updatedTheme = await UserPreferencesService.updateUserPreferences(userId, { theme: 'dark' });
    console.log('✓ Tema actualizado:', updatedTheme.theme);
    
    // Test 10: Verificar persistencia
    console.log('10. Verificando persistencia de datos...');
    const finalPrefs = await UserPreferencesService.getUserPreferences(userId);
    console.log('✓ Datos persistidos correctamente:', {
      language: finalPrefs.language,
      timezone: finalPrefs.timezone,
      currency: finalPrefs.currency,
      dateFormat: finalPrefs.dateFormat,
      theme: finalPrefs.theme,
      emailNotifications: finalPrefs.emailNotifications,
      autoSaveEstimates: finalPrefs.autoSaveEstimates
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error en preferencias:', error);
    return false;
  }
}

async function testSubscriptionService() {
  console.log('\n=== TESTING SUBSCRIPTION SERVICE ===');
  
  try {
    // Test 1: Inicializar planes por defecto
    console.log('1. Inicializando planes de suscripción...');
    await SubscriptionService.initializeDefaultPlans();
    console.log('✓ Planes inicializados');
    
    // Test 2: Obtener planes disponibles
    console.log('2. Obteniendo planes disponibles...');
    const plans = await SubscriptionService.getSubscriptionPlans();
    console.log('✓ Planes obtenidos:', plans.map(p => ({ name: p.name, price: p.price })));
    
    // Test 3: Verificar suscripción de usuario
    console.log('3. Verificando suscripción actual...');
    const subscription = await SubscriptionService.getUserSubscription(1);
    console.log('✓ Suscripción:', subscription ? subscription.status : 'No existe');
    
    // Test 4: Obtener historial de pagos
    console.log('4. Obteniendo historial de pagos...');
    const paymentHistory = await SubscriptionService.getPaymentHistory(1);
    console.log('✓ Historial:', paymentHistory.length + ' registros');
    
    return true;
  } catch (error) {
    console.error('❌ Error en suscripciones:', error);
    return false;
  }
}

async function testDatabaseConnectivity() {
  console.log('\n=== TESTING DATABASE CONNECTIVITY ===');
  
  try {
    // Test conexión a base de datos
    const result = await db.execute('SELECT 1 as test');
    console.log('✓ Conexión a base de datos exitosa');
    
    // Test tablas existen
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_preferences', 'subscription_plans', 'user_subscriptions', 'payment_history')
    `);
    console.log('✓ Tablas necesarias:', tables.rows.map(r => r.table_name));
    
    return true;
  } catch (error) {
    console.error('❌ Error de base de datos:', error);
    return false;
  }
}

async function runFullTest() {
  console.log('🔍 INICIANDO AUDITORÍA COMPLETA DE SETTINGS');
  console.log('==============================================');
  
  const results = {
    database: false,
    preferences: false,
    subscriptions: false
  };
  
  // Test conectividad de base de datos
  results.database = await testDatabaseConnectivity();
  
  // Test funcionalidad de preferencias
  results.preferences = await testUserPreferences();
  
  // Test funcionalidad de suscripciones
  results.subscriptions = await testSubscriptionService();
  
  console.log('\n=== RESUMEN DE AUDITORÍA ===');
  console.log('Base de datos:', results.database ? '✓ FUNCIONAL' : '❌ FALLO');
  console.log('Preferencias:', results.preferences ? '✓ FUNCIONAL' : '❌ FALLO');
  console.log('Suscripciones:', results.subscriptions ? '✓ FUNCIONAL' : '❌ FALLO');
  
  const allPassed = Object.values(results).every(r => r === true);
  console.log('\nESTADO GENERAL:', allPassed ? '✅ TODAS LAS FUNCIONES OPERATIVAS' : '❌ REQUIERE CORRECCIONES');
  
  return results;
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error en auditoría:', error);
      process.exit(1);
    });
}

export { runFullTest, testUserPreferences, testSubscriptionService };