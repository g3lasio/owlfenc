import { Request, Response } from 'express';
import { z } from 'zod';
import { promptGeneratorService } from '../services/promptGeneratorService';
import { insertPromptTemplateSchema } from '@shared/schema';

export function registerPromptTemplateRoutes(app: any) {
  // GET: Obtener todas las plantillas de prompts del usuario
  app.get('/api/prompt-templates', async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el ID del usuario de la sesión
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 1;
      
      const templates = await promptGeneratorService.getPromptTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching prompt templates:', error);
      res.status(500).json({ message: 'Error obteniendo plantillas de prompts' });
    }
  });
  
  // GET: Obtener plantillas de prompts por categoría
  app.get('/api/prompt-templates/category/:category', async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el ID del usuario de la sesión
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 1;
      const category = req.params.category;
      
      // Validar la categoría
      if (!category) {
        return res.status(400).json({ message: 'Categoría no especificada' });
      }
      
      const templates = await promptGeneratorService.getPromptTemplatesByCategory(userId, category);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching prompt templates by category:', error);
      res.status(500).json({ message: 'Error obteniendo plantillas de prompts' });
    }
  });
  
  // GET: Obtener plantilla predeterminada por categoría
  app.get('/api/prompt-templates/default/:category', async (req: Request, res: Response) => {
    try {
      // En una aplicación real, obtendríamos el ID del usuario de la sesión
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 1;
      const category = req.params.category;
      
      // Validar la categoría
      if (!category) {
        return res.status(400).json({ message: 'Categoría no especificada' });
      }
      
      const template = await promptGeneratorService.getDefaultPromptTemplate(userId, category);
      
      if (template) {
        res.json(template);
      } else {
        res.status(404).json({ message: 'No se encontró una plantilla predeterminada para esta categoría' });
      }
    } catch (error) {
      console.error('Error fetching default prompt template:', error);
      res.status(500).json({ message: 'Error obteniendo plantilla predeterminada' });
    }
  });
  
  // GET: Obtener una plantilla específica por ID
  app.get('/api/prompt-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
      }
      
      const template = await promptGeneratorService.getPromptTemplate(id);
      
      if (template) {
        res.json(template);
      } else {
        res.status(404).json({ message: 'Plantilla no encontrada' });
      }
    } catch (error) {
      console.error('Error fetching prompt template:', error);
      res.status(500).json({ message: 'Error obteniendo plantilla de prompt' });
    }
  });
  
  // POST: Crear una nueva plantilla
  app.post('/api/prompt-templates', async (req: Request, res: Response) => {
    try {
      // Validar los datos de entrada
      const validationSchema = insertPromptTemplateSchema.extend({
        isDefault: z.boolean().optional().default(false)
      });
      
      const validatedData = validationSchema.parse(req.body);
      
      // Crear la plantilla
      const newTemplate = await promptGeneratorService.createPromptTemplate(validatedData);
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error('Error creating prompt template:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos de entrada inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error creando plantilla de prompt' });
    }
  });
  
  // PUT: Actualizar una plantilla existente
  app.put('/api/prompt-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
      }
      
      // Verificar que la plantilla existe
      const existingTemplate = await promptGeneratorService.getPromptTemplate(id);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Plantilla no encontrada' });
      }
      
      // Actualizar la plantilla
      const updatedTemplate = await promptGeneratorService.updatePromptTemplate(id, req.body);
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating prompt template:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos de entrada inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error actualizando plantilla de prompt' });
    }
  });
  
  // DELETE: Eliminar una plantilla
  app.delete('/api/prompt-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
      }
      
      // Verificar que la plantilla existe
      const existingTemplate = await promptGeneratorService.getPromptTemplate(id);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Plantilla no encontrada' });
      }
      
      // Eliminar la plantilla
      await promptGeneratorService.deletePromptTemplate(id);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting prompt template:', error);
      res.status(500).json({ message: 'Error eliminando plantilla de prompt' });
    }
  });

  // POST: Generar un prompt completo para un proyecto
  app.post('/api/prompt-templates/generate', async (req: Request, res: Response) => {
    try {
      // Validar los datos de entrada
      const schema = z.object({
        projectData: z.record(z.any()),
        userId: z.number().default(1),
        basePromptId: z.number().optional(),
        customInstructions: z.string().optional()
      });
      
      const validatedData = schema.parse(req.body);
      
      // Generar el prompt completo
      const prompt = await promptGeneratorService.generateCompletedPrompt(
        validatedData.projectData,
        {
          userId: validatedData.userId,
          basePromptId: validatedData.basePromptId,
          customInstructions: validatedData.customInstructions
        }
      );
      
      res.json({ prompt });
    } catch (error) {
      console.error('Error generating prompt:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos de entrada inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error generando prompt' });
    }
  });

  // POST: Generar un estimado usando el prompt
  app.post('/api/prompt-templates/estimate', async (req: Request, res: Response) => {
    try {
      // Validar los datos de entrada
      const schema = z.object({
        prompt: z.string(),
        format: z.enum(['json', 'text']).default('json')
      });
      
      const validatedData = schema.parse(req.body);
      
      // Generar el estimado
      const estimate = await promptGeneratorService.generateEstimateWithPrompt(
        validatedData.prompt,
        validatedData.format
      );
      
      res.json(estimate);
    } catch (error) {
      console.error('Error generating estimate:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos de entrada inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error generando estimado' });
    }
  });
}