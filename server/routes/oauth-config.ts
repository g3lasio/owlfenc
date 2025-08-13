/**
 * 🔐 OAUTH CONFIGURATION ENDPOINT
 * Provides client-safe OAuth configuration
 */

import { Router } from 'express';

const router = Router();

// Endpoint para obtener configuración OAuth para el cliente
router.get('/config', (req, res) => {
  try {
    // Solo enviamos los Client IDs (son públicos y seguros)
    const oauthConfig = {
      google: {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || null,
        enabled: !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET
      },
      apple: {
        clientId: process.env.APPLE_OAUTH_CLIENT_ID || null,
        enabled: !!process.env.APPLE_OAUTH_CLIENT_ID && !!process.env.APPLE_OAUTH_CLIENT_SECRET
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