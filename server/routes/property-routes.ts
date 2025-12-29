import { Express, Request, Response } from "express";
import { propertyService } from "../services/propertyService";
import { verifyFirebaseAuth as requireAuth } from "../middleware/firebase-auth";
import { getSecureUserId } from "../utils/secureUserHelper";
import { firebaseSearchService } from "../services/firebaseSearchService";
import { productionUsageService } from "../services/productionUsageService";

/**
 * Esta función registra las rutas relacionadas con la obtención
 * de información de propiedades inmobiliarias
 */
export function registerPropertyRoutes(app: Express): void {
  // Endpoint para obtener detalles de una propiedad por dirección
  app.get('/api/property/details', requireAuth, async (req: Request, res: Response) => {
    const address = req.query.address as string;
    const useMock = req.query.mock === 'true' || false;
    
    if (!address) {
      return res.status(400).json({ 
        message: 'Se requiere el parámetro "address"' 
      });
    }
    
    console.log('===== INICIO DE SOLICITUD DE DETALLES DE PROPIEDAD =====');
    console.log('Solicitando datos de propiedad para dirección:', address);
    
    try {
      let result: any;
      const startTime = Date.now();
      
      // Si se solicita explícitamente usar datos simulados o estamos en modo desarrollo
      if (useMock || process.env.NODE_ENV === 'development') {
        console.log('Usando servicio de propiedad simulado para:', address);
        // Importar dinámicamente para evitar dependencia circular
        const { mockPropertyService } = await import('../services/mockPropertyService');
        result = await mockPropertyService.getPropertyDetailsWithDiagnostics(address);
      } else {
        console.log('Iniciando solicitud al wrapper de ATTOM API...');
        // Usar el nuevo método con diagnósticos para obtener información más detallada
        try {
          result = await propertyService.getPropertyDetailsWithDiagnostics(address);
        } catch (apiError) {
          console.log('Error en servicio principal, recurriendo al servicio simulado');
          // Si el servicio principal falla, usar el servicio simulado como respaldo
          const { mockPropertyService } = await import('../services/mockPropertyService');
          result = await mockPropertyService.getPropertyDetailsWithDiagnostics(address);
        }
      }
      
      const endTime = Date.now();
      
      console.log(`Solicitud completada en ${endTime - startTime}ms con estado: ${result.status || 'SUCCESS'}`);
      
      // Incluir información diagnóstica en logs para depuración
      console.log(`Diagnóstico de la solicitud: ${JSON.stringify({
        status: result.status || 'SUCCESS',
        parsedAddress: result.diagnostics?.parsedAddress || 'disponible',
        errorType: result.error?.type,
        processingTime: endTime - startTime
      })}`);
      
      if (result.status === 'ERROR') {
        console.log('Error en la solicitud:', result.error);
        return res.status(404).json({
          message: 'No se encontró información para la dirección proporcionada'
        });
      }
      
      // Preparar respuesta para el cliente
      const response = {
        property: result.data || result.property, // Compatibilidad con ambos formatos de respuesta
        source: result.diagnostics?.source === 'mock_data' ? 'SIMULADO' : 'ATTOM'
      };
      
      // 🔥 INTEGRACIÓN COMPLETA: Guardar en historial E incrementar contador
      // Esto asegura que tanto búsquedas manuales como de Mervin se registren igual
      try {
        const userId = req.firebaseUser?.uid;
        if (userId && response.property) {
          console.log('💾 [PROPERTY-HISTORY] Guardando búsqueda en historial para usuario:', userId);
          
          // 1️⃣ GUARDAR EN HISTORIAL DE FIREBASE
          await firebaseSearchService.createPropertySearch({
            userId,
            searchType: 'property',
            address: address,
            ownerName: response.property.owner,
            parcelNumber: response.property.parcelNumber,
            assessedValue: response.property.assessedValue,
            yearBuilt: response.property.yearBuilt,
            squareFeet: response.property.sqft,
            lotSize: response.property.lotSize,
            propertyType: response.property.propertyType,
            searchResults: response.property,
            searchProvider: result.diagnostics?.source === 'mock_data' ? 'MOCK' : 'ATTOM',
            status: 'completed'
          });
          
          console.log('✅ [PROPERTY-HISTORY] Búsqueda guardada exitosamente en historial');
          
          // 2️⃣ INCREMENTAR CONTADOR DE USO (Firebase Firestore)
          await productionUsageService.consumeFeature(userId, 'propertyVerifications');
          
          console.log('✅ [PROPERTY-USAGE] Contador incrementado: propertyVerifications +1');
        }
      } catch (historyError) {
        // No fallar la petición si falla el historial/contador
        console.error('⚠️ [PROPERTY-HISTORY] Error guardando historial o incrementando contador:', historyError);
      }
      
      console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====');
      return res.json(response);
      
    } catch (error) {
      console.error('Error al obtener detalles de propiedad:', error);
      // Usar servicio simulado como último recurso
      try {
        const { mockPropertyService } = await import('../services/mockPropertyService');
        const mockResult = await mockPropertyService.getPropertyDetailsWithDiagnostics(address);
        
        return res.json({
          property: mockResult.data,
          source: 'SIMULADO (respaldo)'
        });
      } catch (fallbackError) {
        return res.status(500).json({
          message: 'Error interno al procesar la solicitud de detalles de propiedad'
        });
      }
    }
  });
}