#!/usr/bin/env tsx

/**
 * 🔍 SUBSCRIPTION SETUP VERIFICATION
 * Checks current subscription configuration and user plans
 */

import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

interface PlanConfig {
  name: string;
  hasLegalDefense: boolean;
  contractsLimit: number;
  expectedBehavior: string;
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  'Primo Chambeador': {
    name: 'Primo Chambeador',
    hasLegalDefense: false,
    contractsLimit: 0,
    expectedBehavior: '403 Forbidden - No Legal Defense access'
  },
  'Free Trial': {
    name: 'Free Trial',
    hasLegalDefense: true,
    contractsLimit: -1,
    expectedBehavior: '200 OK - Unlimited for 14 days'
  },
  'Mero Patrón': {
    name: 'Mero Patrón',
    hasLegalDefense: true,
    contractsLimit: 50,
    expectedBehavior: '200 OK until 50, then 403'
  },
  'Master Contractor': {
    name: 'Master Contractor',
    hasLegalDefense: true,
    contractsLimit: -1,
    expectedBehavior: '200 OK - Unlimited'
  }
};

async function checkSubscriptionSetup() {
  console.log('🔍 VERIFICANDO CONFIGURACIÓN DE SUSCRIPCIONES');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Get all users from database
    const allUsers = await db.select().from(users);
    
    console.log(`📊 Total usuarios en base de datos: ${allUsers.length}\n`);

    if (allUsers.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      console.log('   Para probar suscripciones, necesitas:');
      console.log('   1. Crear usuarios de prueba con diferentes planes');
      console.log('   2. Configurar sus límites y permisos');
      console.log('   3. Usar tokens de Firebase válidos para testing');
      console.log('');
      return;
    }

    // Check each plan configuration
    console.log('📋 ANÁLISIS DE PLANES DE SUSCRIPCIÓN:\n');

    for (const [planName, config] of Object.entries(PLAN_CONFIGS)) {
      console.log(`\n🎯 ${planName}`);
      console.log('   ' + '-'.repeat(60));
      console.log(`   Legal Defense: ${config.hasLegalDefense ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Contracts Limit: ${config.contractsLimit === -1 ? '∞ Unlimited' : config.contractsLimit}`);
      console.log(`   Expected: ${config.expectedBehavior}`);
      
      // Find users with this plan
      const usersWithPlan = allUsers.filter(u => u.subscriptionPlan === planName);
      
      if (usersWithPlan.length > 0) {
        console.log(`   \n   👥 Usuarios encontrados (${usersWithPlan.length}):`);
        for (const user of usersWithPlan.slice(0, 3)) { // Show max 3 users
          console.log(`      • ${user.email || 'No email'} (ID: ${user.id})`);
          console.log(`        Firebase UID: ${user.firebaseUid || 'N/A'}`);
          console.log(`        Contracts Used: ${user.contractsUsed || 0}`);
        }
        if (usersWithPlan.length > 3) {
          console.log(`      ... y ${usersWithPlan.length - 3} más`);
        }
      } else {
        console.log(`   \n   ⚠️  No hay usuarios con este plan`);
      }
    }

    // Check for users with unknown plans
    const unknownPlans = allUsers.filter(u => 
      u.subscriptionPlan && !PLAN_CONFIGS[u.subscriptionPlan]
    );

    if (unknownPlans.length > 0) {
      console.log('\n\n⚠️  PLANES DESCONOCIDOS DETECTADOS:');
      const uniquePlans = [...new Set(unknownPlans.map(u => u.subscriptionPlan))];
      for (const plan of uniquePlans) {
        const count = unknownPlans.filter(u => u.subscriptionPlan === plan).length;
        console.log(`   • "${plan}" - ${count} usuario(s)`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE CONFIGURACIÓN');
    console.log('='.repeat(70));
    console.log('');
    console.log('✅ PLANES CONFIGURADOS:');
    Object.keys(PLAN_CONFIGS).forEach(plan => {
      const count = allUsers.filter(u => u.subscriptionPlan === plan).length;
      const status = count > 0 ? '✅' : '⚠️ ';
      console.log(`   ${status} ${plan}: ${count} usuario(s)`);
    });

    console.log('\n🧪 PRÓXIMOS PASOS PARA TESTING:');
    console.log('   1. Obtener token de Firebase válido para cada usuario de prueba');
    console.log('   2. Hacer POST a /api/legal-defense/generate-contract con el token');
    console.log('   3. Verificar respuesta según plan:');
    console.log('      • Primo Chambeador → 403 (sin Legal Defense)');
    console.log('      • Free Trial → 200 (ilimitado 14 días)');
    console.log('      • Mero Patrón → 200 hasta 50, luego 403');
    console.log('      • Master Contractor → 200 siempre');
    console.log('');

    // Check if we have a real user to test with
    const realUser = allUsers.find(u => u.firebaseUid && u.subscriptionPlan);
    if (realUser) {
      console.log('💡 TESTING CON USUARIO REAL:');
      console.log(`   Email: ${realUser.email}`);
      console.log(`   Plan: ${realUser.subscriptionPlan}`);
      console.log(`   Firebase UID: ${realUser.firebaseUid}`);
      console.log('');
      console.log('   Para probar, inicia sesión con este usuario y verifica:');
      console.log('   - Legal Defense debe comportarse según su plan');
      console.log('   - Frontend debe mostrar límites correctos');
      console.log('   - Backend debe enforcar permisos');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run check
checkSubscriptionSetup().catch(console.error);
