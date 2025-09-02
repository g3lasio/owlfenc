/**
 * API Routes para el sistema de búsquedas (Property & Permits)
 * USANDO SOLO FIREBASE - NO PostgreSQL
 */

import express from 'express';
import { z } from 'zod';
import { verifyFirebaseAuth as requireAuth } from '../middleware/firebase-auth';
import { firebaseSearchService } from '../services/firebaseSearchService';

const router = express.Router();

// Schema de validación para búsqueda de propiedad
const propertySearchSchema = z.object({
  address: z.string().min(1, "Dirección requerida"),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional()
});

// Schema de validación para búsqueda de permisos
const permitSearchSchema = z.object({
  query: z.string().min(1, "Query requerido"),
  jurisdiction: z.string().optional(),
  permitType: z.string().optional(),
  projectType: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional()
});

// GET /api/search/property/history - Obtener historial de búsquedas de propiedad
router.get('/property/history', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🏠 [SEARCH-API] Obteniendo historial de búsquedas de propiedad para usuario:', userId);
    
    const history = await firebaseSearchService.getPropertySearchHistory(userId, {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string
    });
    
    console.log(`✅ [SEARCH-API] Encontradas ${history.length} búsquedas de propiedad`);
    
    res.json(history);
  } catch (error) {
    console.error('❌ [SEARCH-API] Error al obtener historial de propiedad:', error);
    res.status(500).json({ 
      error: 'Error al obtener historial de búsquedas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/search/permits/history - Obtener historial de búsquedas de permisos
router.get('/permits/history', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('📋 [SEARCH-API] Obteniendo historial de búsquedas de permisos para usuario:', userId);
    
    const history = await firebaseSearchService.getPermitSearchHistory(userId, {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string,
      jurisdiction: req.query.jurisdiction as string
    });
    
    console.log(`✅ [SEARCH-API] Encontradas ${history.length} búsquedas de permisos`);
    
    res.json(history);
  } catch (error) {
    console.error('❌ [SEARCH-API] Error al obtener historial de permisos:', error);
    res.status(500).json({ 
      error: 'Error al obtener historial de búsquedas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/search/property - Realizar búsqueda de propiedad
router.post('/property', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('🏠 [SEARCH-API] Nueva búsqueda de propiedad para usuario:', userId);
    
    // Validar datos
    const validationResult = propertySearchSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Datos de búsqueda inválidos',
        details: validationResult.error.format()
      });
    }
    
    const { address, city, state, zipCode } = validationResult.data;
    
    // Verificar si existe en caché
    const cached = await firebaseSearchService.findCachedPropertySearch(address, userId);
    
    if (cached) {
      console.log('✅ [SEARCH-API] Búsqueda encontrada en caché');
      return res.json({
        ...cached,
        fromCache: true
      });
    }
    
    // Crear nueva búsqueda
    const newSearch = await firebaseSearchService.createPropertySearch({
      userId,
      searchType: 'property',
      address,
      city,
      state,
      zipCode,
      status: 'pending'
    });
    
    // Aquí normalmente harías la llamada a la API externa
    // Por ahora simulamos resultados
    const mockResults = {
      ownerName: 'John Doe',
      assessedValue: 450000,
      yearBuilt: 2005,
      squareFeet: 2500,
      lotSize: 7500,
      propertyType: 'Single Family Residence',
      searchResults: {
        parcelNumber: 'APN-123-456-789',
        taxInfo: {
          annualTax: 5400,
          taxYear: 2024
        }
      }
    };
    
    // Actualizar con resultados
    await firebaseSearchService.updatePropertySearchResults(
      newSearch.id!,
      userId,
      {
        ...mockResults,
        status: 'completed'
      }
    );
    
    console.log('✅ [SEARCH-API] Búsqueda de propiedad completada, ID:', newSearch.id);
    
    res.json({
      ...newSearch,
      ...mockResults,
      status: 'completed'
    });
  } catch (error) {
    console.error('❌ [SEARCH-API] Error en búsqueda de propiedad:', error);
    res.status(500).json({ 
      error: 'Error al realizar búsqueda de propiedad',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/search/permits - Realizar búsqueda de permisos
router.post('/permits', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log('📋 [SEARCH-API] Nueva búsqueda de permisos para usuario:', userId);
    
    // Validar datos
    const validationResult = permitSearchSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Datos de búsqueda inválidos',
        details: validationResult.error.format()
      });
    }
    
    const data = validationResult.data;
    
    // Verificar si existe en caché
    if (data.jurisdiction) {
      const cached = await firebaseSearchService.findCachedPermitSearch(
        data.query,
        data.jurisdiction,
        userId
      );
      
      if (cached) {
        console.log('✅ [SEARCH-API] Búsqueda encontrada en caché');
        return res.json({
          ...cached,
          fromCache: true
        });
      }
    }
    
    // Crear nueva búsqueda
    const newSearch = await firebaseSearchService.createPermitSearch({
      userId,
      searchType: 'permit',
      query: data.query,
      jurisdiction: data.jurisdiction,
      permitType: data.permitType,
      projectType: data.projectType,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      status: 'pending'
    });
    
    // Aquí normalmente harías la búsqueda real
    // Por ahora simulamos resultados
    const mockResults = {
      resultsCount: 5,
      requirements: [
        'Building permit application',
        'Site plan',
        'Construction drawings',
        'Engineering calculations',
        'Contractor license'
      ],
      fees: [
        { type: 'Building Permit', amount: 1500, description: 'Base permit fee' },
        { type: 'Plan Check', amount: 800, description: 'Plan review fee' },
        { type: 'Inspection', amount: 300, description: 'Inspection fees' }
      ],
      estimatedProcessingTime: '15-20 business days',
      searchResults: {
        permitTypes: ['Building', 'Electrical', 'Plumbing', 'Mechanical'],
        contactInfo: {
          department: 'Building & Safety',
          phone: '(555) 123-4567',
          email: 'permits@city.gov'
        }
      }
    };
    
    // Actualizar con resultados
    await firebaseSearchService.updatePermitSearchResults(
      newSearch.id!,
      userId,
      {
        ...mockResults,
        status: 'completed'
      }
    );
    
    console.log('✅ [SEARCH-API] Búsqueda de permisos completada, ID:', newSearch.id);
    
    res.json({
      ...newSearch,
      ...mockResults,
      status: 'completed'
    });
  } catch (error) {
    console.error('❌ [SEARCH-API] Error en búsqueda de permisos:', error);
    res.status(500).json({ 
      error: 'Error al realizar búsqueda de permisos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/search/property/:id - Obtener búsqueda de propiedad específica
router.get('/property/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const searchId = req.params.id;
    
    console.log(`🏠 [SEARCH-API] Obteniendo búsqueda de propiedad ${searchId}`);
    
    const search = await firebaseSearchService.getPropertySearch(searchId, userId);
    
    if (!search) {
      return res.status(404).json({ error: 'Búsqueda no encontrada' });
    }
    
    res.json(search);
  } catch (error) {
    console.error('❌ [SEARCH-API] Error al obtener búsqueda:', error);
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al obtener búsqueda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/search/permits/:id - Obtener búsqueda de permisos específica
router.get('/permits/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const searchId = req.params.id;
    
    console.log(`📋 [SEARCH-API] Obteniendo búsqueda de permisos ${searchId}`);
    
    const search = await firebaseSearchService.getPermitSearch(searchId, userId);
    
    if (!search) {
      return res.status(404).json({ error: 'Búsqueda no encontrada' });
    }
    
    res.json(search);
  } catch (error) {
    console.error('❌ [SEARCH-API] Error al obtener búsqueda:', error);
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al obtener búsqueda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// DELETE /api/search/property/:id - Eliminar búsqueda de propiedad
router.delete('/property/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const searchId = req.params.id;
    
    console.log(`🗑️ [SEARCH-API] Eliminando búsqueda de propiedad ${searchId}`);
    
    const success = await firebaseSearchService.deletePropertySearch(searchId, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Error al eliminar búsqueda' });
    }
    
    res.json({ success: true, message: 'Búsqueda eliminada exitosamente' });
  } catch (error) {
    console.error('❌ [SEARCH-API] Error al eliminar búsqueda:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Búsqueda no encontrada' });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al eliminar búsqueda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// DELETE /api/search/permits/:id - Eliminar búsqueda de permisos
router.delete('/permits/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const searchId = req.params.id;
    
    console.log(`🗑️ [SEARCH-API] Eliminando búsqueda de permisos ${searchId}`);
    
    const success = await firebaseSearchService.deletePermitSearch(searchId, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Error al eliminar búsqueda' });
    }
    
    res.json({ success: true, message: 'Búsqueda eliminada exitosamente' });
  } catch (error) {
    console.error('❌ [SEARCH-API] Error al eliminar búsqueda:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Búsqueda no encontrada' });
    }
    
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    res.status(500).json({ 
      error: 'Error al eliminar búsqueda',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// GET /api/search/stats - Obtener estadísticas de búsquedas
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    console.log(`📊 [SEARCH-API] Obteniendo estadísticas de búsquedas para usuario ${userId}`);
    
    const stats = await firebaseSearchService.getSearchStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error('❌ [SEARCH-API] Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;