/**
 * API Routes para el sistema de estimados
 * Gestiona el autoguardado y historial de estimados
 */

import express from 'express';
import { storage } from '../storage';
import { insertEstimateSchema } from '@shared/schema';
import { z } from 'zod';
import { verifyFirebaseAuth as requireAuth } from '../middleware/firebase-auth';
import { requireSubscriptionLevel, PermissionLevel } from '../middleware/subscription-auth';
import { userMappingService } from '../services/userMappingService';

const router = express.Router();

// GET /api/estimates - Obtener todos los estimados del usuario
router.get('/', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser.uid;
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      // Crear mapeo si no existe
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id || null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Getting estimates for REAL user_id: ${userId}`);
    
    console.log('Obteniendo estimados para usuario:', userId);
    
    // Obtener estimados desde la base de datos
    const estimates = await storage.getEstimatesByUserId(userId);
    
    console.log('Estimados encontrados:', estimates.length);
    
    res.json(estimates);
  } catch (error) {
    console.error('Error al obtener estimados:', error);
    res.status(500).json({ 
      error: 'Error al obtener estimados',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/estimates - Crear un nuevo estimado (REQUIERE SUSCRIPCIÓN)
router.post('/', requireAuth, requireSubscriptionLevel(PermissionLevel.BASIC), async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar SOLAMENTE req.firebaseUser.uid autenticado
    const firebaseUid = req.firebaseUser.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🔐 Creando nuevo estimado para usuario Firebase:', firebaseUid);
    console.log('📦 Datos recibidos (sin firebaseUserId):', { ...req.body, firebaseUserId: undefined });
    
    // Mapear Firebase UID → PostgreSQL user_id
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id || null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    
    console.log(`🔐 [SECURITY] Creating estimate for REAL user_id: ${userId}`);
    
    // Validar datos de entrada (sin firebaseUserId del cliente)
    const estimateData = {
      userId: userId, // ID numérico REAL del usuario autenticado
      ...req.body,
      // 🔐 SECURITY: No usar req.body.firebaseUserId (privilege escalation risk)
      firebaseUserId: undefined, // Eliminar del request body
      estimateDate: new Date(),
      status: req.body.status || 'draft'
    };
    
    // Validar con el esquema
    const validationResult = insertEstimateSchema.safeParse(estimateData);
    
    if (!validationResult.success) {
      console.error('❌ Error de validación:', validationResult.error);
      return res.status(400).json({
        error: 'Datos de estimado inválidos',
        details: validationResult.error.format()
      });
    }
    
    // Crear estimado en la base de datos
    const newEstimate = await storage.createEstimate(validationResult.data);
    
    console.log('✅ Estimado creado exitosamente para usuario:', firebaseUid, 'ID:', newEstimate.id);
    
    res.status(201).json(newEstimate);
  } catch (error) {
    console.error('❌ Error al crear estimado:', error);
    res.status(500).json({ 
      error: 'Error al crear estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/estimates/:id - Obtener un estimado específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id || null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'ID de estimado inválido' });
    }
    
    console.log('Obteniendo estimado:', estimateId, 'para usuario:', userId);
    
    const estimate = await storage.getEstimate(estimateId);
    
    if (!estimate) {
      return res.status(404).json({ error: 'Estimado no encontrado' });
    }
    
    // Verificar que el estimado pertenece al usuario
    if (estimate.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.json(estimate);
  } catch (error) {
    console.error('Error al obtener estimado:', error);
    res.status(500).json({ 
      error: 'Error al obtener estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/estimates/:id - Actualizar un estimado
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id || null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'ID de estimado inválido' });
    }
    
    console.log('Actualizando estimado:', estimateId, 'para usuario:', userId);
    
    // Verificar que el estimado existe y pertenece al usuario
    const existingEstimate = await storage.getEstimate(estimateId);
    
    if (!existingEstimate) {
      return res.status(404).json({ error: 'Estimado no encontrado' });
    }
    
    if (existingEstimate.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Actualizar estimado
    const updatedEstimate = await storage.updateEstimate(estimateId, req.body);
    
    console.log('Estimado actualizado exitosamente:', estimateId);
    
    res.json(updatedEstimate);
  } catch (error) {
    console.error('Error al actualizar estimado:', error);
    res.status(500).json({ 
      error: 'Error al actualizar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// DELETE /api/estimates/:id - Eliminar un estimado
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id || null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'ID de estimado inválido' });
    }
    
    console.log('Eliminando estimado:', estimateId, 'para usuario:', userId);
    
    // Verificar que el estimado existe y pertenece al usuario
    const existingEstimate = await storage.getEstimate(estimateId);
    
    if (!existingEstimate) {
      return res.status(404).json({ error: 'Estimado no encontrado' });
    }
    
    if (existingEstimate.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Eliminar estimado
    await storage.deleteEstimate(estimateId);
    
    console.log('Estimado eliminado exitosamente:', estimateId);
    
    res.json({ message: 'Estimado eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar estimado:', error);
    res.status(500).json({ 
      error: 'Error al eliminar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/estimates/:id/update-status - Actualizar estado del estimado
router.post('/:id/update-status', requireAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = mappingResult?.id || null;
    }
    if (!userId) {
      return res.status(500).json({ error: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Operating with REAL user_id: ${userId}`);
    const estimateId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'ID de estimado inválido' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Estado requerido' });
    }
    
    console.log('Actualizando estado del estimado:', estimateId, 'a:', status);
    
    // Verificar que el estimado existe y pertenece al usuario
    const existingEstimate = await storage.getEstimate(estimateId);
    
    if (!existingEstimate) {
      return res.status(404).json({ error: 'Estimado no encontrado' });
    }
    
    if (existingEstimate.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Actualizar estado
    const updatedEstimate = await storage.updateEstimate(estimateId, { 
      status,
      ...(status === 'sent' && { sentDate: new Date() }),
      ...(status === 'approved' && { approvedDate: new Date() })
    });
    
    console.log('Estado del estimado actualizado exitosamente');
    
    res.json(updatedEstimate);
  } catch (error) {
    console.error('Error al actualizar estado del estimado:', error);
    res.status(500).json({ 
      error: 'Error al actualizar estado del estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;