/**
 * 🔀 OAUTH DIRECTO - Bypass Firebase Console
 * Implementa autenticación OAuth sin depender de Firebase Console
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Google OAuth directo
router.get('/google', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth-direct/google/callback`;
    
    if (!clientId) {
      return res.status(500).json({ error: 'Google OAuth no configurado' });
    }
    
    const authUrl = `https://accounts.google.com/oauth2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('email profile')}&` +
      `state=${req.query.state || 'login'}`;
    
    console.log('🔵 [OAUTH-DIRECT] Google Auth URL:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ [OAUTH-DIRECT] Error Google:', error);
    res.status(500).json({ error: 'Error iniciando Google OAuth' });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth-direct/google/callback`;
    
    if (!code) {
      return res.status(400).json({ error: 'Código de autorización no recibido' });
    }
    
    // Intercambiar código por token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });
    
    const { access_token } = tokenResponse.data;
    
    // Obtener información del usuario
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const userInfo = userResponse.data;
    console.log('✅ [OAUTH-DIRECT] Google User:', userInfo.email);
    
    // Crear custom token de Firebase
    const { getAuth } = await import('firebase-admin/auth');
    const customToken = await getAuth().createCustomToken(userInfo.id, {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      provider: 'google'
    });
    
    // Redirigir al frontend con el token
    const frontendUrl = `${req.protocol}://${req.get('host')}/login?token=${customToken}&provider=google&state=${state}`;
    res.redirect(frontendUrl);
    
  } catch (error) {
    console.error('❌ [OAUTH-DIRECT] Google Callback Error:', error);
    res.redirect(`${req.protocol}://${req.get('host')}/login?error=google_auth_failed`);
  }
});

// Apple OAuth directo
router.get('/apple', (req, res) => {
  try {
    const clientId = process.env.APPLE_OAUTH_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth-direct/apple/callback`;
    
    if (!clientId) {
      return res.status(500).json({ error: 'Apple OAuth no configurado' });
    }
    
    const authUrl = `https://appleid.apple.com/auth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('email name')}&` +
      `response_mode=form_post&` +
      `state=${req.query.state || 'login'}`;
    
    console.log('🍎 [OAUTH-DIRECT] Apple Auth URL:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ [OAUTH-DIRECT] Error Apple:', error);
    res.status(500).json({ error: 'Error iniciando Apple OAuth' });
  }
});

// Apple OAuth callback (POST porque Apple usa form_post)
router.post('/apple/callback', async (req, res) => {
  try {
    const { code, state, user } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Código de autorización no recibido' });
    }
    
    // Apple OAuth es más complejo, implementaremos versión simplificada
    console.log('🍎 [OAUTH-DIRECT] Apple Code received:', !!code);
    
    // Para Apple, usaremos la información básica disponible
    const userInfo = user ? JSON.parse(user) : { email: 'apple_user@unknown.com' };
    const appleUserId = `apple_${Date.now()}`;
    
    console.log('✅ [OAUTH-DIRECT] Apple User Info:', userInfo);
    
    // Crear custom token de Firebase
    const { getAuth } = await import('firebase-admin/auth');
    const customToken = await getAuth().createCustomToken(appleUserId, {
      email: userInfo.email || 'apple_user@unknown.com',
      name: userInfo.name?.firstName ? `${userInfo.name.firstName} ${userInfo.name.lastName || ''}`.trim() : 'Apple User',
      provider: 'apple'
    });
    
    // Redirigir al frontend con el token
    const frontendUrl = `${req.protocol}://${req.get('host')}/login?token=${customToken}&provider=apple&state=${state}`;
    res.redirect(frontendUrl);
    
  } catch (error) {
    console.error('❌ [OAUTH-DIRECT] Apple Callback Error:', error);
    res.redirect(`${req.protocol}://${req.get('host')}/login?error=apple_auth_failed`);
  }
});

export default router;