/**
 * ADMIN CONTRACT MANAGEMENT - Temporary endpoint for data cleanup
 */

import { Router, Request, Response } from 'express';
import { firebaseContractService } from '../services/firebaseContractService';
import { db } from '../lib/firebase-admin';

const router = Router();

/**
 * GET /api/admin-contracts/list/:userId
 * Lista TODOS los contratos de un usuario con detalles
 * Accede a la colección 'contractHistory' usada por el frontend
 */
router.get('/list/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    console.log(`📋 [ADMIN] Listando todos los contratos de usuario: ${userId}`);
    
    // Query a la colección 'contractHistory' (frontend)
    const snapshot = await db.collection('contractHistory')
      .where('userId', '==', userId)
      .get();
    
    const contracts: any[] = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      contracts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      });
    });
    
    // Crear resumen con detalles de cada contrato
    const summary = contracts.map(c => ({
      id: c.id,
      contractId: c.contractId || 'N/A',
      clientName: c.clientName || 'SIN NOMBRE',
      projectType: c.projectType || 'N/A',
      status: c.status,
      totalAmount: c.contractData?.financials?.total || 0,
      createdAt: c.createdAt?.toISOString?.() || 'N/A',
      hasContractData: !!c.contractData,
      isCorrupted: !c.clientName || !c.contractData || c.clientName.trim() === ''
    }));
    
    // Identificar corruptos
    const corrupted = summary.filter(c => c.isCorrupted);
    const valid = summary.filter(c => !c.isCorrupted);
    
    console.log(`✅ [ADMIN] Total contratos en contractHistory: ${contracts.length}`);
    console.log(`   Válidos: ${valid.length}`);
    console.log(`   Corruptos: ${corrupted.length}`);
    
    res.json({
      success: true,
      total: contracts.length,
      valid: valid.length,
      corrupted: corrupted.length,
      contracts: summary,
      corruptedList: corrupted
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Error listando contratos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin-contracts/delete/:docId
 * Elimina un contrato específico de contractHistory (SOLO PARA CLEANUP)
 */
router.delete('/delete/:docId', async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    const { userId, confirm } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId es requerido'
      });
    }
    
    if (confirm !== 'DELETE_PERMANENTLY') {
      return res.status(400).json({
        success: false,
        error: 'Confirmación requerida: confirm: "DELETE_PERMANENTLY"'
      });
    }
    
    console.log(`🗑️ [ADMIN] Eliminando contrato de contractHistory: ${docId} (usuario: ${userId})`);
    
    // Verificar ownership antes de eliminar
    const doc = await db.collection('contractHistory').doc(docId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Contrato no encontrado'
      });
    }
    
    const data = doc.data();
    if (data?.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Contrato no pertenece al usuario'
      });
    }
    
    // ELIMINAR de Firebase
    await db.collection('contractHistory').doc(docId).delete();
    
    console.log(`✅ [ADMIN] Contrato eliminado de contractHistory: ${docId}`);
    
    res.json({
      success: true,
      message: 'Contrato eliminado permanentemente',
      deletedContract: {
        id: docId,
        clientName: data?.clientName || 'N/A',
        status: data?.status
      }
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Error eliminando contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin-contracts/cleanup-corrupted/:userId
 * Elimina TODOS los contratos corruptos de contractHistory
 */
router.post('/cleanup-corrupted/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { confirm } = req.body;
    
    if (confirm !== 'CLEANUP_CORRUPTED_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Confirmación requerida: confirm: "CLEANUP_CORRUPTED_DATA"'
      });
    }
    
    console.log(`🧹 [ADMIN] Limpiando contratos corruptos de contractHistory para usuario: ${userId}`);
    
    // Query a contractHistory
    const snapshot = await db.collection('contractHistory')
      .where('userId', '==', userId)
      .get();
    
    const contracts: any[] = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      contracts.push({
        id: doc.id,
        clientName: data.clientName,
        contractData: data.contractData
      });
    });
    
    // Identificar corruptos (sin nombre o sin contractData)
    const corrupted = contracts.filter(c => 
      !c.clientName || 
      !c.contractData ||
      c.clientName.trim() === ''
    );
    
    if (corrupted.length === 0) {
      return res.json({
        success: true,
        message: 'No se encontraron contratos corruptos',
        deleted: 0
      });
    }
    
    console.log(`🗑️ [ADMIN] Eliminando ${corrupted.length} contratos corruptos de contractHistory...`);
    
    // Eliminar cada uno
    const deleted: any[] = [];
    for (const contract of corrupted) {
      await db.collection('contractHistory').doc(contract.id).delete();
      deleted.push({
        id: contract.id,
        clientName: contract.clientName || 'SIN NOMBRE'
      });
      console.log(`   ✅ Eliminado: ${contract.id} (${contract.clientName || 'SIN NOMBRE'})`);
    }
    
    console.log(`✅ [ADMIN] Limpieza completada: ${deleted.length} contratos eliminados`);
    
    res.json({
      success: true,
      message: `${deleted.length} contratos corruptos eliminados`,
      deleted: deleted.length,
      deletedContracts: deleted
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Error limpiando contratos corruptos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin-contracts/summary/:userId
 * Resumen de contratos agrupados por cliente (detecta duplicados)
 */
router.get('/summary/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 [ADMIN] Generando resumen de contratos para usuario: ${userId}`);
    
    const snapshot = await db.collection('contractHistory')
      .where('userId', '==', userId)
      .get();
    
    const contractsByClient: any = {};
    const contracts: any[] = [];
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const clientName = data.clientName || 'SIN NOMBRE';
      
      if (!contractsByClient[clientName]) {
        contractsByClient[clientName] = [];
      }
      
      contractsByClient[clientName].push({
        id: doc.id,
        contractId: data.contractId || 'N/A',
        projectType: data.projectType || 'N/A',
        status: data.status,
        totalAmount: data.contractData?.financials?.total || 0,
        createdAt: data.createdAt?.toDate?.().toISOString() || 'N/A'
      });
      
      contracts.push({ id: doc.id, clientName });
    });
    
    // Ordenar por cantidad (mayor a menor)
    const sorted = Object.entries(contractsByClient)
      .sort(([, a]: any, [, b]: any) => b.length - a.length)
      .map(([name, contracts]: any) => ({
        clientName: name,
        count: contracts.length,
        contracts
      }));
    
    console.log(`✅ [ADMIN] Resumen generado: ${contracts.length} contratos totales`);
    console.log(`   Clientes únicos: ${sorted.length}`);
    
    res.json({
      success: true,
      totalContracts: contracts.length,
      uniqueClients: sorted.length,
      byClient: sorted
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Error generando resumen:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
