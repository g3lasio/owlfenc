/**
 * Migration Script: Copy companyProfiles to userProfiles
 * 
 * This script migrates all data from the 'companyProfiles' collection
 * to the 'userProfiles' collection to ensure data consistency across
 * Settings page and PDF generation systems.
 * 
 * Run this script ONCE after deploying the fix to sync existing data.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  console.log('🔥 Initializing Firebase Admin for migration...');
  
  // Check if we have service account credentials
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccount) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccount))
    });
  } else {
    // Use default credentials (works on Cloud Functions/Cloud Run)
    initializeApp();
  }
}

const db = getFirestore();

async function migrateCompanyProfiles() {
  try {
    console.log('🚀 Starting migration from companyProfiles to userProfiles...\n');
    
    // Get all documents from companyProfiles
    const companyProfilesSnapshot = await db.collection('companyProfiles').get();
    
    if (companyProfilesSnapshot.empty) {
      console.log('📭 No documents found in companyProfiles collection');
      return;
    }
    
    console.log(`📊 Found ${companyProfilesSnapshot.size} profiles to migrate\n`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const doc of companyProfilesSnapshot.docs) {
      const firebaseUid = doc.id;
      const data = doc.data();
      
      try {
        // Check if profile already exists in userProfiles
        const userProfileRef = db.collection('userProfiles').doc(firebaseUid);
        const userProfileDoc = await userProfileRef.get();
        
        if (userProfileDoc.exists) {
          console.log(`⏭️  Skipping ${firebaseUid} - already exists in userProfiles`);
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
        
        console.log(`✅ Migrated ${firebaseUid} - ${data.companyName || 'No name'}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating ${firebaseUid}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total processed: ${companyProfilesSnapshot.size}`);
    
    if (successCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('⚠️  NOTE: companyProfiles collection is NOT deleted for safety.');
      console.log('   You can manually delete it after verifying everything works.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateCompanyProfiles()
  .then(() => {
    console.log('\n🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
