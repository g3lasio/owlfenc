/**
 * 🔐 OTP AUTHENTICATION ROUTES
 * API endpoints for email-based OTP authentication
 */

import { Router } from 'express';
import { z } from 'zod';
import { otpService } from '../services/otp-service';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiting for OTP requests
const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 OTP requests per 15 minutes per IP
  message: {
    error: 'Demasiadas solicitudes de código OTP. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 verification attempts per 15 minutes per IP
  message: {
    error: 'Demasiados intentos de verificación. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Schema for request validation
const sendOTPSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
});

const verifyOTPSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  code: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d{6}$/, 'El código debe ser numérico'),
});

/**
 * POST /api/otp/send
 * Send OTP code to email
 */
router.post('/send', otpRateLimit, async (req, res) => {
  try {
    console.log('🔐 [OTP-ROUTES] POST /send - Request received');
    
    // Validate request body
    const validation = sendOTPSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('❌ [OTP-ROUTES] Validation failed:', validation.error.issues);
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.issues.map(issue => issue.message)
      });
    }

    const { email } = validation.data;
    console.log(`🔐 [OTP-ROUTES] Sending OTP to: ${email}`);

    // Send OTP
    const result = await otpService.sendOTP(email);
    
    console.log(`🔐 [OTP-ROUTES] OTP send result:`, result);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ [OTP-ROUTES] Error in POST /send:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor. Intenta de nuevo.'
    });
  }
});

/**
 * POST /api/otp/verify
 * Verify OTP code
 */
router.post('/verify', verifyRateLimit, async (req, res) => {
  try {
    console.log('🔐 [OTP-ROUTES] POST /verify - Request received');
    
    // Validate request body
    const validation = verifyOTPSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('❌ [OTP-ROUTES] Validation failed:', validation.error.issues);
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.issues.map(issue => issue.message)
      });
    }

    const { email, code } = validation.data;
    console.log(`🔐 [OTP-ROUTES] Verifying OTP for: ${email}`);

    // Verify OTP
    const result = await otpService.verifyOTP(email, code);
    
    console.log(`🔐 [OTP-ROUTES] OTP verify result:`, result);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        userId: result.userId
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ [OTP-ROUTES] Error in POST /verify:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor. Intenta de nuevo.'
    });
  }
});

/**
 * POST /api/otp/cleanup
 * Clean up expired OTP codes (admin endpoint)
 */
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 [OTP-ROUTES] POST /cleanup - Cleaning expired OTPs');
    
    await otpService.cleanupExpiredOTPs();
    
    res.json({
      success: true,
      message: 'Expired OTP codes cleaned up successfully'
    });

  } catch (error) {
    console.error('❌ [OTP-ROUTES] Error in POST /cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up expired OTP codes'
    });
  }
});

export default router;