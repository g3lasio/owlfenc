/**
 * 🔐 CUSTOM TOKEN ROUTES
 * API endpoints for creating Firebase custom tokens after OTP verification
 */

import { Router } from 'express';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';

const router = Router();

// Schema for request validation
const createTokenSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
});

/**
 * POST /api/auth/create-custom-token
 * Create a custom Firebase token for OTP-verified users
 */
router.post('/create-custom-token', async (req, res) => {
  try {
    console.log('🔐 [CUSTOM-TOKEN] POST /create-custom-token - Request received');
    
    // Validate request body
    const validation = createTokenSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('❌ [CUSTOM-TOKEN] Validation failed:', validation.error.issues);
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: validation.error.issues.map(issue => issue.message)
      });
    }

    const { email } = validation.data;
    console.log(`🔐 [CUSTOM-TOKEN] Creating custom token for: ${email}`);

    // Verify user exists in Firebase
    let user;
    try {
      user = await getAuth().getUserByEmail(email);
      console.log(`✅ [CUSTOM-TOKEN] User verified in Firebase: ${email}`);
    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/user-not-found') {
        console.log(`❌ [CUSTOM-TOKEN] User not found in Firebase: ${email}`);
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      throw firebaseError;
    }

    // Create custom token
    const customToken = await getAuth().createCustomToken(user.uid);
    console.log(`✅ [CUSTOM-TOKEN] Custom token created for user: ${email}`);

    res.json({
      success: true,
      customToken,
      message: 'Token personalizado creado exitosamente'
    });

  } catch (error) {
    console.error('❌ [CUSTOM-TOKEN] Error creating custom token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear token'
    });
  }
});

export default router;