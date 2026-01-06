import { db } from '../db';
import { subscriptionPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { 
  PLAN_IDS, 
  PLAN_NAMES, 
  PLAN_CODES,
  PLAN_PRICES, 
  PLAN_YEARLY_PRICES,
  PLAN_LIMITS 
} from '@shared/permissions-config';

/**
 * 🔍 SCRIPT DE VALIDACIÓN DE CONSISTENCIA
 * 
 * Verifica que los planes en PostgreSQL coinciden exactamente
 * con la configuración en permissions-config.ts
 * 
 * Ejecutar con: npx tsx server/scripts/validateSubscriptionConsistency.ts
 */

interface ValidationIssue {
  planId: number;
  planName: string;
  field: string;
  expected: any;
  actual: any;
  severity: 'critical' | 'warning' | 'info';
}

async function validateSubscriptionConsistency() {
  try {
    console.log('🔍 Iniciando validación de consistencia de planes...');
    console.log('');

    if (!db) {
      throw new Error('❌ Database connection not available');
    }

    const issues: ValidationIssue[] = [];
    const planIds = [
      PLAN_IDS.FREE_TRIAL,
      PLAN_IDS.PRIMO_CHAMBEADOR,
      PLAN_IDS.MERO_PATRON,
      PLAN_IDS.MASTER_CONTRACTOR
    ];

    for (const planId of planIds) {
      const planName = PLAN_NAMES[planId];
      console.log(`📋 Validando: ${planName} (ID: ${planId})`);

      // Obtener plan de la base de datos
      const dbPlan = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId))
        .limit(1);

      if (dbPlan.length === 0) {
        issues.push({
          planId,
          planName,
          field: 'existence',
          expected: 'Plan should exist',
          actual: 'Plan not found in database',
          severity: 'critical'
        });
        console.log(`   ❌ CRÍTICO: Plan no existe en la base de datos`);
        continue;
      }

      const plan = dbPlan[0];
      const expectedLimits = PLAN_LIMITS[planId];
      const actualFeatures = plan.features as any;

      // Validar código
      if (plan.code !== PLAN_CODES[planId]) {
        issues.push({
          planId,
          planName,
          field: 'code',
          expected: PLAN_CODES[planId],
          actual: plan.code,
          severity: 'warning'
        });
      }

      // Validar precio
      if (plan.price !== PLAN_PRICES[planId]) {
        issues.push({
          planId,
          planName,
          field: 'price',
          expected: PLAN_PRICES[planId],
          actual: plan.price,
          severity: 'critical'
        });
      }

      // Validar precio anual
      if (plan.yearly_price !== PLAN_YEARLY_PRICES[planId]) {
        issues.push({
          planId,
          planName,
          field: 'yearly_price',
          expected: PLAN_YEARLY_PRICES[planId],
          actual: plan.yearly_price,
          severity: 'critical'
        });
      }

      // Validar límites de features
      const featuresToCheck = [
        'basicEstimates',
        'aiEstimates',
        'contracts',
        'propertyVerifications',
        'permitAdvisor',
        'projects',
        'invoices'
      ];

      for (const feature of featuresToCheck) {
        const expected = expectedLimits[feature as keyof typeof expectedLimits];
        const actual = actualFeatures?.[feature];

        if (expected !== actual) {
          issues.push({
            planId,
            planName,
            field: `features.${feature}`,
            expected,
            actual,
            severity: 'critical'
          });
        }
      }

      if (issues.filter(i => i.planId === planId).length === 0) {
        console.log(`   ✅ Plan válido - sin problemas detectados`);
      } else {
        const planIssues = issues.filter(i => i.planId === planId);
        console.log(`   ⚠️  ${planIssues.length} problema(s) detectado(s)`);
      }
      console.log('');
    }

    // Resumen de resultados
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE VALIDACIÓN');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    if (issues.length === 0) {
      console.log('✅ ¡PERFECTO! Todos los planes están sincronizados correctamente.');
      console.log('');
      console.log('   - Todos los IDs coinciden');
      console.log('   - Todos los límites coinciden');
      console.log('   - Todos los precios coinciden');
      console.log('   - Todos los planes existen');
      console.log('');
      return true;
    }

    // Agrupar por severidad
    const critical = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');
    const info = issues.filter(i => i.severity === 'info');

    console.log(`⚠️  PROBLEMAS ENCONTRADOS: ${issues.length}`);
    console.log('');

    if (critical.length > 0) {
      console.log(`❌ CRÍTICOS (${critical.length}):`);
      critical.forEach(issue => {
        console.log(`   Plan: ${issue.planName} (ID: ${issue.planId})`);
        console.log(`   Campo: ${issue.field}`);
        console.log(`   Esperado: ${JSON.stringify(issue.expected)}`);
        console.log(`   Actual: ${JSON.stringify(issue.actual)}`);
        console.log('');
      });
    }

    if (warnings.length > 0) {
      console.log(`⚠️  ADVERTENCIAS (${warnings.length}):`);
      warnings.forEach(issue => {
        console.log(`   Plan: ${issue.planName} (ID: ${issue.planId})`);
        console.log(`   Campo: ${issue.field}`);
        console.log(`   Esperado: ${JSON.stringify(issue.expected)}`);
        console.log(`   Actual: ${JSON.stringify(issue.actual)}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔧 ACCIÓN REQUERIDA');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Para corregir estos problemas, ejecuta:');
    console.log('');
    console.log('   npx tsx server/scripts/syncSubscriptionPlansFromConfig.ts');
    console.log('');
    console.log('Este script sincronizará automáticamente todos los planes');
    console.log('con la configuración en permissions-config.ts');
    console.log('');

    return false;

  } catch (error) {
    console.error('❌ Error validando consistencia:', error);
    throw error;
  }
}

// Ejecutar automáticamente
validateSubscriptionConsistency()
  .then((isValid) => {
    if (isValid) {
      console.log('🎉 Validación exitosa. Sistema consistente.');
      process.exit(0);
    } else {
      console.log('⚠️  Validación completada con problemas. Revisar reporte arriba.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Validación falló:', error);
    process.exit(1);
  });

export { validateSubscriptionConsistency };
