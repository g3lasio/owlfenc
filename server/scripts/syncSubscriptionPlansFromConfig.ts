import { db } from '../db';
import { subscriptionPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { 
  PLAN_IDS, 
  PLAN_NAMES, 
  PLAN_CODES,
  PLAN_MOTTOS,
  PLAN_PRICES, 
  PLAN_YEARLY_PRICES,
  PLAN_LIMITS 
} from '@shared/permissions-config';

/**
 * 🔄 SCRIPT DE SINCRONIZACIÓN DE PLANES
 * 
 * Este script sincroniza los planes de suscripción en PostgreSQL
 * con la configuración centralizada en permissions-config.ts
 * 
 * IMPORTANTE: permissions-config.ts es la ÚNICA fuente de verdad
 * 
 * Ejecutar con: npx tsx server/scripts/syncSubscriptionPlansFromConfig.ts
 */

async function syncSubscriptionPlans() {
  try {
    console.log('🔄 Iniciando sincronización de planes de suscripción...');
    console.log('📍 Fuente de verdad: @shared/permissions-config.ts');
    console.log('');

    if (!db) {
      throw new Error('❌ Database connection not available');
    }

    // Obtener todos los plan IDs
    const planIds = [
      PLAN_IDS.FREE_TRIAL,
      PLAN_IDS.PRIMO_CHAMBEADOR,
      PLAN_IDS.MERO_PATRON,
      PLAN_IDS.MASTER_CONTRACTOR
    ];

    let created = 0;
    let updated = 0;

    for (const planId of planIds) {
      const planName = PLAN_NAMES[planId];
      const planCode = PLAN_CODES[planId];
      const planMotto = PLAN_MOTTOS[planId];
      const price = PLAN_PRICES[planId];
      const yearlyPrice = PLAN_YEARLY_PRICES[planId];
      const features = PLAN_LIMITS[planId];

      console.log(`📋 Procesando: ${planName} (ID: ${planId})`);

      // Verificar si el plan ya existe
      const existingPlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId))
        .limit(1);

      const planData = {
        name: planName,
        code: planCode,
        price: price,
        yearly_price: yearlyPrice,
        description: getDescription(planId),
        motto: planMotto,
        features: features as any,
        is_active: true,
        updated_at: new Date()
      };

      if (existingPlan.length === 0) {
        // Crear nuevo plan
        await db.insert(subscriptionPlans).values({
          id: planId,
          ...planData,
          created_at: new Date()
        });
        console.log(`   ✅ Plan creado: ${planName}`);
        created++;
      } else {
        // Actualizar plan existente
        await db
          .update(subscriptionPlans)
          .set(planData)
          .where(eq(subscriptionPlans.id, planId));
        console.log(`   ✅ Plan actualizado: ${planName}`);
        updated++;
      }

      // Mostrar límites configurados
      console.log(`   📊 Límites configurados:`);
      console.log(`      - basicEstimates: ${formatLimit(features.basicEstimates)}`);
      console.log(`      - aiEstimates: ${formatLimit(features.aiEstimates)}`);
      console.log(`      - contracts: ${formatLimit(features.contracts)}`);
      console.log(`      - propertyVerifications: ${formatLimit(features.propertyVerifications)}`);
      console.log(`      - permitAdvisor: ${formatLimit(features.permitAdvisor)}`);
      console.log(`      - projects: ${formatLimit(features.projects)}`);
      console.log(`      - invoices: ${formatLimit(features.invoices)}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ SINCRONIZACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   📝 Planes creados: ${created}`);
    console.log(`   🔄 Planes actualizados: ${updated}`);
    console.log(`   📊 Total de planes: ${planIds.length}`);
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('   1. Verificar que los límites son correctos en la aplicación');
    console.log('   2. Probar suscripción a cada plan');
    console.log('   3. Verificar BenefitsTracker muestra límites correctos');
    console.log('   4. Verificar que el incremento de usage funciona');
    console.log('');

  } catch (error) {
    console.error('❌ Error sincronizando planes:', error);
    throw error;
  }
}

/**
 * Formatear límite para display
 */
function formatLimit(limit: number): string {
  if (limit === -1) return 'ILIMITADO';
  if (limit === 0) return 'BLOQUEADO';
  return limit.toString();
}

/**
 * Obtener descripción del plan
 */
function getDescription(planId: number): string {
  switch (planId) {
    case PLAN_IDS.FREE_TRIAL:
      return '14 días gratis con acceso ilimitado a todas las funciones';
    case PLAN_IDS.PRIMO_CHAMBEADOR:
      return 'Plan gratuito permanente con límites básicos';
    case PLAN_IDS.MERO_PATRON:
      return 'Plan profesional con límites generosos para contratistas activos';
    case PLAN_IDS.MASTER_CONTRACTOR:
      return 'Plan premium con acceso ilimitado a todas las funciones';
    default:
      return 'Plan de suscripción';
  }
}

// Ejecutar automáticamente
syncSubscriptionPlans()
  .then(() => {
    console.log('🎉 Sincronización exitosa. Sistema de suscripciones actualizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sincronización falló:', error);
    process.exit(1);
  });

export { syncSubscriptionPlans };
