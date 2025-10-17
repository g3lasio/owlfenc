/**
 * Script to migrate all contracts from PostgreSQL to Firebase
 * Run with: tsx server/scripts/migrate-contracts.ts
 */

import { contractMigrationService } from '../services/contractMigrationService';

async function main() {
  console.log('\n🚀 ========================================');
  console.log('   CONTRACT MIGRATION: PostgreSQL → Firebase');
  console.log('   ========================================\n');
  
  try {
    // Run migration
    console.log('📋 Step 1: Migrating contracts...\n');
    const result = await contractMigrationService.migrateAllContracts();
    
    // Display results
    console.log('\n📊 ========================================');
    console.log('   MIGRATION RESULTS');
    console.log('   ========================================');
    console.log(`   Total contracts:     ${result.totalContracts}`);
    console.log(`   ✅ Migrated:          ${result.migratedContracts}`);
    console.log(`   ⏭️  Skipped:           ${result.skippedContracts}`);
    console.log(`   ❌ Errors:            ${result.errors.length}`);
    console.log('   ========================================\n');
    
    if (result.errors.length > 0) {
      console.log('❌ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log('');
    }
    
    // Verify migration
    if (result.success) {
      console.log('📋 Step 2: Verifying migration integrity...\n');
      const verification = await contractMigrationService.verifyMigration();
      
      console.log('📊 ========================================');
      console.log('   VERIFICATION RESULTS');
      console.log('   ========================================');
      console.log(`   PostgreSQL count:    ${verification.postgresCount}`);
      console.log(`   Firebase count:      ${verification.firebaseCount}`);
      console.log(`   Status:              ${verification.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
      
      if (verification.missing.length > 0) {
        console.log(`   Missing contracts:   ${verification.missing.length}`);
        console.log('   Missing IDs:', verification.missing.join(', '));
      }
      console.log('   ========================================\n');
      
      if (verification.isConsistent) {
        console.log('✅ Migration completed successfully!');
        console.log('   All contracts have been migrated to Firebase.\n');
      } else {
        console.log('⚠️ Migration completed with warnings.');
        console.log('   Some contracts may not have been migrated.\n');
      }
    } else {
      console.log('❌ Migration failed. Please review errors above.\n');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('\n❌ Fatal error during migration:');
    console.error(error);
    process.exit(1);
  }
}

main();
