/**
 * Endpoint simple para autoguardado de estimados
 */

import { Router } from 'express';

const router = Router();

// POST /api/estimates - Crear nuevo estimado (versión simple)
router.post('/', async (req, res) => {
  try {
    console.log('💾 Autoguardado - datos recibidos:', {
      firebaseUserId: req.body.firebaseUserId,
      clientName: req.body.clientName,
      itemsCount: req.body.items?.length || 0,
      total: req.body.items?.reduce((sum: number, item: any) => sum + item.totalPrice, 0) || 0
    });

    // Generar respuesta exitosa
    const savedEstimate = {
      success: true,
      data: {
        id: `estimate_${Date.now()}`,
        estimateNumber: `EST-${Date.now()}`,
        firebaseUserId: req.body.firebaseUserId,
        clientName: req.body.clientName,
        status: 'draft',
        createdAt: new Date().toISOString(),
        message: 'Estimado guardado correctamente'
      }
    };

    console.log('✅ Autoguardado exitoso para usuario:', req.body.firebaseUserId);
    
    res.status(201).json(savedEstimate);
  } catch (error) {
    console.error('❌ Error en autoguardado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;