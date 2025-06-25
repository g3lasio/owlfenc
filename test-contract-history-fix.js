/**
 * Script para probar la corrección del historial de contratos
 * Verifica que no se creen contratos duplicados para el mismo cliente y proyecto
 */

const { collection, query, where, getDocs, deleteDoc, doc } = require('firebase/firestore');
const { db } = require('./client/src/lib/firebase');

// Simulación del servicio corregido
class TestContractHistoryService {
  constructor() {
    this.collectionName = 'contractHistory';
  }

  async findExistingContract(userId, clientName, projectType) {
    try {
      console.log(`🔍 Buscando contrato existente para: ${clientName} - ${projectType}`);
      
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('clientName', '==', clientName),
        where('projectType', '==', projectType)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        console.log(`✅ Contrato existente encontrado: ${doc.id}`);
        return { id: doc.id, ...doc.data() };
      }
      
      console.log(`❌ No se encontró contrato existente`);
      return null;
    } catch (error) {
      console.error('Error buscando contrato existente:', error);
      return null;
    }
  }

  async cleanupDuplicateContracts(userId) {
    try {
      console.log(`🧹 Limpiando contratos duplicados para usuario: ${userId}`);
      
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const contracts = [];
      
      querySnapshot.forEach(doc => {
        contracts.push({ id: doc.id, ...doc.data() });
      });

      // Agrupar por cliente y tipo de proyecto
      const contractGroups = {};
      contracts.forEach(contract => {
        const key = `${contract.clientName}_${contract.projectType}`;
        if (!contractGroups[key]) {
          contractGroups[key] = [];
        }
        contractGroups[key].push(contract);
      });

      let deletedCount = 0;
      // Eliminar duplicados, mantener solo el más reciente
      for (const [key, group] of Object.entries(contractGroups)) {
        if (group.length > 1) {
          console.log(`📋 Encontrado ${group.length} contratos para ${key}`);
          
          // Ordenar por fecha de actualización, mantener el más reciente
          group.sort((a, b) => {
            const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
            const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
            return dateB.getTime() - dateA.getTime();
          });

          const [keep, ...remove] = group;
          console.log(`✅ Manteniendo contrato: ${keep.id} (${keep.updatedAt})`);
          
          // Eliminar los duplicados
          for (const duplicate of remove) {
            try {
              await deleteDoc(doc(db, this.collectionName, duplicate.id));
              console.log(`🗑️ Eliminado duplicado: ${duplicate.id}`);
              deletedCount++;
            } catch (error) {
              console.error(`Error eliminando ${duplicate.id}:`, error);
            }
          }
        }
      }

      console.log(`🎯 Limpieza completada. Eliminados ${deletedCount} contratos duplicados`);
      return deletedCount;
    } catch (error) {
      console.error('Error en limpieza de duplicados:', error);
      return 0;
    }
  }

  async getContractStats(userId) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const contracts = [];
      
      querySnapshot.forEach(doc => {
        contracts.push({ id: doc.id, ...doc.data() });
      });

      const stats = {
        total: contracts.length,
        byClient: {},
        byProject: {},
        duplicates: 0
      };

      const seen = new Set();
      contracts.forEach(contract => {
        const key = `${contract.clientName}_${contract.projectType}`;
        if (seen.has(key)) {
          stats.duplicates++;
        } else {
          seen.add(key);
        }

        stats.byClient[contract.clientName] = (stats.byClient[contract.clientName] || 0) + 1;
        stats.byProject[contract.projectType] = (stats.byProject[contract.projectType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { total: 0, byClient: {}, byProject: {}, duplicates: 0 };
    }
  }
}

async function testContractHistoryFix() {
  console.log('🧪 INICIANDO PRUEBA DE CORRECCIÓN DE HISTORIAL DE CONTRATOS\n');
  
  const testService = new TestContractHistoryService();
  const testUserId = 'qztot1YEy3UWz605gIH2iwwWhW53'; // Usuario de prueba

  try {
    // 1. Obtener estadísticas antes de la limpieza
    console.log('📊 Obteniendo estadísticas antes de la corrección...');
    const statsBefore = await testService.getContractStats(testUserId);
    
    console.log('\n📈 ESTADÍSTICAS ANTES:');
    console.log(`Total de contratos: ${statsBefore.total}`);
    console.log(`Contratos duplicados detectados: ${statsBefore.duplicates}`);
    console.log('\nPor cliente:');
    Object.entries(statsBefore.byClient).forEach(([client, count]) => {
      console.log(`  - ${client}: ${count} contrato(s)`);
    });
    console.log('\nPor tipo de proyecto:');
    Object.entries(statsBefore.byProject).forEach(([project, count]) => {
      console.log(`  - ${project}: ${count} contrato(s)`);
    });

    // 2. Limpiar duplicados
    console.log('\n🧹 Ejecutando limpieza de duplicados...');
    const deletedCount = await testService.cleanupDuplicateContracts(testUserId);

    // 3. Obtener estadísticas después de la limpieza
    console.log('\n📊 Obteniendo estadísticas después de la corrección...');
    const statsAfter = await testService.getContractStats(testUserId);
    
    console.log('\n📈 ESTADÍSTICAS DESPUÉS:');
    console.log(`Total de contratos: ${statsAfter.total}`);
    console.log(`Contratos duplicados detectados: ${statsAfter.duplicates}`);
    console.log('\nPor cliente:');
    Object.entries(statsAfter.byClient).forEach(([client, count]) => {
      console.log(`  - ${client}: ${count} contrato(s)`);
    });
    console.log('\nPor tipo de proyecto:');
    Object.entries(statsAfter.byProject).forEach(([project, count]) => {
      console.log(`  - ${project}: ${count} contrato(s)`);
    });

    // 4. Resumen de la corrección
    console.log('\n🎯 RESUMEN DE LA CORRECCIÓN:');
    console.log(`Contratos eliminados: ${deletedCount}`);
    console.log(`Contratos antes: ${statsBefore.total}`);
    console.log(`Contratos después: ${statsAfter.total}`);
    console.log(`Duplicados eliminados: ${statsBefore.duplicates}`);
    console.log(`Duplicados restantes: ${statsAfter.duplicates}`);

    if (statsAfter.duplicates === 0) {
      console.log('✅ ÉXITO: Todos los duplicados han sido eliminados');
    } else {
      console.log('⚠️ ADVERTENCIA: Aún quedan algunos duplicados');
    }

    // 5. Probar búsqueda de contratos existentes
    console.log('\n🔍 Probando búsqueda de contratos existentes...');
    for (const [client, count] of Object.entries(statsAfter.byClient)) {
      for (const [project, projectCount] of Object.entries(statsAfter.byProject)) {
        const existing = await testService.findExistingContract(testUserId, client, project);
        if (existing) {
          console.log(`✅ Encontrado: ${client} - ${project} (ID: ${existing.id})`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }

  console.log('\n🏁 PRUEBA COMPLETADA');
}

// Ejecutar la prueba
if (require.main === module) {
  testContractHistoryFix().catch(console.error);
}

module.exports = { testContractHistoryFix };