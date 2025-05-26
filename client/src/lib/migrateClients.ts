import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where 
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Migra los clientes del userId anterior al usuario actual
 */
export const migrateClientsToCurrentUser = async (newUserId: string) => {
  try {
    console.log("🔄 Iniciando migración de clientes...");
    console.log("Usuario destino:", newUserId);
    
    // Buscar todos los clientes con el userId anterior
    const clientsRef = collection(db, "clients");
    const q = query(clientsRef, where("userId", "==", "dev-user-123"));
    const querySnapshot = await getDocs(q);
    
    console.log(`📊 Encontrados ${querySnapshot.size} clientes para migrar`);
    
    if (querySnapshot.size === 0) {
      console.log("ℹ️ No hay clientes para migrar");
      return { success: true, migratedCount: 0 };
    }
    
    let migratedCount = 0;
    const batch = [];
    
    // Actualizar cada cliente
    for (const clientDoc of querySnapshot.docs) {
      try {
        const clientRef = doc(db, "clients", clientDoc.id);
        await updateDoc(clientRef, {
          userId: newUserId,
          updatedAt: new Date()
        });
        
        migratedCount++;
        console.log(`✅ Cliente migrado: ${clientDoc.data().name} (${clientDoc.id})`);
      } catch (error) {
        console.error(`❌ Error migrando cliente ${clientDoc.id}:`, error);
      }
    }
    
    console.log(`🎉 Migración completada: ${migratedCount} clientes migrados`);
    
    return { 
      success: true, 
      migratedCount,
      totalFound: querySnapshot.size 
    };
    
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    return { 
      success: false, 
      error: error.message,
      migratedCount: 0 
    };
  }
};