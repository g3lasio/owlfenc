import { Router, Request, Response } from 'express';

const router = Router();

// Test endpoint to verify router is working
router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('🛡️ Invoice route test endpoint accessed');
    
    return res.json({
      success: true,
      message: 'Invoice routes working correctly!',
      timestamp: new Date().toISOString(),
      service: 'invoice-management'
    });
  } catch (error) {
    console.error('Error in invoice test endpoint:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;