import { db } from "../lib/firebase-admin";

/**
 * Script para limpiar contratos corruptos dejando solo el último válido
 */
async function cleanupCorruptContracts() {
  const KEEP_CONTRACT_ID = "CNT-mgxd6e2z-2CB7F5A8"; // El único contrato válido a mantener
  const USER_ID = "qztot1YEy3UWz605gIH2iwwWhW53";
  
  console.log("🧹 Starting cleanup of corrupt contracts...");
  
  try {
    // Clean from dualSignatureContracts collection
    console.log("📋 Cleaning dualSignatureContracts collection...");
    const dualSnapshot = await db
      .collection('dualSignatureContracts')
      .where('userId', '==', USER_ID)
      .where('status', '==', 'completed')
      .get();
    
    let deletedFromDual = 0;
    for (const doc of dualSnapshot.docs) {
      const contractId = doc.data().contractId || doc.id;
      if (contractId !== KEEP_CONTRACT_ID) {
        await doc.ref.delete();
        console.log(`  ❌ Deleted: ${contractId}`);
        deletedFromDual++;
      } else {
        console.log(`  ✅ Kept: ${contractId} (valid contract)`);
      }
    }
    
    // Clean from contractHistory collection
    console.log("\n📋 Cleaning contractHistory collection...");
    const historySnapshot = await db
      .collection('contractHistory')
      .where('userId', '==', USER_ID)
      .where('status', '==', 'completed')
      .get();
    
    let deletedFromHistory = 0;
    for (const doc of historySnapshot.docs) {
      const contractId = doc.data().contractId || doc.id;
      if (contractId !== KEEP_CONTRACT_ID) {
        await doc.ref.delete();
        console.log(`  ❌ Deleted: ${contractId}`);
        deletedFromHistory++;
      } else {
        console.log(`  ✅ Kept: ${contractId} (valid contract)`);
      }
    }
    
    console.log("\n✅ Cleanup completed!");
    console.log(`📊 Summary:`);
    console.log(`  - Deleted from dualSignatureContracts: ${deletedFromDual}`);
    console.log(`  - Deleted from contractHistory: ${deletedFromHistory}`);
    console.log(`  - Total contracts removed: ${deletedFromDual + deletedFromHistory}`);
    console.log(`  - Valid contract preserved: ${KEEP_CONTRACT_ID}`);
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupCorruptContracts();