
import { Express, Request, Response } from "express";
import { z } from "zod";
import { mervinEstimateService } from "../services/mervinEstimateService"; 

export function registerMervinEstimateRoutes(app: Express): void {
  // Endpoint para procesar comando de estimado a través de Mervin
  app.post('/api/mervin/estimate', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        message: z.string(),
        userId: z.number().optional(),
        context: z.record(z.any()).optional()
      });
      
      const { message, userId = 1, context = {} } = schema.parse(req.body);
      
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
