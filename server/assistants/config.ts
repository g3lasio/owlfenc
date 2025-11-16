/**
 * OPENAI ASSISTANTS API - CONFIGURACIÓN
 * 
 * Sistema de configuración para OpenAI Assistants API
 * Reemplaza WebSocket/HTTP custom con SDK oficial de OpenAI
 */

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required for Assistants API');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Configuración del Assistant de Mervin
 */
export const MERVIN_ASSISTANT_CONFIG = {
  name: 'Mervin AI',
  description: 'Asistente inteligente para contratistas - gestión de estimados, contratos, permisos y más',
  model: 'gpt-4o', // Modelo más reciente y capaz
  instructions: `Eres Mervin, un asistente inteligente especializado en ayudar a contratistas con:

## Capacidades Principales
- Crear y gestionar estimados profesionales
- Generar contratos legales con firma digital
- Verificar propiedades usando Mapbox
- Obtener información de permisos de construcción
- Buscar y gestionar clientes
- Investigación web en tiempo real sobre códigos de construcción, materiales, etc.

## Personalidad
- Profesional pero amigable
- Eficiente y orientado a resultados
- Proactivo en sugerir acciones
- Explica claramente lo que estás haciendo

## Idioma
- Responde en el idioma del usuario (español o inglés)
- Adapta el tono según el contexto profesional

## Herramientas
Cuando necesites ejecutar acciones, usa las herramientas disponibles.
Confirma acciones importantes antes de ejecutarlas.`,
};

/**
 * ID del assistant (se crea/obtiene dinámicamente)
 */
let cachedAssistantId: string | null = null;

/**
 * Obtener o crear el Assistant de Mervin
 */
export async function getMervinAssistant(): Promise<string> {
  if (cachedAssistantId) {
    return cachedAssistantId;
  }

  try {
    // Buscar assistant existente por nombre
    const assistants = await openai.beta.assistants.list();
    const existing = assistants.data.find(a => a.name === MERVIN_ASSISTANT_CONFIG.name);

    if (existing) {
      console.log('🤖 [ASSISTANTS] Using existing assistant:', existing.id);
      cachedAssistantId = existing.id;
      return existing.id;
    }

    // Crear nuevo assistant (se hará después de definir tools)
    console.log('🤖 [ASSISTANTS] No existing assistant found, will create on first use');
    return '';
  } catch (error) {
    console.error('❌ [ASSISTANTS] Error getting assistant:', error);
    throw error;
  }
}

/**
 * Crear assistant con tools
 */
export async function createMervinAssistant(tools: any[]): Promise<string> {
  try {
    const assistant = await openai.beta.assistants.create({
      ...MERVIN_ASSISTANT_CONFIG,
      tools: tools,
    });

    console.log('✅ [ASSISTANTS] Created new assistant:', assistant.id);
    cachedAssistantId = assistant.id;
    return assistant.id;
  } catch (error) {
    console.error('❌ [ASSISTANTS] Error creating assistant:', error);
    throw error;
  }
}

/**
 * Actualizar assistant con nuevas tools
 */
export async function updateMervinAssistant(
  assistantId: string,
  tools: any[]
): Promise<void> {
  try {
    await openai.beta.assistants.update(assistantId, {
      tools: tools,
    });
    console.log('✅ [ASSISTANTS] Updated assistant tools:', assistantId);
  } catch (error) {
    console.error('❌ [ASSISTANTS] Error updating assistant:', error);
    throw error;
  }
}
