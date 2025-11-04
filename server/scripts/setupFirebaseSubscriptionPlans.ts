import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

/**
 * Script para configurar los planes de suscripción en Firebase
 * Solo usa Firebase como fuente de datos
 */

async function setupFirebaseSubscriptionPlans() {
  try {
    console.log('🚀 Configurando planes de suscripción en Firebase...');

    const plansCollection = collection(db, 'subscriptionPlans');

    // Plan 1: Free Trial (7 días gratis)
    await setDoc(doc(plansCollection, '1'), {
      id: 1,
      name: 'Free Trial',
      code: 'FREE_TRIAL',
      price: 0,
      yearly_price: 0,
      description: '7 días gratis - límites básicos',
      motto: 'Prueba antes de comprar',
      features: {
        basicEstimates: 2,
        aiEstimates: 1,
        contracts: 1,
        propertyVerifications: 1,
        permitAdvisor: 0,
        projects: 2
      },
      isActive: true,
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Plan 2: Primo Chambeador (GRATIS - Plan Permanente)
    await setDoc(doc(plansCollection, '2'), {
      id: 2,
      name: 'Primo Chambeador',
      code: 'PRIMO_CHAMBEADOR',
      price: 0,
      yearly_price: 0,
      description: 'Plan gratuito permanente',
      motto: 'Todo lo que necesitas para crecer',
      features: {
        basicEstimates: 5,
        aiEstimates: 1,
        contracts: 0,
        propertyVerifications: 0,
        permitAdvisor: 0,
        projects: 0
      },
      isActive: true,
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Plan 3: Master Contractor ($99/mes) - ILIMITADO
    await setDoc(doc(plansCollection, '3'), {
      id: 3,
      name: 'Master Contractor',
      code: 'MASTER_CONTRACTOR',
      price: 99,
      yearly_price: 990,
      description: 'Plan premium con acceso ilimitado',
      motto: 'Sin límites para profesionales',
      features: {
        basicEstimates: -1, // -1 = ILIMITADO
        aiEstimates: -1,
        contracts: -1,
        propertyVerifications: -1,
        permitAdvisor: -1,
        projects: -1
      },
      isActive: true,
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Planes de suscripción configurados exitosamente en Firebase:');
    console.log('   - Free Trial: Límites básicos por 7 días');
    console.log('   - Primo Chambeador: GRATIS plan permanente');
    console.log('   - Master Contractor: $99/mes ILIMITADO');

  } catch (error) {
    console.error('❌ Error configurando planes en Firebase:', error);
    throw error;
  }
}

export { setupFirebaseSubscriptionPlans };