import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { promptGeneratorService } from "../services/promptGeneratorService";
import { InsertPromptTemplate } from "@shared/schema";
import { verifyFirebaseAuth } from "../middleware/firebase-auth";
import { UserMappingService, userMappingService } from "../services/userMappingService";
import { DatabaseStorage } from "../DatabaseStorage";

// Use the singleton instance directly
// const databaseStorage = new DatabaseStorage();
// const userMappingService = UserMappingService.getInstance(databaseStorage);

export function registerPromptTemplateRoutes(app: Express): void {
  // Obtener todas las plantillas de prompts
  app.get('/api/prompt-templates', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      // 🔐 SECURITY FIX: Solo obtener templates del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Getting prompt templates for REAL user_id: ${userId}`);
      
      // Obtener todas las plantillas de prompts del usuario
      const templates = await promptGeneratorService.getPromptTemplatesByCategory(userId, 'all');
      
      res.json(templates);
    } catch (error) {
      console.error('Error al obtener plantillas de prompts:', error);
      res.status(500).json({ message: 'Error al obtener plantillas de prompts' });
    }
  });
  
  // Obtener plantillas de prompts por categoría
  app.get('/api/prompt-templates/category/:category', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      // 🔐 SECURITY FIX: Solo obtener templates del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Getting category templates for REAL user_id: ${userId}`);
      
      // Obtener plantillas de la categoría especificada
      const templates = await promptGeneratorService.getPromptTemplatesByCategory(userId, category);
      
      res.json(templates);
    } catch (error) {
      console.error(`Error al obtener plantillas de prompts para categoría ${req.params.category}:`, error);
      res.status(500).json({ message: 'Error al obtener plantillas de prompts' });
    }
  });
  
  // Obtener una plantilla de prompt por ID
  app.get('/api/prompt-templates/:id', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
      }
      
      // 🔐 SECURITY FIX: Verificar ownership del template
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Getting template for REAL user_id: ${userId}`);
      
      // Obtener plantilla
      const template = await promptGeneratorService.getPromptTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Plantilla no encontrada' });
      }
      
      // 🔒 SECURITY: Solo permitir acceso a templates propias o del sistema
      if (template.userId !== userId && template.userId !== 1) {
        return res.status(403).json({ message: 'Acceso denegado - template no pertenece al usuario' });
      }
      
      res.json(template);
    } catch (error) {
      console.error(`Error al obtener plantilla de prompt ${req.params.id}:`, error);
      res.status(500).json({ message: 'Error al obtener plantilla de prompt' });
    }
  });
  
  // Obtener plantilla predeterminada por categoría
  app.get('/api/prompt-templates/default/:category', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      // 🔐 SECURITY FIX: Solo obtener templates del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Getting default template for REAL user_id: ${userId}`);
      
      // Obtener plantilla predeterminada
      const template = await promptGeneratorService.getDefaultPromptTemplate(userId, category);
      
      if (!template) {
        return res.status(404).json({ message: 'No se encontró plantilla predeterminada para esta categoría' });
      }
      
      res.json(template);
    } catch (error) {
      console.error(`Error al obtener plantilla predeterminada para categoría ${req.params.category}:`, error);
      res.status(500).json({ message: 'Error al obtener plantilla predeterminada' });
    }
  });
  
  // Crear una nueva plantilla de prompt
  app.post('/api/prompt-templates', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number().optional(),
        name: z.string().min(1, "Se requiere un nombre"),
        category: z.string().min(1, "Se requiere una categoría"),
        promptText: z.string().min(1, "Se requiere contenido del prompt"),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
        variables: z.array(z.string()).optional()
      });
      
      // Validar datos
      const validatedData = schema.parse(req.body);
      
      // 🔐 SECURITY FIX: Crear template para usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Creating template for REAL user_id: ${userId}`);
      
      // Crear objeto para inserción
      const insertData: InsertPromptTemplate = {
        userId: userId,
        name: validatedData.name,
        category: validatedData.category,
        promptText: validatedData.promptText,
        description: validatedData.description || null,
        isDefault: validatedData.isDefault || false,
        variables: validatedData.variables || []
      };
      
      // Crear plantilla
      const newTemplate = await promptGeneratorService.createPromptTemplate(insertData);
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error('Error al crear plantilla de prompt:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error al crear plantilla de prompt' });
    }
  });
  
  // Actualizar una plantilla de prompt
  app.put('/api/prompt-templates/:id', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
      }
      
      const schema = z.object({
        name: z.string().min(1, "Se requiere un nombre").optional(),
        category: z.string().min(1, "Se requiere una categoría").optional(),
        promptText: z.string().min(1, "Se requiere contenido del prompt").optional(),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
        variables: z.array(z.string()).optional()
      });
      
      // Validar datos
      const validatedData = schema.parse(req.body);
      
      // 🔐 SECURITY FIX: Verificar ownership antes de actualizar
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Updating template for REAL user_id: ${userId}`);
      
      // Obtener la plantilla existente
      const existingTemplate = await promptGeneratorService.getPromptTemplate(id);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Plantilla no encontrada' });
      }
      
      // 🔒 SECURITY: Solo permitir actualizar templates propias
      if (existingTemplate.userId !== userId && existingTemplate.userId !== 1) {
        return res.status(403).json({ message: 'Acceso denegado - template no pertenece al usuario' });
      }
      
      // Actualizar plantilla
      const updatedTemplate = await promptGeneratorService.updatePromptTemplate(id, validatedData);
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error(`Error al actualizar plantilla de prompt ${req.params.id}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error al actualizar plantilla de prompt' });
    }
  });
  
  // Eliminar una plantilla de prompt
  app.delete('/api/prompt-templates/:id', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID inválido' });
      }
      
      // 🔐 SECURITY FIX: Verificar ownership antes de eliminar
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Deleting template for REAL user_id: ${userId}`);
      
      // Verificar que la plantilla existe
      const template = await promptGeneratorService.getPromptTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Plantilla no encontrada' });
      }
      
      // 🔒 SECURITY: Solo permitir eliminar templates propias (no del sistema)
      if (template.userId !== userId) {
        return res.status(403).json({ message: 'Acceso denegado - no puede eliminar templates del sistema o de otros usuarios' });
      }
      
      // Eliminar plantilla
      const success = await promptGeneratorService.deletePromptTemplate(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: 'Error al eliminar plantilla' });
      }
    } catch (error) {
      console.error(`Error al eliminar plantilla de prompt ${req.params.id}:`, error);
      res.status(500).json({ message: 'Error al eliminar plantilla de prompt' });
    }
  });
  
  // Generar un prompt completo a partir de datos del proyecto
  app.post('/api/prompt-templates/generate', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number().optional(),
        projectData: z.record(z.any()),
        category: z.string()
      });
      
      // Validar datos
      const parsedData = schema.parse(req.body);
      
      // 🔐 SECURITY FIX: Usar userId del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ message: 'Error creando mapeo de usuario' });
      }
      console.log(`🔐 [SECURITY] Generating prompt for REAL user_id: ${userId}`);
      
      const { projectData, category } = parsedData;
      
      // Generar prompt
      const prompt = await promptGeneratorService.generatePromptForProject(userId, projectData, category);
      
      res.json({ prompt });
    } catch (error) {
      console.error('Error al generar prompt:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error al generar prompt' });
    }
  });
  
  // Procesar un prompt con OpenAI para obtener una estimación
  app.post('/api/prompt-templates/process', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        prompt: z.string().min(1, "Se requiere un prompt"),
        systemInstructions: z.string().optional()
      });
      
      // Validar datos
      const { prompt, systemInstructions } = schema.parse(req.body);
      
      // Procesar prompt con IA
      const result = await promptGeneratorService.processPromptWithAI(prompt, systemInstructions);
      
      res.json(result);
    } catch (error) {
      console.error('Error al procesar prompt con IA:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Datos inválidos',
          errors: error.errors
        });
      }
      
      res.status(500).json({ message: 'Error al procesar prompt con IA' });
    }
  });
}