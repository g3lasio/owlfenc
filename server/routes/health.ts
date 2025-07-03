import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    checks: {
      database: !!process.env.DATABASE_URL,
      firebase: !!process.env.FIREBASE_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
    }
  };

  res.json(health);
});

// Basic ping endpoint
router.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: Date.now() });
});

export default router;