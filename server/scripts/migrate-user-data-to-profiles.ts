/**
 * Migration Script: Legacy User Data to Company Profiles
 * 
 * Este script migra datos de usuarios del sistema legacy (storage.users)
 * al nuevo sistema de perfiles de Firebase (CompanyProfileService)
 * 
 * Uso:
 * npx ts-node server/scripts/migrate-user-data-to-profiles.ts
 */

import { storage } from '../storage';
import { companyProfileService } from '../services/CompanyProfileService';

interface LegacyUser {
  id: number;
  firebaseUid?: string;
  username: string;
  email: string;
  company?: string;
  address?: string;
  phone?: string;
  license?: string;
  logo?: string;
  createdAt?: Date;
}

async function migrateUserDataToProfiles() {
  console.log('🚀 [MIGRATION] Iniciando migración de datos de usuarios a perfiles...\n');
  
  try {
    // Obtener todos los usuarios del sistema legacy
    const users = await storage.getAllUsers() as LegacyUser[];
    
    if (!users || users.length === 0) {
      console.log('⚠️ [MIGRATION] No se encontraron usuarios para migrar.');
      return;
    }
    
    console.log(`📊 [MIGRATION] Encontrados ${users.length} usuarios en el sistema legacy.\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        // Verificar que el usuario tenga Firebase UID
        if (!user.firebaseUid) {
          console.log(`⏭️ [MIGRATION] Usuario ${user.id} (${user.email}) no tiene Firebase UID, omitiendo...`);
          skipped++;
          continue;
        }
        
        // Verificar si ya existe un perfil
        const existingProfile = await companyProfileService.getProfileByFirebaseUid(user.firebaseUid);
        
        if (existingProfile) {
          console.log(`✓ [MIGRATION] Usuario ${user.id} (${user.email}) ya tiene perfil, omitiendo...`);
          skipped++;
          continue;
        }
        
        // Crear perfil desde datos legacy
        const profileData = {
          companyName: user.company || user.username,
          address: user.address || '',
          phone: user.phone || '',
          email: user.email,
          license: user.license || '',
          logo: user.logo || '',
          ownerName: user.username,
          // Campos adicionales pueden agregarse aquí si existen en legacy
        };
        
        // Validar que tenga al menos los campos mínimos
        if (!profileData.companyName || !profileData.email) {
          console.log(`⚠️ [MIGRATION] Usuario ${user.id} (${user.email}) no tiene datos mínimos, omitiendo...`);
          skipped++;
          continue;
        }
        
        // Crear el perfil
        await companyProfileService.saveProfile(user.firebaseUid, profileData);
        
        console.log(`✅ [MIGRATION] Usuario ${user.id} (${user.email}) migrado exitosamente.`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ [MIGRATION] Error migrando usuario ${user.id} (${user.email}):`, error);
        errors++;
      }
    }
    
    // Resumen de la migración
    console.log('\n' + '='.repeat(60));
    console.log('📊 [MIGRATION] Resumen de la migración:');
    console.log('='.repeat(60));
    console.log(`Total de usuarios:     ${users.length}`);
    console.log(`✅ Migrados:           ${migrated}`);
    console.log(`⏭️ Omitidos:           ${skipped}`);
    console.log(`❌ Errores:            ${errors}`);
    console.log('='.repeat(60) + '\n');
    
    if (migrated > 0) {
      console.log('✅ [MIGRATION] Migración completada exitosamente.');
    } else {
      console.log('⚠️ [MIGRATION] No se migraron usuarios nuevos.');
    }
    
  } catch (error) {
    console.error('💥 [MIGRATION] Error crítico durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateUserDataToProfiles()
    .then(() => {
      console.log('\n✅ [MIGRATION] Script finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 [MIGRATION] Script finalizado con errores:', error);
      process.exit(1);
    });
}

export { migrateUserDataToProfiles };
