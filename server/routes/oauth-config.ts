/**
 * 🔐 OAUTH CONFIGURATION ENDPOINT
 * Provides client-safe OAuth configuration
 */

import { Router } from 'express';

const router = Router();

// Endpoint para obtener configuración OAuth para el cliente
router.get('/config', (req, res) => {
  try {
    // Google y Apple OAuth deshabilitados - solo OTP y email habilitados
    const oauthConfig = {
      google: {
        clientId: null,
        enabled: false  // Deshabilitado intencionalmente
      },
      apple: {
        clientId: null,
        enabled: false  // Deshabilitado intencionalmente
      }
    };

    console.log('🔧 [OAUTH-CONFIG] Configuración enviada:', {
      googleEnabled: oauthConfig.google.enabled,
      appleEnabled: oauthConfig.apple.enabled,
      googleClientId: oauthConfig.google.clientId ? 'presente' : 'ausente',
      appleClientId: oauthConfig.apple.clientId ? 'presente' : 'ausente'
    });

    res.json(oauthConfig);
  } catch (error) {
    console.error('❌ [OAUTH-CONFIG] Error:', error);
    res.status(500).json({ error: 'Error obteniendo configuración OAuth' });
  }
});

export default router;