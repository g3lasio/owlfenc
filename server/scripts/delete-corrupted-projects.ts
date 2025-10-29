import { db } from '../firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

async function deleteAllProjects() {
  console.log('🔥 [CLEANUP] Iniciando eliminación de colección "projects"...');
  
  try {
    const projectsRef = db.collection('projects');

    console.log('📊 [CLEANUP] Contando documentos en "projects"...');
    const snapshot = await projectsRef.get();
    const totalDocs = snapshot.size;
    
    console.log(`📋 [CLEANUP] Encontrados ${totalDocs} documentos para eliminar`);

    if (totalDocs === 0) {
      console.log('✅ [CLEANUP] No hay documentos para eliminar');
      return;
    }

    console.log('⚠️ [CLEANUP] ATENCIÓN: Esto eliminará TODOS los proyectos corruptos');
    console.log('⏳ [CLEANUP] Iniciando eliminación en 3 segundos...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;

    while (true) {
      const batch = db.batch();
      const docsToDelete = await projectsRef.limit(batchSize).get();

      if (docsToDelete.empty) {
        break;
      }

      docsToDelete.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += docsToDelete.size;
      
      console.log(`🗑️ [CLEANUP] Eliminados ${deletedCount}/${totalDocs} documentos...`);

      if (docsToDelete.size < batchSize) {
        break;
      }
    }

    console.log('✅ [CLEANUP] Eliminación completada exitosamente');
    console.log(`📊 [CLEANUP] Total eliminado: ${deletedCount} documentos`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ [CLEANUP] Error durante la eliminación:', error);
    process.exit(1);
  }
}

deleteAllProjects();
