import express, { Request, Response } from 'express';
import { z } from 'zod';
import { companyProfileService, CompanyProfile } from '../services/CompanyProfileService';
import { enhancedFirebaseAuth } from '../middleware/firebase-security-rules';

// Extender Request interface para incluir firebaseUser (debe coincidir con middleware)
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: {
        uid: string;
        email: string | null;
        emailVerified: boolean;
        name: string | null;
        picture: string | null;
        provider: string;
        customClaims?: any;
        tokenIssuedAt: Date;
        authTime: Date;
      };
    }
  }
}

const router = express.Router();

// Company Profile Schema - Extendido para incluir más campos
const companyProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  businessType: z.string().optional(),
  projectVolume: z.string().optional(),
  mainChallenge: z.string().optional(),
  logo: z.string().optional(),
  ownerName: z.string().optional(),
  role: z.string().optional(),
  mobilePhone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  license: z.string().optional(),
  insurancePolicy: z.string().optional(),
  ein: z.string().optional(),
  yearEstablished: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  socialMedia: z.record(z.string()).optional(),
  documents: z.record(z.string()).optional(),
});

// NOTA: Migración removida - Map local vacío no migra datos reales
// Si hay datos legacy, implementar script de migración separado

// Get user company profile - SECURED
router.get('/profile', enhancedFirebaseAuth, async (req: Request, res: Response) => {
  try {
    // SECURITY: Usar UID del token verificado, NO del cliente
    const firebaseUid = req.firebaseUser?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🔍 [USER-PROFILE] Obteniendo perfil para Firebase UID autenticado: ${firebaseUid}`);

    // Obtener perfil directamente de Firebase
    const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);
    
    if (!profile) {
      console.log(`❌ [USER-PROFILE] Perfil no encontrado para UID: ${firebaseUid}`);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log(`✅ [USER-PROFILE] Perfil obtenido exitosamente para: ${profile.companyName || 'Sin nombre'}`);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('❌ [USER-PROFILE] Error getting user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save/Update user company profile - SECURED
router.post('/company-profile', enhancedFirebaseAuth, async (req: Request, res: Response) => {
  try {
    // SECURITY: Usar UID del token verificado, NO del cliente
    const firebaseUid = req.firebaseUser?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`💾 [USER-PROFILE] Guardando perfil para Firebase UID autenticado: ${firebaseUid}`);

    // SEGURIDAD: Validar solo campos permitidos y filtrar inmutables
    const allowedFields = companyProfileSchema.partial().strict();
    const validationResult = allowedFields.safeParse(req.body);

    if (!validationResult.success) {
      console.error(`❌ [USER-PROFILE] Error de validación:`, validationResult.error.errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    // SEGURIDAD: Filtrar campos inmutables que el cliente no puede establecer
    const { firebaseUid: _, userId: __, createdAt: ___, ...safeData } = validationResult.data;

    // Guardar en Firebase con UID autenticado - forzar UIDs del servidor
    const profile = await companyProfileService.saveProfile(firebaseUid, safeData);

    console.log(`✅ [USER-PROFILE] Perfil guardado exitosamente para: ${profile.companyName || 'Sin nombre'}`);

    res.json({ 
      success: true, 
      message: 'Company profile saved successfully',
      profile 
    });
  } catch (error) {
    console.error('❌ [USER-PROFILE] Error saving company profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update specific profile fields - SECURED
router.patch('/profile', enhancedFirebaseAuth, async (req: Request, res: Response) => {
  try {
    // SECURITY: Usar UID del token verificado, NO del cliente
    const firebaseUid = req.firebaseUser?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🔄 [USER-PROFILE] Actualizando perfil para Firebase UID autenticado: ${firebaseUid}`);

    // SEGURIDAD: Validar y filtrar campos inmutables
    const allowedFields = companyProfileSchema.partial().strict();
    const validationResult = allowedFields.safeParse(req.body);

    if (!validationResult.success) {
      console.error(`❌ [USER-PROFILE] Error de validación:`, validationResult.error.errors);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    // SEGURIDAD: Filtrar campos inmutables que el cliente no puede modificar
    const { firebaseUid: _, userId: __, createdAt: ___, updatedAt: ____, ...safeUpdates } = validationResult.data;

    // Actualizar en Firebase con datos seguros
    const updatedProfile = await companyProfileService.updateProfile(firebaseUid, safeUpdates);
    
    if (!updatedProfile) {
      console.log(`❌ [USER-PROFILE] No se encontró perfil para actualizar: ${firebaseUid}`);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log(`✅ [USER-PROFILE] Perfil actualizado exitosamente`);

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('❌ [USER-PROFILE] Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has completed onboarding - SECURED
router.get('/onboarding-status', enhancedFirebaseAuth, async (req: Request, res: Response) => {
  try {
    // SECURITY: Usar UID del token verificado, NO del cliente
    const firebaseUid = req.firebaseUser?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🔍 [USER-PROFILE] Verificando onboarding para Firebase UID autenticado: ${firebaseUid}`);

    // Verificar en Firebase
    const profile = await companyProfileService.getProfileByFirebaseUid(firebaseUid);
    const hasCompletedOnboarding = !!profile && !!profile.companyName;

    console.log(`✅ [USER-PROFILE] Onboarding status: ${hasCompletedOnboarding ? 'Completado' : 'Pendiente'}`);

    res.json({ 
      success: true, 
      hasCompletedOnboarding,
      hasProfile: !!profile
    });
  } catch (error) {
    console.error('❌ [USER-PROFILE] Error checking onboarding status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;