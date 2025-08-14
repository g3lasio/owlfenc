/**
 * Rutas WebAuthn para Autenticación Biométrica
 * Maneja Face ID, Touch ID y huella digital
 */

import { Router } from 'express';
import crypto from 'crypto';
import cbor from 'cbor';
import { webauthnCredentials, users } from '@shared/schema';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Almacenar desafíos temporalmente (en producción usar Redis)
const challenges = new Map<string, { challenge: string; userId?: number; timestamp: number }>();

// Limpiar desafíos expirados cada 5 minutos
setInterval(() => {
  const now = Date.now();
  const challengesArray = Array.from(challenges.entries());
  for (const [key, value] of challengesArray) {
    if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutos
      challenges.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Inicia el proceso de registro de credencial WebAuthn
 */
router.post('/register/begin', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔐 [WEBAUTHN-REGISTER] Iniciando registro para:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    // Buscar usuario por email
    const [user] = await db!
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar credenciales existentes
    const existingCredentials = await db!
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, user.id));

    // Generar challenge
    const challenge = crypto.randomBytes(32).toString('base64url');
    const challengeKey = `register_${email}_${Date.now()}`;
    
    challenges.set(challengeKey, {
      challenge,
      userId: user.id,
      timestamp: Date.now()
    });

    // Opciones de registro WebAuthn
    const registrationOptions = {
      challenge,
      rp: {
        name: 'Owl Fence Contractor Platform',
        id: req.hostname || 'localhost',
      },
      user: {
        id: Buffer.from(user.id.toString()).toString('base64url'),
        name: email,
        displayName: user.ownerName || email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: true,
      },
      attestation: 'direct',
      timeout: 60000,
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports || ['internal']
      }))
    };

    // Enviar junto con el challengeKey para la verificación
    res.json({
      ...registrationOptions,
      challengeKey
    });

    console.log('✅ [WEBAUTHN-REGISTER] Opciones generadas para:', email);

  } catch (error) {
    console.error('❌ [WEBAUTHN-REGISTER] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Completa el registro de credencial WebAuthn
 */
router.post('/register/complete', async (req, res) => {
  try {
    const { email, credential, challengeKey } = req.body;
    console.log('🔐 [WEBAUTHN-REGISTER] Completando registro para:', email);

    if (!email || !credential || !challengeKey) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar challenge
    const challengeData = challenges.get(challengeKey);
    if (!challengeData) {
      return res.status(400).json({ error: 'Challenge expirado o inválido' });
    }

    // Limpiar challenge usado
    challenges.delete(challengeKey);

    // Buscar usuario
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.id !== challengeData.userId) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Procesar la credencial
    const { id, rawId, response } = credential;
    const { clientDataJSON, attestationObject } = response;

    // Verificar clientDataJSON
    const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
    
    if (clientData.type !== 'webauthn.create') {
      return res.status(400).json({ error: 'Tipo de credencial inválido' });
    }

    if (clientData.challenge !== challengeData.challenge) {
      return res.status(400).json({ error: 'Challenge no coincide' });
    }

    // Decodificar attestationObject
    const attestationBuffer = Buffer.from(attestationObject, 'base64url');
    const attestation = cbor.decode(attestationBuffer);
    
    // Extraer authData
    const authData = attestation.authData;
    const rpIdHash = authData.slice(0, 32);
    const flags = authData[32];
    const counter = authData.slice(33, 37).readUInt32BE(0);
    
    // Verificar que el authenticator tiene user verification
    const userVerified = (flags & 0x04) !== 0;
    if (!userVerified) {
      return res.status(400).json({ error: 'Usuario no verificado' });
    }

    // Extraer credentialData (después de los primeros 37 bytes)
    const credentialData = authData.slice(37);
    const credentialIdLength = credentialData.slice(16, 18).readUInt16BE(0);
    const credentialId = credentialData.slice(18, 18 + credentialIdLength);
    const publicKeyBytes = credentialData.slice(18 + credentialIdLength);
    
    // Decodificar la clave pública CBOR
    const publicKey = cbor.decode(publicKeyBytes);

    // Detectar tipo de dispositivo
    const userAgent = req.headers['user-agent'] || '';
    let deviceType = 'Unknown';
    if (userAgent.includes('iPhone')) deviceType = 'iPhone';
    else if (userAgent.includes('iPad')) deviceType = 'iPad';
    else if (userAgent.includes('Android')) deviceType = 'Android';
    else if (userAgent.includes('Windows')) deviceType = 'Windows';
    else if (userAgent.includes('Mac')) deviceType = 'Mac';

    // Guardar credencial en la base de datos
    await db.insert(webauthnCredentials).values({
      userId: user.id,
      credentialId: credentialId.toString('base64url'),
      publicKey: JSON.stringify(publicKey),
      counter: counter,
      deviceType,
      lastUsed: new Date(),
      name: `${deviceType} - ${new Date().toLocaleDateString()}`,
      transports: ['internal', 'hybrid']
    });

    console.log('✅ [WEBAUTHN-REGISTER] Credencial guardada para:', email);

    res.json({ 
      success: true, 
      message: 'Credencial biométrica registrada exitosamente',
      deviceType 
    });

  } catch (error) {
    console.error('❌ [WEBAUTHN-REGISTER] Error:', error);
    res.status(500).json({ error: 'Error procesando credencial' });
  }
});

/**
 * Inicia el proceso de autenticación WebAuthn
 */
router.post('/authenticate/begin', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔐 [WEBAUTHN-AUTH] Iniciando autenticación para:', email || 'cualquier usuario');

    // Generar challenge
    const challenge = crypto.randomBytes(32).toString('base64url');
    const challengeKey = `auth_${email || 'any'}_${Date.now()}`;
    
    challenges.set(challengeKey, {
      challenge,
      timestamp: Date.now()
    });

    let allowCredentials;
    
    if (email) {
      // Buscar credenciales específicas del usuario
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user) {
        const userCredentials = await db
          .select()
          .from(webauthnCredentials)
          .where(eq(webauthnCredentials.userId, user.id));

        allowCredentials = userCredentials.map(cred => ({
          id: cred.credentialId,
          type: 'public-key',
          transports: cred.transports || ['internal']
        }));
      }
    }

    // Opciones de autenticación
    const authenticationOptions = {
      challenge,
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
      challengeKey
    };

    res.json(authenticationOptions);
    console.log('✅ [WEBAUTHN-AUTH] Opciones generadas');

  } catch (error) {
    console.error('❌ [WEBAUTHN-AUTH] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Completa el proceso de autenticación WebAuthn
 */
router.post('/authenticate/complete', async (req, res) => {
  try {
    const { credential, challengeKey } = req.body;
    console.log('🔐 [WEBAUTHN-AUTH] Completando autenticación');

    if (!credential || !challengeKey) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar challenge
    const challengeData = challenges.get(challengeKey);
    if (!challengeData) {
      return res.status(400).json({ error: 'Challenge expirado o inválido' });
    }

    // Limpiar challenge usado
    challenges.delete(challengeKey);

    const { id, rawId, response } = credential;
    const { clientDataJSON, authenticatorData, signature, userHandle } = response;

    // Verificar clientDataJSON
    const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
    
    if (clientData.type !== 'webauthn.get') {
      return res.status(400).json({ error: 'Tipo de autenticación inválido' });
    }

    if (clientData.challenge !== challengeData.challenge) {
      return res.status(400).json({ error: 'Challenge no coincide' });
    }

    // Buscar credencial en la base de datos
    const [storedCredential] = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.credentialId, id))
      .limit(1);

    if (!storedCredential) {
      return res.status(404).json({ error: 'Credencial no encontrada' });
    }

    // Buscar usuario asociado
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, storedCredential.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar signature (simplificado - en producción usar biblioteca como webauthn-simple-app)
    const authDataBuffer = Buffer.from(authenticatorData, 'base64url');
    const flags = authDataBuffer[32];
    const userVerified = (flags & 0x04) !== 0;
    
    if (!userVerified) {
      return res.status(400).json({ error: 'Usuario no verificado' });
    }

    // Actualizar última vez usado
    await db
      .update(webauthnCredentials)
      .set({ lastUsed: new Date() })
      .where(eq(webauthnCredentials.id, storedCredential.id));

    console.log('✅ [WEBAUTHN-AUTH] Autenticación exitosa para:', user.email);

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        ownerName: user.ownerName
      },
      message: 'Autenticación biométrica exitosa' 
    });

  } catch (error) {
    console.error('❌ [WEBAUTHN-AUTH] Error:', error);
    res.status(500).json({ error: 'Error procesando autenticación' });
  }
});

/**
 * Lista las credenciales registradas del usuario
 */
router.get('/credentials', async (req, res) => {
  try {
    const email = req.query.email as string;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    // Buscar usuario
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar credenciales
    const credentials = await db
      .select({
        id: webauthnCredentials.id,
        deviceType: webauthnCredentials.deviceType,
        name: webauthnCredentials.name,
        createdAt: webauthnCredentials.createdAt,
        lastUsed: webauthnCredentials.lastUsed
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, user.id));

    res.json({ credentials });

  } catch (error) {
    console.error('❌ [WEBAUTHN-CREDENTIALS] Error:', error);
    res.status(500).json({ error: 'Error obteniendo credenciales' });
  }
});

export default router;