/**
 * Endpoint simple para autoguardado de estimados
 */

import { Router } from 'express';
import { storage } from '../storage';
import { insertProjectSchema } from '@shared/schema';

const router = Router();

// POST /api/estimates - Crear nuevo estimado y guardarlo como proyecto
router.post('/', async (req, res) => {
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

    // Preparar datos del proyecto para la base de datos
    const projectData = {
      userId: 1, // Usuario por defecto para desarrollo
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
router.get('/', async (req, res) => {
  try {
    console.log('📋 Obteniendo lista de proyectos...');
    
    // Obtener todos los proyectos (que incluyen los estimados guardados)
    const projects = await storage.getProjects();
    
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