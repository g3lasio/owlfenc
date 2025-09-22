
import { Express, Request, Response } from "express";
import { z } from "zod";
import { mervinEstimateService } from "../services/mervinEstimateService";
import { verifyFirebaseAuth } from "../middleware/firebase-auth";
import { userMappingService } from "../services/userMappingService"; 

export function registerMervinEstimateRoutes(app: Express): void {
  // Endpoint para procesar comando de estimado a través de Mervin
  app.post('/api/mervin/estimate', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        message: z.string(),
        userId: z.number().optional(),
        context: z.record(z.any()).optional()
      });
      
      const parsedBody = schema.parse(req.body);
      
      // 🔐 SECURITY FIX: Usar user_id real del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ type: "error", message: "Usuario no autenticado" });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
        userId = mappingResult?.id || null;
      }
      if (!userId) {
        return res.status(500).json({ type: "error", message: "Error creando mapeo de usuario" });
      }
      console.log(`🔐 [SECURITY] Processing Mervin estimate for REAL user_id: ${userId}`);
      
      const { message, context = {} } = parsedBody;
      
      const result = await mervinEstimateService.processEstimateCommand(message, {
        userId,
        ...context
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error procesando comando de estimado:', error);
      res.status(400).json({
        type: "error",
        message: "No se pudo procesar el comando de estimado"
      });
    }
  });
  
  // Endpoint para convertir estimado a HTML
  app.post('/api/mervin/estimate/html', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        estimateData: z.record(z.any()),
        templateId: z.number().optional()
      });
      
      const { estimateData, templateId } = schema.parse(req.body);
      
      // Utilizar el servicio compartido para generar HTML
      const { sharedEstimateService } = await import('../services/sharedEstimateService');
      const html = await sharedEstimateService.generateEstimateHtml(estimateData, templateId);
      
      res.json({ html });
    } catch (error) {
      console.error('Error generando HTML del estimado:', error);
      res.status(500).json({ message: 'Error generando HTML del estimado' });
    }
  });
}
