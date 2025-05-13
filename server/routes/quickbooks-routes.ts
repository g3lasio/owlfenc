import express, { Router, Request, Response } from 'express';
import { getAuthUrl, handleCallback, checkConnection, getInventory, disconnect } from '../services/quickbooksService';
import axios from 'axios';

const router = Router();

// Ruta para probar la conexión a los servidores de QuickBooks
router.get('/test-connection', async (req: Request, res: Response) => {
  try {
    console.log('[QuickBooks] Probando conexión a servidores de Intuit...');
    const response = await axios.get('https://accounts.intuit.com', { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Replit API Connector)'
      }
    });
    return res.json({ 
      success: true, 
      statusCode: response.status,
      message: 'Conexión a servidores de QuickBooks exitosa'
    });
  } catch (error: any) {
    console.error('[QuickBooks] Error al conectar con servidores de Intuit:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Error al conectar con servidores de QuickBooks'
    });
  }
});

// Ruta para iniciar el proceso de autorización
router.get('/auth', getAuthUrl);

// Ruta para manejar el callback de autorización
router.get('/callback', handleCallback);

// Ruta para verificar si el usuario está conectado
router.get('/connection', checkConnection);

// Ruta para obtener el inventario
router.get('/inventory', getInventory);

// Ruta para desconectar QuickBooks
router.get('/disconnect', disconnect);

export default router;