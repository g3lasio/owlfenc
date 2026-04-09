import { Express, Request, Response } from "express";
import { secureAttomService } from "../services/secure-attom-service"; // Direct ATTOM API
import { verifyFirebaseAuth as requireAuth } from "../middleware/firebase-auth";
import { getSecureUserId } from "../utils/secureUserHelper";
import { firebaseSearchService } from "../services/firebaseSearchService";
import { productionUsageService } from "../services/productionUsageService";
import { requireCredits, deductFeatureCredits } from "../middleware/credit-check"; // 💳 PAYG pre-validation

/**
 * Esta función registra las rutas relacionadas con la obtención
 * de información de propiedades inmobiliarias
 * 
 * FIX: Migrado de attom-wrapper.replit.app (caído) a llamada directa a ATTOM API
 * usando secure-attom-service con ATTOM_API_KEY
 */
export function registerPropertyRoutes(app: Express): void {
  // Endpoint para obtener detalles de una propiedad por dirección
  // requireCredits validates BEFORE calling ATTOM API (prevents free rides)
  app.get('/api/property/details', requireAuth, requireCredits({ featureName: 'propertyVerification' }), async (req: Request, res: Response) => {
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
      const startTime = Date.now();
      let propertyData: any = null;
      let source = 'ATTOM';

      // Si se solicita explícitamente usar datos simulados
      if (useMock) {
        console.log('Usando servicio de propiedad simulado para:', address);
        const { mockPropertyService } = await import('../services/mockPropertyService');
        const mockResult = await mockPropertyService.getPropertyDetailsWithDiagnostics(address);
        propertyData = mockResult.data;
        source = 'SIMULADO';
      } else {
        // Intentar con ATTOM API directa (secure-attom-service)
        console.log('Iniciando solicitud directa a ATTOM API...');
        try {
          propertyData = await secureAttomService.getPropertyDetails(address);
          console.log('✅ ATTOM API respondió correctamente');
        } catch (attomError: any) {
          console.error('⚠️ ATTOM API falló:', attomError.message);
          // Fallback: usar datos simulados si ATTOM falla
          console.log('Recurriendo al servicio simulado como respaldo...');
          const { mockPropertyService } = await import('../services/mockPropertyService');
          const mockResult = await mockPropertyService.getPropertyDetailsWithDiagnostics(address);
          propertyData = mockResult.data;
          source = 'SIMULADO (respaldo)';
        }
      }

      const endTime = Date.now();
      console.log(`Solicitud completada en ${endTime - startTime}ms, fuente: ${source}`);

      if (!propertyData) {
        return res.status(404).json({
          message: 'No se encontró información para la dirección proporcionada'
        });
      }

      const response = {
        property: propertyData,
        source
      };

      // 🔥 Guardar en historial E incrementar contador
      try {
        const userId = req.firebaseUser?.uid;
        if (userId && response.property) {
          console.log('💾 [PROPERTY-HISTORY] Guardando búsqueda en historial para usuario:', userId);
          
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
            searchProvider: source.includes('SIMULADO') ? 'MOCK' : 'ATTOM',
            status: 'completed'
          });
          
          console.log('✅ [PROPERTY-HISTORY] Búsqueda guardada exitosamente en historial');
          
          await productionUsageService.consumeFeature(userId, 'propertyVerifications');
          console.log('✅ [PROPERTY-USAGE] Contador incrementado: propertyVerifications +1');
        }
      } catch (historyError) {
        // No fallar la petición si falla el historial/contador
        console.error('⚠️ [PROPERTY-HISTORY] Error guardando historial o incrementando contador:', historyError);
      }
      
      // 💳 Deduct credits AFTER successful response
      try {
        await deductFeatureCredits(req, address, 'Property verification details');
        console.log('✅ [PROPERTY-CREDITS] Credits deducted for propertyVerification');
      } catch (creditErr) {
        console.error('⚠️ [PROPERTY-CREDITS] Failed to deduct credits:', creditErr);
      }

      console.log('===== FIN DE SOLICITUD DE DETALLES DE PROPIEDAD =====');
      return res.json(response);
      
    } catch (error: any) {
      console.error('Error al obtener detalles de propiedad:', error);
      return res.status(500).json({
        message: 'Error interno al procesar la solicitud de detalles de propiedad',
        detail: error.message
      });
    }
  });
}
