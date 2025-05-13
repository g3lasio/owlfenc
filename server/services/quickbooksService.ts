import { Request, Response } from 'express';
import OAuthClient from 'intuit-oauth';
import QuickBooks from 'node-quickbooks';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de OAuth para QuickBooks
const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
  environment: 'sandbox', // Usamos 'sandbox' para desarrollo
  redirectUri: 'https://material-calculator.replit.app/api/quickbooks/callback' // URL específica de Replit
});

// Almacenamiento temporal de tokens (en una aplicación de producción usaríamos una base de datos)
interface TokenStore {
  [userId: string]: {
    realmId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

const tokenStore: TokenStore = {};

// Obtener URL de autorización
export const getAuthUrl = (req: Request, res: Response) => {
  try {
    // Obtenemos el userId o usamos uno predeterminado para desarrollo
    const userId = req.query.userId as string || 'dev-user-123';
    
    console.log(`[QuickBooks] Generando URL de autorización para usuario: ${userId}`);
    
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: userId,
    });
    
    console.log(`[QuickBooks] URL de autorización generada: ${authUri}`);
    
    return res.json({ authUrl: authUri });
  } catch (error) {
    console.error('[QuickBooks] Error al generar URL de autorización:', error);
    return res.status(500).json({ error: 'No se pudo generar la URL de autorización' });
  }
};

// Manejar el callback de autorización
export const handleCallback = async (req: Request, res: Response) => {
  try {
    console.log('[QuickBooks] Callback recibido:', req.url);
    const userId = req.query.state as string;
    
    if (!userId) {
      console.log('[QuickBooks] Error: Usuario no especificado en el callback');
      return res.status(400).json({ error: 'Usuario no especificado' });
    }
    
    // Construir la URL completa para manejar el callback
    const fullUrl = `https://material-calculator.replit.app${req.url}`;
    console.log('[QuickBooks] Procesando URL de callback:', fullUrl);
    
    const authResponse = await oauthClient.createToken(fullUrl);
    const tokens = authResponse.getJson();
    
    console.log('[QuickBooks] Tokens obtenidos correctamente');
    
    // Guardar tokens
    tokenStore[userId] = {
      realmId: tokens.realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
    
    console.log(`[QuickBooks] Usuario ${userId} conectado correctamente`);
    
    // Redirigir al usuario a la página de materiales con un mensaje de éxito
    return res.redirect(`/materials?quickbooks=connected`);
  } catch (error) {
    console.error('[QuickBooks] Error en callback:', error);
    // Redirigir al usuario a la página de materiales con un mensaje de error
    return res.redirect(`/materials?quickbooks=error`);
  }
};

// Verificar si el token está expirado
const isTokenExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

// Actualizar token si es necesario
const refreshTokenIfNeeded = async (userId: string): Promise<boolean> => {
  try {
    const userTokens = tokenStore[userId];
    
    if (!userTokens) {
      return false;
    }
    
    if (isTokenExpired(userTokens.expiresAt)) {
      oauthClient.setToken({
        refresh_token: userTokens.refreshToken,
      });
      
      const authResponse = await oauthClient.refresh();
      const tokens = authResponse.getJson();
      
      // Actualizar tokens
      tokenStore[userId] = {
        ...userTokens,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      };
    }
    
    return true;
  } catch (error) {
    console.error('Error al actualizar token:', error);
    return false;
  }
};

// Crear cliente de QuickBooks
const createQBClient = (userId: string): QuickBooks | null => {
  const userTokens = tokenStore[userId];
  
  if (!userTokens) {
    return null;
  }
  
  return new QuickBooks(
    process.env.QUICKBOOKS_CLIENT_ID || '',
    process.env.QUICKBOOKS_CLIENT_SECRET || '',
    userTokens.accessToken,
    false, // no usar token de descubrimiento
    userTokens.realmId,
    process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox', // true para sandbox, false para producción
    true, // habilitar debug
    null, // minorversion
    '2.0', // OAuth version
    userTokens.refreshToken
  );
};

// Verificar si el usuario está conectado a QuickBooks
export const checkConnection = (req: Request, res: Response) => {
  // Obtenemos el userId o usamos uno predeterminado para desarrollo
  const userId = req.query.userId as string || 'dev-user-123';
  
  console.log(`[QuickBooks] Verificando conexión para usuario: ${userId}`);
  
  // Verificamos si el usuario tiene tokens almacenados
  const userTokens = tokenStore[userId];
  const isConnected = Boolean(userTokens);
  
  console.log(`[QuickBooks] Estado de conexión para usuario ${userId}: ${isConnected ? 'Conectado' : 'No conectado'}`);
  
  if (isConnected) {
    console.log(`[QuickBooks] Token expira: ${userTokens.expiresAt}`);
  }
  
  return res.json({ connected: isConnected });
};

// Obtener inventario desde QuickBooks
export const getInventory = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Usuario no especificado' });
    }
    
    // Verificar y actualizar token si es necesario
    const isTokenValid = await refreshTokenIfNeeded(userId);
    
    if (!isTokenValid) {
      return res.status(401).json({ error: 'No autorizado. Debe volver a conectarse a QuickBooks' });
    }
    
    // Crear cliente de QuickBooks
    const qbClient = createQBClient(userId);
    
    if (!qbClient) {
      return res.status(401).json({ error: 'No se pudo crear el cliente de QuickBooks' });
    }
    
    // Obtener items de inventario
    qbClient.findItems({ type: 'Inventory' }, (error: any, items: any) => {
      if (error) {
        console.error('Error al obtener inventario de QuickBooks:', error);
        return res.status(500).json({ error: 'Error al obtener inventario de QuickBooks' });
      }
      
      // Transformar datos a formato compatible con la aplicación
      const formattedItems = items.QueryResponse.Item?.map((item: any) => ({
        name: item.Name,
        description: item.Description || '',
        category: item.Type || 'Otro',
        unit: item.UnitOfMeasureSetRef?.name || 'pieza',
        price: item.UnitPrice || 0,
        supplier: item.PurchaseDesc || '',
        sku: item.Sku || '',
        stock: item.QtyOnHand || 0,
        minStock: 0, // QuickBooks no tiene un campo directo para esto
        quickbooksId: item.Id // Guardar el ID de QuickBooks para futuras actualizaciones
      })) || [];
      
      return res.json({ items: formattedItems });
    });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return res.status(500).json({ error: 'Error al obtener inventario de QuickBooks' });
  }
};

// Desconectar QuickBooks
export const disconnect = (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Usuario no especificado' });
    }
    
    // Eliminar tokens
    delete tokenStore[userId];
    
    return res.json({ success: true, message: 'Desconectado de QuickBooks correctamente' });
  } catch (error) {
    console.error('Error al desconectar QuickBooks:', error);
    return res.status(500).json({ error: 'Error al desconectar QuickBooks' });
  }
};