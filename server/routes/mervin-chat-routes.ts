import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { mervinChatService } from '../services/mervinChatService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';

const router = Router();

// Middleware for all routes - require authentication
router.use(verifyFirebaseAuth);

// Validation schemas
const createSessionSchema = z.object({
  mode: z.enum(['mervin', 'mervin_agent'])
});

const sendMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1),
  mode: z.enum(['mervin', 'mervin_agent']).optional()
});

const onboardingSchema = z.object({
  step: z.number().int().min(0).max(10),
  response: z.string()
});

// User Profile Routes
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const profile = await mervinChatService.getUserProfile(firebaseUid);
    
    res.json({
      success: true,
      profile: profile || null
    });
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil del usuario'
    });
  }
});

router.post('/profile', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const updates = req.body;
    const profile = await mervinChatService.updateUserProfile(firebaseUid, updates);
    
    res.json({
      success: true,
      profile
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el perfil del usuario'
    });
  }
});

// Onboarding Routes
router.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { step, response } = onboardingSchema.parse(req.body);
    const result = await mervinChatService.processOnboarding(firebaseUid, step, response);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Error processing onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el proceso de configuración inicial'
    });
  }
});

// Chat Session Routes
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { mode } = createSessionSchema.parse(req.body);
    const session = await mervinChatService.createChatSession(firebaseUid, mode);
    
    res.json({
      success: true,
      session
    });
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la sesión de chat'
    });
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const sessions = await mervinChatService.getUserActiveSessions(firebaseUid);
    
    res.json({
      success: true,
      sessions
    });
  } catch (error: any) {
    console.error('Error getting chat sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las sesiones de chat'
    });
  }
});

router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await mervinChatService.getChatSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error: any) {
    console.error('Error getting chat session:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la sesión de chat'
    });
  }
});

router.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = await mervinChatService.getSessionMessages(sessionId);
    
    res.json({
      success: true,
      messages
    });
  } catch (error: any) {
    console.error('Error getting session messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los mensajes de la sesión'
    });
  }
});

// Chat Message Processing Routes
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { sessionId, message, mode } = sendMessageSchema.parse(req.body);
    
    console.log(`🤖 [MERVIN-CHAT] Processing message for session ${sessionId} in mode: ${mode || 'inferred'}`);
    
    const result = await mervinChatService.processChat(sessionId, message, firebaseUid);
    
    // If there are tool calls in agent mode, execute them
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log(`🔧 [MERVIN-AGENT] Executing ${result.toolCalls.length} tool calls`);
      
      const toolResults = [];
      for (const toolCall of result.toolCalls) {
        try {
          const toolResult = await mervinChatService.executeToolCall(
            toolCall,
            sessionId,
            toolCall.id,
            firebaseUid
          );
          toolResults.push({
            toolCallId: toolCall.id,
            success: true,
            result: toolResult
          });
        } catch (toolError: any) {
          console.error(`❌ [MERVIN-AGENT] Tool call failed:`, toolError);
          toolResults.push({
            toolCallId: toolCall.id,
            success: false,
            error: toolError.message
          });
        }
      }
      
      res.json({
        success: true,
        response: result.response,
        toolCalls: result.toolCalls,
        toolResults
      });
    } else {
      res.json({
        success: true,
        response: result.response
      });
    }
  } catch (error: any) {
    console.error('Error processing chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el mensaje'
    });
  }
});

// Agent Action History Routes
router.get('/actions', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const actions = await mervinChatService.getUserRecentActions(firebaseUid, limit);
    
    res.json({
      success: true,
      actions
    });
  } catch (error: any) {
    console.error('Error getting user actions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial de acciones'
    });
  }
});

// Mode switching utility route
router.post('/switch-mode', async (req: Request, res: Response) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { sessionId, newMode } = z.object({
      sessionId: z.string(),
      newMode: z.enum(['mervin', 'mervin_agent'])
    }).parse(req.body);

    // Create a new session with the new mode
    const newSession = await mervinChatService.createChatSession(firebaseUid, newMode);
    
    res.json({
      success: true,
      newSession,
      message: `Cambiado al modo ${newMode === 'mervin_agent' ? 'Mervin Agent' : 'Mervin'}`
    });
  } catch (error: any) {
    console.error('Error switching mode:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar de modo'
    });
  }
});

// Health check route
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'mervin-chat',
    timestamp: new Date().toISOString(),
    modes: ['mervin', 'mervin_agent']
  });
});

export default router;