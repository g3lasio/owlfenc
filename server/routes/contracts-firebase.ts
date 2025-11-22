/**
 * API Routes para el sistema de contratos
 * USANDO SOLO FIREBASE - NO PostgreSQL
 */

import express from 'express';
import { z } from 'zod';
import { verifyFirebaseAuth as requireAuth } from '../middleware/firebase-auth';
import { firebaseContractsService } from '../services/firebaseContractsService';

const router = express.Router();

// Schema de validación para contratos
const createContractSchema = z.object({
  estimateId: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().min(1, "Nombre del cliente requerido"),
  clientEmail: z.string().email().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  clientAddress: z.string().optional().nullable(),
  projectAddress: z.string().min(1, "Dirección del proyecto requerida"),
  projectCity: z.string().optional().nullable(),
  projectState: z.string().optional().nullable(),
  projectZip: z.string().optional().nullable(),
  projectType: z.string().min(1, "Tipo de proyecto requerido"),
  projectDescription: z.string().min(1, "Descripción del proyecto requerida"),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)).optional(),
  totalAmount: z.number().positive("El monto debe ser positivo"),
  paymentTerms: z.string(),
  paymentSchedule: z.array(z.object({
    description: z.string(),
    amount: z.number(),
    dueDate: z.string().transform(str => new Date(str)),
    status: z.enum(['pending', 'paid', 'overdue'])
  })).optional(),
  terms: z.string(),
  specialConditions: z.string().optional(),
  contractorName: z.string(),
  contractorEmail: z.string().email().optional(),
  contractorPhone: z.string().optional(),
  contractorLicense: z.string().optional(),
  contractorAddress: z.string().optional(),
  status: z.enum(['draft', 'sent', 'signed', 'in_progress', 'completed', 'cancelled']).default('draft')
});

