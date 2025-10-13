/**
 * CONTRACT MIGRATION TO FIREBASE
 * 
 * Migra contratos de PostgreSQL a Firebase sin pérdida de datos
 * Garantiza almacenamiento permanente de PDFs firmados
 */

import express from 'express';
import { db } from '../db';
import { digitalContracts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { firebaseContractService } from '../services/firebaseContractService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';

const router = express.Router();

/**
 * GET /api/contract-migration/status
 * Verificar el estado de contratos en ambos sistemas
 */
router.get('/status', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Contratos en PostgreSQL
    const postgresContracts = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId));
    
    // Contratos en Firebase
    const firebaseContracts = await firebaseContractService.getUserContracts(userId);
    
    // Análisis
    const postgresCompleted = postgresContracts.filter(c => c.contractorSigned && c.clientSigned);
    const firebaseCompleted = firebaseContracts.filter(c => c.status === 'completed');
    
    const status = {
      postgres: {
        total: postgresContracts.length,
        completed: postgresCompleted.length,
        withPdf: postgresContracts.filter(c => c.signedPdfPath).length
      },
      firebase: {
        total: firebaseContracts.length,
        completed: firebaseCompleted.length,
        withPdf: firebaseContracts.filter(c => c.signedPdfBase64).length
      },
      needsMigration: postgresContracts.length > 0,
      contractsToMigrate: postgresContracts.map(c => ({
        contractId: c.contractId,
        clientName: c.clientName,
        status: c.contractorSigned && c.clientSigned ? 'completed' : 'in_progress',
        hasPdf: !!c.signedPdfPath
      }))
    };
    
    res.json({ success: true, status });
  } catch (error: any) {
    console.error('❌ [MIGRATION] Error checking status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contract-migration/migrate
 * Migrar TODOS los contratos del usuario de PostgreSQL a Firebase
 */
router.post('/migrate', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    console.log(`🔄 [MIGRATION] Iniciando migración para usuario ${userId}`);
    
    // Obtener todos los contratos del usuario en PostgreSQL
    const postgresContracts = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId));
    
    if (postgresContracts.length === 0) {
      return res.json({
        success: true,
        message: 'No hay contratos para migrar',
        migrated: 0
      });
    }
    
    const results = {
      total: postgresContracts.length,
      migrated: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Migrar cada contrato
    for (const contract of postgresContracts) {
      try {
        console.log(`📦 [MIGRATION] Migrando contrato: ${contract.contractId}`);
        
        // Verificar si ya existe en Firebase
        const existing = await firebaseContractService.getContract(contract.contractId, userId);
        if (existing) {
          console.log(`⏭️ [MIGRATION] Contrato ${contract.contractId} ya existe en Firebase - saltando`);
          results.migrated++;
          continue;
        }
        
        // Migrar a Firebase
        await firebaseContractService.migrateFromPostgres(contract, userId);
        results.migrated++;
        
        console.log(`✅ [MIGRATION] Contrato migrado: ${contract.contractId}`);
      } catch (error: any) {
        console.error(`❌ [MIGRATION] Error migrando ${contract.contractId}:`, error);
        results.failed++;
        results.errors.push(`${contract.contractId}: ${error.message}`);
      }
    }
    
    console.log(`✅ [MIGRATION] Migración completada para usuario ${userId}`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Migrados: ${results.migrated}`);
    console.log(`   Fallidos: ${results.failed}`);
    
    res.json({
      success: true,
      message: `Migración completada: ${results.migrated}/${results.total} contratos`,
      results
    });
  } catch (error: any) {
    console.error('❌ [MIGRATION] Error en migración:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contract-migration/verify-integrity
 * Verificar integridad de datos después de migración
 */
router.post('/verify-integrity', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const integrity = await firebaseContractService.verifyDataIntegrity(userId);
    
    res.json({
      success: true,
      integrity,
      recommendation: integrity.issues.length > 0 
        ? '⚠️ Se encontraron problemas - revisa los issues'
        : '✅ Todos los datos están íntegros'
    });
  } catch (error: any) {
    console.error('❌ [MIGRATION] Error verificando integridad:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/contract-migration/cleanup-postgres
 * PELIGROSO: Limpiar contratos de PostgreSQL después de verificar migración exitosa
 * Solo ejecutar después de confirmar que todos los datos están en Firebase
 */
router.delete('/cleanup-postgres', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    const { confirmDelete } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    if (confirmDelete !== 'DELETE_POSTGRES_CONTRACTS') {
      return res.status(400).json({ 
        error: 'Confirmación requerida',
        requiredConfirmation: 'DELETE_POSTGRES_CONTRACTS'
      });
    }
    
    // Verificar que todos los contratos estén en Firebase primero
    const { eq } = await import('drizzle-orm');
    const postgresContracts = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId));
    
    const firebaseContracts = await firebaseContractService.getUserContracts(userId);
    
    if (firebaseContracts.length < postgresContracts.length) {
      return res.status(400).json({
        error: 'Migración incompleta',
        postgres: postgresContracts.length,
        firebase: firebaseContracts.length,
        message: 'No todos los contratos están en Firebase. Migra primero.'
      });
    }
    
    // Eliminar contratos de PostgreSQL
    const { sql } = await import('drizzle-orm');
    await db.delete(digitalContracts).where(eq(digitalContracts.userId, userId));
    
    console.log(`🗑️ [MIGRATION] Contratos de PostgreSQL eliminados para usuario ${userId}`);
    console.log(`   Eliminados: ${postgresContracts.length}`);
    console.log(`   Preservados en Firebase: ${firebaseContracts.length}`);
    
    res.json({
      success: true,
      message: `${postgresContracts.length} contratos eliminados de PostgreSQL`,
      preservedInFirebase: firebaseContracts.length
    });
  } catch (error: any) {
    console.error('❌ [MIGRATION] Error limpiando PostgreSQL:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
