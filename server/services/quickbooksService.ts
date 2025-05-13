import { Request, Response } from 'express';
import OAuthClient from 'intuit-oauth';
import QuickBooks from 'node-quickbooks';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de OAuth para QuickBooks
const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
  environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox', // 'sandbox' o 'production'
  redirectUri: `${process.env.APP_URL || 'http://localhost:3000'}/api/quickbooks/callback`,
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
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: req.query.userId as string, // Pasamos el userId como state para recuperarlo
    });
    
    return res.json({ authUrl: authUri });
  } catch (error) {
    console.error('Error al generar URL de autorización:', error);
    return res.status(500).json({ error: 'No se pudo generar la URL de autorización' });
  }
};

// Manejar el callback de autorización
export const handleCallback = async (req: Request, res: Response) => {
  try {
    const userId = req.query.state as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Usuario no especificado' });
    }
    
    const authResponse = await oauthClient.createToken(req.url);
    const tokens = authResponse.getJson();
    
    // Guardar tokens
    tokenStore[userId] = {
      realmId: tokens.realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
    
    // Redirigir al usuario a la página de materiales con un mensaje de éxito
    return res.redirect(`/materials?quickbooks=connected`);
  } catch (error) {
    console.error('Error en callback de QuickBooks:', error);
    return res.status(500).json({ error: 'Error al procesar la autenticación' });
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
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'Usuario no especificado' });
  }
  
  const isConnected = Boolean(tokenStore[userId]);
  
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