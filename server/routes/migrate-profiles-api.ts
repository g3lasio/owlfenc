/**
 * API Endpoint for Profile Migration
 * 
 * Temporary endpoint to migrate data from companyProfiles to userProfiles
 * Uses existing Firebase Admin initialization from the server
 */

import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

const router = Router();

router.post('/migrate-profiles', async (req, res) => {
  try {
    console.log('🚀 Starting profile migration via API endpoint...\n');
    
    const db = getFirestore();
    
    // Get all documents from companyProfiles
    const companyProfilesSnapshot = await db.collection('companyProfiles').get();
    
    if (companyProfilesSnapshot.empty) {
      console.log('📭 No documents found in companyProfiles collection');
      return res.json({
        success: true,
        message: 'No profiles to migrate',
        migrated: 0,
        skipped: 0,
        errors: 0
      });
    }
    
    console.log(`📊 Found ${companyProfilesSnapshot.size} profiles to migrate\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const migrationLog: string[] = [];
    
    for (const doc of companyProfilesSnapshot.docs) {
      const firebaseUid = doc.id;
      const data = doc.data();
      
      try {
        // Check if profile already exists in userProfiles
        const userProfileRef = db.collection('userProfiles').doc(firebaseUid);
        const userProfileDoc = await userProfileRef.get();
        
        if (userProfileDoc.exists) {
          const msg = `⏭️  Skipping ${firebaseUid} - already exists in userProfiles`;
          console.log(msg);
          migrationLog.push(msg);
          skippedCount++;
          continue;
        }
        
        // Copy data to userProfiles
        await userProfileRef.set({
          ...data,
          // Ensure both 'company' and 'companyName' fields exist for compatibility
          company: data.companyName || data.company || '',
          companyName: data.companyName || data.company || '',
          migratedAt: new Date(),
          migratedFrom: 'companyProfiles'
        });
        
        const msg = `✅ Migrated ${firebaseUid} - ${data.companyName || 'No name'}`;
        console.log(msg);
        migrationLog.push(msg);
        successCount++;
        
      } catch (error) {
        const msg = `❌ Error migrating ${firebaseUid}: ${error}`;
        console.error(msg);
        migrationLog.push(msg);
        errorCount++;
      }
    }
    
    const summary = {
      success: true,
      message: 'Migration completed',
      migrated: successCount,
      skipped: skippedCount,
      errors: errorCount,
      total: companyProfilesSnapshot.size,
      log: migrationLog
    };
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total processed: ${companyProfilesSnapshot.size}`);
    
    res.json(summary);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
