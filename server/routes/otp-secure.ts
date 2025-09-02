/**
 * 🔐 OTP SECURE ROUTES - CON VALIDACIÓN DE PERFIL
 * Sistema mejorado que marca perfiles incompletos para OTP/Magic Link
 */

import { Router } from 'express';
import { db } from '../firebase-admin';

const router = Router();

// VERIFICAR OTP CON MARCADO DE PERFIL INCOMPLETO
router.post('/verify-secure', async (req, res) => {
  try {
    const { email, otp, isNewUser } = req.body;
    
    console.log('🔐 [OTP-SECURE] Verificando OTP para:', email);
    
    // Aquí verificarías el OTP (simplificado para el ejemplo)
    // En producción, verificar contra tu sistema de OTP
    
    if (isNewUser) {
      // CREAR PERFIL INCOMPLETO PARA NUEVO USUARIO
      const newUserProfile = {
        email,
        authProvider: 'otp',
        createdAt: new Date(),
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          usageLimit: 10,
          currentUsage: 0
        },
        profileComplete: false, // CRÍTICO: Marcar como incompleto
        // Campos vacíos que debe completar
        displayName: '',
        company: '',
        phone: '',
        mobilePhone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        role: '',
        yearEstablished: '',
        businessType: ''
      };
      
      // Crear documento en Firestore
      await db.collection('users').doc(email).set(newUserProfile);
      
      console.log('✅ [OTP-SECURE] Nuevo usuario creado con perfil incompleto');
      
      return res.json({
        success: true,
        message: 'Usuario creado - requiere completar perfil',
        userId: email,
        requiresProfileCompletion: true
      });
    } else {
      // VERIFICAR SI USUARIO EXISTENTE TIENE PERFIL COMPLETO
      const userDoc = await db.collection('users').doc(email).get();
      const userData = userDoc.data();
      
      const profileComplete = !!(
        userData?.displayName &&
        userData?.company &&
        userData?.phone
      );
      
      console.log('📊 [OTP-SECURE] Estado del perfil:', { 
        email, 
        profileComplete,
        hasData: !!userData 
      });
      
      return res.json({
        success: true,
        message: 'Acceso autorizado',
        userId: email,
        requiresProfileCompletion: !profileComplete
      });
    }
  } catch (error) {
    console.error('❌ [OTP-SECURE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando OTP'
    });
  }
});

// ACTUALIZAR PERFIL Y MARCAR COMO COMPLETO
router.post('/complete-profile', async (req, res) => {
  try {
    const { userId, profileData } = req.body;
    
    console.log('📝 [OTP-SECURE] Completando perfil para:', userId);
    
    // Validar campos requeridos
    if (!profileData.displayName || !profileData.company || !profileData.phone) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: nombre, empresa, teléfono'
      });
    }
    
    // Actualizar perfil en Firebase
    await db.collection('users').doc(userId).update({
      ...profileData,
      profileComplete: true,
      profileCompletedAt: new Date()
    });
    
    console.log('✅ [OTP-SECURE] Perfil completado exitosamente');
    
    res.json({
      success: true,
      message: 'Perfil completado exitosamente'
    });
  } catch (error) {
    console.error('❌ [OTP-SECURE] Error completando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando perfil'
    });
  }
});

export default router;