/**
 * Endpoint simple para autoguardado de estimados
 */

import { Router } from 'express';
import { storage } from '../storage';
import { insertProjectSchema } from '@shared/schema';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { UserMappingService } from '../services/UserMappingService';
import { DatabaseStorage } from '../DatabaseStorage';

// Inicializar UserMappingService
const databaseStorage = new DatabaseStorage();
const userMappingService = UserMappingService.getInstance(databaseStorage);

const router = Router();

// POST /api/estimates - Crear nuevo estimado y guardarlo como proyecto
router.post('/', verifyFirebaseAuth, async (req, res) => {
  try {
    console.log('💾 Autoguardado - datos recibidos:', {
      firebaseUserId: req.body.firebaseUserId,
      clientName: req.body.clientName,
      itemsCount: req.body.items?.length || 0,
      total: req.body.items?.reduce((sum: number, item: any) => sum + item.totalPrice, 0) || 0
    });

    // Calcular el total del estimado
    const totalPrice = req.body.items?.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0;
    
    // Generar ID único para el proyecto
    const projectId = `proj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const estimateNumber = `EST-${Date.now()}`;

    // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, message: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Creating project for REAL user_id: ${userId}`);
    
    // Preparar datos del proyecto para la base de datos
    const projectData = {
      userId: userId, // Usuario REAL autenticado
      projectId: projectId,
      clientName: req.body.clientName || 'Cliente',
      clientEmail: req.body.clientEmail || '',
      clientPhone: req.body.clientPhone || '',
      address: req.body.clientAddress || '',
      fenceType: req.body.projectType || 'fence',
      length: 0, // Se puede actualizar más tarde
      height: 0, // Se puede actualizar más tarde
      gates: [],
      additionalDetails: req.body.projectDescription || '',
      totalPrice: Math.round(totalPrice * 100), // Convertir a centavos
      status: 'draft',
      projectProgress: 'estimate_created'
    };

    console.log('💾 Guardando proyecto en base de datos:', projectData);

    // Guardar el proyecto en la base de datos
    const savedProject = await storage.createProject(projectData);

    console.log('✅ Proyecto guardado exitosamente:', savedProject.id);

    // Respuesta exitosa
    const response = {
      success: true,
      data: {
        id: `estimate_${Date.now()}`,
        estimateNumber: estimateNumber,
        projectId: projectId,
        firebaseUserId: req.body.firebaseUserId,
        clientName: req.body.clientName,
        status: 'draft',
        createdAt: new Date().toISOString(),
        message: 'Estimado guardado correctamente como proyecto'
      }
    };

    console.log('✅ Autoguardado exitoso para usuario:', req.body.firebaseUserId);
    
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error en autoguardado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/estimates - Obtener estimados/proyectos
router.get('/', verifyFirebaseAuth, async (req, res) => {
  try {
    // 🔐 SECURITY FIX: Solo obtener proyectos del usuario autenticado
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ success: false, message: 'Error creando mapeo de usuario' });
    }
    console.log(`🔐 [SECURITY] Getting projects for REAL user_id: ${userId}`);
    console.log('📋 Obteniendo lista de proyectos...');
    
    // Obtener solo los proyectos del usuario autenticado
    const projects = await storage.getProjectsByUserId(userId);
    
    console.log(`✅ Se encontraron ${projects.length} proyectos`);
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('❌ Error al obtener estimados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estimados',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;