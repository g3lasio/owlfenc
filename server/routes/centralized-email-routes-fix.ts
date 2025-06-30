import express from 'express';

const router = express.Router();

/**
 * Test endpoint to verify routes are working
 * GET /api/centralized-email/test
 */
router.get('/test', (req, res) => {
  console.log('📧 [CENTRALIZED-EMAIL] Test endpoint invoked');
  res.json({ success: true, message: 'Centralized email routes working' });
});

/**
 * Simple POST endpoint for testing
 * POST /api/centralized-email/send-estimate
 */
router.post('/send-estimate', (req, res) => {
  console.log('📧 [CENTRALIZED-EMAIL] POST endpoint reached!');
  console.log('📧 [CENTRALIZED-EMAIL] Request body:', req.body);
  
  res.json({
    success: true,
    message: 'POST endpoint is working',
    receivedData: req.body
  });
});

export default router;