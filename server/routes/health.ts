import { Router } from 'express';

const router = Router();

// Lightweight health check endpoint for deployment monitoring
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check endpoint for monitoring systems
router.get('/health/detailed', (req, res) => {
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
      stripe: !!process.env.STRIPE_API_TEST_KEY,
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

// Readiness check for deployment monitoring (minimal response time)
router.get('/ready', (req, res) => {
  res.status(200).send('OK');
});

export default router;