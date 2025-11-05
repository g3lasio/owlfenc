import express from 'express';
import { ConversationService } from '../services/conversation-service';
import { OpenAI } from 'openai';
import { adminAuth } from '../firebase-admin';
import type { 
  ConversationMessage,
  UpdateConversation 
} from '../../shared/schema';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware to verify Firebase authentication with real token
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - missing token',
      });
    }

    const token = authHeader.substring(7);
    
    // Verify Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Set verified userId from token (NOT from request body)
    req.userId = decodedToken.uid;
    
    console.log(`🔐 [CONVERSATIONS] Authenticated request from: ${decodedToken.email}`);
    next();
  } catch (error) {
    console.error('❌ [CONVERSATIONS] Auth error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
    });
  }
};

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { messages, title, aiModel, category } = req.body;
    const userId = req.userId!; // From verified token, NOT request body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages are required',
      });
    }

    // Convert timestamp strings to Date objects
    const parsedMessages: ConversationMessage[] = messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    const conversation = await ConversationService.createConversation(
      userId,
      parsedMessages,
      title || 'Nueva Conversación',
      aiModel || 'chatgpt',
      category || 'general'
    );

    // Return conversation with ISO string timestamps for serialization
    res.json({
      success: true,
      conversation: {
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        lastActivityAt: conversation.lastActivityAt.toISOString(),
        messages: conversation.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Create error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
    });
  }
});

/**
 * GET /api/conversations
 * List all conversations for a user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!; // From verified token
    const limit = parseInt(req.query.limit as string) || 30;
    const category = req.query.category as string;

    const conversations = await ConversationService.listConversations(userId, limit, category);

    // Normalize timestamps to ISO strings
    const serializedConversations = conversations.map(conv => ({
      ...conv,
      lastActivityAt: conv.lastActivityAt.toISOString(),
    }));

    res.json({
      success: true,
      conversations: serializedConversations,
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list conversations',
    });
  }
});

/**
 * GET /api/conversations/:id
 * Get a specific conversation
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!; // From verified token
    const conversationId = req.params.id;

    const conversation = await ConversationService.getConversation(conversationId, userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    // Normalize timestamps to ISO strings
    res.json({
      success: true,
      conversation: {
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        lastActivityAt: conversation.lastActivityAt.toISOString(),
        messages: conversation.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation',
    });
  }
});

/**
 * PATCH /api/conversations/:id
 * Update conversation (title, pin, category)
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!; // From verified token
    const conversationId = req.params.id;
    const updates: UpdateConversation = req.body;

    const success = await ConversationService.updateConversation(conversationId, userId, updates);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or unauthorized',
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation',
    });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Add messages to existing conversation
 */
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!; // From verified token
    const conversationId = req.params.id;
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages are required',
      });
    }

    // Convert timestamp strings to Date objects
    const parsedMessages: ConversationMessage[] = messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));

    const success = await ConversationService.addMessages(conversationId, userId, parsedMessages);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or unauthorized',
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Add messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add messages',
    });
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!; // From verified token
    const conversationId = req.params.id;

    const success = await ConversationService.deleteConversation(conversationId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or unauthorized',
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
    });
  }
});

/**
 * POST /api/conversations/generate-title
 * Generate automatic title for conversation using ChatGPT-4o
 */
router.post('/generate-title', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!; // From verified token (not used but verified)
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages are required',
      });
    }

    // Get first 2-3 messages for context
    const contextMessages = messages.slice(0, 3);
    const conversationContext = contextMessages
      .map((msg: any) => `${msg.sender === 'user' ? 'Usuario' : 'Mervin'}: ${msg.text}`)
      .join('\n');

    // Generate title with ChatGPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que genera títulos cortos y descriptivos para conversaciones. El título debe ser en español, máximo 40 caracteres, y capturar la esencia de la conversación. Ejemplos: "Estimado cerca vinyl", "Contrato instalación", "Permiso construcción", "Verificar propiedad".',
        },
        {
          role: 'user',
          content: `Genera un título corto para esta conversación:\n\n${conversationContext}`,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const title = completion.choices[0]?.message?.content?.trim() || 'Nueva Conversación';

    console.log(`🏷️ [CONVERSATION] Generated title: "${title}"`);

    res.json({
      success: true,
      title,
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Generate title error:', error);
    
    // Fallback: use first user message
    const firstUserMessage = req.body.messages?.find((msg: any) => msg.sender === 'user');
    const fallbackTitle = firstUserMessage?.text?.substring(0, 40) || 'Nueva Conversación';

    res.json({
      success: true,
      title: fallbackTitle,
    });
  }
});

/**
 * GET /api/conversations/count
 * Get conversation count for user (for subscription limits)
 */
router.get('/stats/count', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const count = await ConversationService.getConversationCount(userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation count',
    });
  }
});

/**
 * POST /api/conversations/cleanup
 * Clean old conversations based on subscription limit
 */
router.post('/cleanup', requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const { keepCount } = req.body;

    if (!keepCount || keepCount < 1) {
      return res.status(400).json({
        success: false,
        error: 'keepCount is required and must be > 0',
      });
    }

    const deletedCount = await ConversationService.cleanOldConversations(userId, keepCount);

    res.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    console.error('❌ [CONVERSATION] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean conversations',
    });
  }
});

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export default router;
