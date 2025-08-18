import { db } from '../db';
import { subscriptionPlans } from '@shared/schema';

/**
 * Script para configurar planes de suscripción REALES en PostgreSQL
 * ELIMINA el sistema de Maps en memoria que se resetea
 */
async function setupSubscriptionPlans() {
  try {
    console.log('🚀 Configurando planes de suscripción en PostgreSQL...');

    // Limpiar planes existentes
    await db.delete(subscriptionPlans);

    // Plan 1: Free Trial (7 días gratis)
    await db.insert(subscriptionPlans).values({
      name: 'Free Trial',
      code: 'FREE_TRIAL',
      price: 0, // $0.00 en centavos
      yearly_price: 0,
      description: '7 días gratis - límites básicos',
      motto: 'Prueba antes de comprar',
      features: {
        basicEstimates: 2,        // 2 estimados básicos
        aiEstimates: 1,           // 1 estimado con IA
        contracts: 1,             // 1 contrato
        propertyVerifications: 1, // 1 verificación de propiedad
        permitAdvisor: 0,         // Sin asesor de permisos
        projects: 2               // 2 proyectos
      },
      is_active: true
    });

    // Plan 2: Primo Chambeador ($29/mes)
    await db.insert(subscriptionPlans).values({
      name: 'Primo Chambeador',
      code: 'PRIMO_CHAMBEADOR', 
      price: 2900, // $29.00 en centavos
      yearly_price: 31000, // $310/año (descuento)
      description: 'Plan profesional para contratistas activos',
      motto: 'Todo lo que necesitas para crecer',
      features: {
        basicEstimates: 50,       // 50 estimados básicos
        aiEstimates: 20,          // 20 estimados con IA
        contracts: 25,            // 25 contratos
        propertyVerifications: 15, // 15 verificaciones
        permitAdvisor: 10,        // 10 consultas asesor permisos
        projects: 30              // 30 proyectos
      },
      is_active: true
    });

    // Plan 3: Master Contractor ($99/mes) - ILIMITADO
    await db.insert(subscriptionPlans).values({
      name: 'Master Contractor',
      code: 'MASTER_CONTRACTOR',
      price: 9900, // $99.00 en centavos
      yearly_price: 106000, // $1060/año (descuento) 
      description: 'Plan premium con acceso ilimitado',
      motto: 'Sin límites para profesionales',
      features: {
        basicEstimates: -1,       // -1 = ILIMITADO
        aiEstimates: -1,          // -1 = ILIMITADO
        contracts: -1,            // -1 = ILIMITADO
        propertyVerifications: -1, // -1 = ILIMITADO
        permitAdvisor: -1,        // -1 = ILIMITADO
        projects: -1              // -1 = ILIMITADO
      },
      is_active: true
    });

    console.log('✅ Planes de suscripción configurados exitosamente:');
    console.log('   - Free Trial: Límites básicos por 7 días');
    console.log('   - Primo Chambeador: $29/mes con límites generosos');
    console.log('   - Master Contractor: $99/mes ILIMITADO');

  } catch (error) {
    console.error('❌ Error configurando planes:', error);
    throw error;
  }
}

// Ejecutar automáticamente
setupSubscriptionPlans()
  .then(() => {
    console.log('🎯 Setup completado. Sistema de suscripciones listo.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup falló:', error);
    process.exit(1);
  });

export { setupSubscriptionPlans };