// GET /api/contracts - Obtener todos los contratos del usuario
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('📋 [CONTRACTS-API] Obteniendo contratos para usuario:', userId);
    
    // Obtener contratos desde Firebase
    const contracts = await firebaseContractsService.getContractsByUser(userId, {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string,
      clientId: req.query.clientId as string
    });
    
    console.log(`✅ [CONTRACTS-API] Encontrados ${contracts.length} contratos`);
    
    res.json(contracts);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al obtener contratos:', error);
    res.status(500).json({ 
      error: 'Error al obtener contratos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/contracts - Crear un nuevo contrato
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('📝 [CONTRACTS-API] Creando nuevo contrato para usuario:', userId);
    
    // Validar datos de entrada
    const validationResult = createContractSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.error('❌ [CONTRACTS-API] Error de validación:', validationResult.error);
      return res.status(400).json({
        error: 'Datos de contrato inválidos',
        details: validationResult.error.format()
      });
    }
    
    // Crear contrato en Firebase
    const newContract = await firebaseContractsService.createContract({
      ...validationResult.data,
      userId, // Firebase UID obligatorio
      contractNumber: '', // Se generará automáticamente
      clientEmail: validationResult.data.clientEmail || undefined,
      clientPhone: validationResult.data.clientPhone || undefined,
      clientAddress: validationResult.data.clientAddress || undefined,
      projectCity: validationResult.data.projectCity || undefined,
      projectState: validationResult.data.projectState || undefined,
      projectZip: validationResult.data.projectZip || undefined,
      endDate: validationResult.data.endDate || undefined,
      specialConditions: validationResult.data.specialConditions || undefined,
      contractorEmail: validationResult.data.contractorEmail || undefined,
      contractorPhone: validationResult.data.contractorPhone || undefined,
      contractorLicense: validationResult.data.contractorLicense || undefined,
      contractorAddress: validationResult.data.contractorAddress || undefined
    });
    
    console.log('✅ [CONTRACTS-API] Contrato creado exitosamente, ID:', newContract.id);
    
    res.status(201).json(newContract);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al crear contrato:', error);
    res.status(500).json({ 
      error: 'Error al crear contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/contracts/from-estimate - Crear contrato desde estimado
router.post('/from-estimate', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const { estimateId } = req.body;
    
    if (!estimateId) {
      return res.status(400).json({ error: 'ID de estimado requerido' });
    }
    
    console.log(`📝 [CONTRACTS-API] Creando contrato desde estimado ${estimateId}`);
    
    const newContract = await firebaseContractsService.createContractFromEstimate(estimateId, userId);
    
    console.log('✅ [CONTRACTS-API] Contrato creado desde estimado, ID:', newContract.id);
    
    res.status(201).json(newContract);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al crear contrato desde estimado:', error);
    res.status(500).json({ 
      error: 'Error al crear contrato desde estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/contracts/stats/summary - Obtener estadísticas de contratos
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log(`📊 [CONTRACTS-API] Obteniendo estadísticas para usuario ${userId}`);
    
    const stats = await firebaseContractsService.getContractStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// 📁 GET /api/contracts/archived - Obtener contratos archivados (MUST BE BEFORE /:id)
router.get('/archived', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log(`📁 [CONTRACTS-API] Obteniendo contratos archivados para usuario ${userId}`);
    
    const archivedContracts = await firebaseContractsService.getArchivedContracts(userId);
    
    console.log(`✅ [CONTRACTS-API] Encontrados ${archivedContracts.length} contratos archivados`);
    
    res.json(archivedContracts);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al obtener contratos archivados:', error);
    res.status(500).json({ 
      error: 'Error al obtener contratos archivados',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/contracts/:id - Obtener un contrato específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    
    console.log(`📄 [CONTRACTS-API] Obteniendo contrato ${contractId} para usuario ${userId}`);
    
    const contract = await firebaseContractsService.getContract(contractId, userId);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    res.json(contract);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al obtener contrato:', error);
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al obtener contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/contracts/:id - Actualizar un contrato
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    
    console.log(`✏️ [CONTRACTS-API] Actualizando contrato ${contractId} para usuario ${userId}`);
    
    // Actualizar contrato en Firebase
    const updatedContract = await firebaseContractsService.updateContract(
      contractId,
      userId,
      req.body
    );
    
    console.log('✅ [CONTRACTS-API] Contrato actualizado exitosamente');
    
    res.json(updatedContract);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al actualizar contrato:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al actualizar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// DELETE /api/contracts/:id - Eliminar un contrato
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    
    console.log(`🗑️ [CONTRACTS-API] Eliminando contrato ${contractId} para usuario ${userId}`);
    
    const success = await firebaseContractsService.deleteContract(contractId, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Error al eliminar contrato' });
    }
    
    console.log('✅ [CONTRACTS-API] Contrato eliminado exitosamente');
    
    res.json({ success: true, message: 'Contrato eliminado exitosamente' });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al eliminar contrato:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al eliminar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/contracts/:id/send - Marcar contrato como enviado
router.post('/:id/send', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    
    console.log(`📧 [CONTRACTS-API] Marcando contrato ${contractId} como enviado`);
    
    await firebaseContractsService.markContractAsSent(contractId, userId);
    
    res.json({ success: true, message: 'Contrato marcado como enviado' });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al marcar como enviado:', error);
    res.status(500).json({ 
      error: 'Error al marcar contrato como enviado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/contracts/:id/sign/contractor - Firmar contrato como contratista
router.post('/:id/sign/contractor', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    const { name, ipAddress } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nombre requerido para firma' });
    }
    
    console.log(`✍️ [CONTRACTS-API] Firmando contrato ${contractId} como contratista`);
    
    await firebaseContractsService.signContractAsContractor(contractId, userId, {
      name,
      ipAddress: ipAddress || req.ip
    });
    
    res.json({ success: true, message: 'Contrato firmado por contratista' });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al firmar contrato:', error);
    res.status(500).json({ 
      error: 'Error al firmar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/contracts/:id/sign/client - Firmar contrato como cliente (sin auth)
router.post('/:id/sign/client', async (req, res) => {
  try {
    const contractId = req.params.id;
    const { name, email, ipAddress } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email requeridos para firma' });
    }
    
    console.log(`✍️ [CONTRACTS-API] Firmando contrato ${contractId} como cliente`);
    
    await firebaseContractsService.signContractAsClient(contractId, {
      name,
      email,
      ipAddress: ipAddress || req.ip
    });
    
    res.json({ success: true, message: 'Contrato firmado por cliente' });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al firmar contrato:', error);
    res.status(500).json({ 
      error: 'Error al firmar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/contracts/:id/complete - Completar contrato
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    
    console.log(`✅ [CONTRACTS-API] Completando contrato ${contractId}`);
    
    await firebaseContractsService.completeContract(contractId, userId);
    
    res.json({ success: true, message: 'Contrato completado' });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al completar contrato:', error);
    res.status(500).json({ 
      error: 'Error al completar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/contracts/:id/cancel - Cancelar contrato
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    const { reason } = req.body;
    
    console.log(`❌ [CONTRACTS-API] Cancelando contrato ${contractId}`);
    
    await firebaseContractsService.cancelContract(contractId, userId, reason);
    
    res.json({ success: true, message: 'Contrato cancelado' });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al cancelar contrato:', error);
    res.status(500).json({ 
      error: 'Error al cancelar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/contracts/stats/summary - Obtener estadísticas de contratos
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log(`📊 [CONTRACTS-API] Obteniendo estadísticas para usuario ${userId}`);
    
    const stats = await firebaseContractsService.getContractStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// 📁 POST /api/contracts/:id/archive - Archivar contrato
router.post('/:id/archive', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    const { reason } = req.body;
    
    console.log(`📁 [CONTRACTS-API] Archivando contrato ${contractId} para usuario ${userId}`);
    
    await firebaseContractsService.archiveContract(contractId, userId, reason);
    
    res.json({ 
      success: true, 
      message: 'Contrato archivado exitosamente',
      contractId 
    });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al archivar contrato:', error);
    res.status(500).json({ 
      error: 'Error al archivar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// 📂 POST /api/contracts/:id/unarchive - Desarchivar contrato
router.post('/:id/unarchive', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const contractId = req.params.id;
    
    console.log(`📂 [CONTRACTS-API] Desarchivando contrato ${contractId} para usuario ${userId}`);
    
    await firebaseContractsService.unarchiveContract(contractId, userId);
    
    res.json({ 
      success: true, 
      message: 'Contrato restaurado exitosamente',
      contractId 
    });
  } catch (error) {
    console.error('❌ [CONTRACTS-API] Error al restaurar contrato:', error);
    res.status(500).json({ 
      error: 'Error al restaurar contrato',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;