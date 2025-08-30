import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
});

// Chat completion endpoint for onboarding
// 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger chat de IA
router.post('/chat', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar chat de IA costoso
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Processing AI chat for REAL user_id: ${userId}`);
    
    const { messages, model = 'gpt-4o-mini', max_tokens = 150 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('🤖 [OPENAI-CHAT] Processing chat request for onboarding');

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'No response generated' });
    }

    console.log('✅ [OPENAI-CHAT] Response generated successfully');

    res.json({
      success: true,
      message: content,
      content: content,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('❌ [OPENAI-CHAT] Error:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    } else if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

// Simple health check
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Test OpenAI connection with minimal request
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1,
    });

    res.json({ status: 'healthy', service: 'OpenAI Chat' });
  } catch (error: any) {
    console.error('OpenAI health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'OpenAI Chat',
      error: error.message 
    });
  }
});

export default router;