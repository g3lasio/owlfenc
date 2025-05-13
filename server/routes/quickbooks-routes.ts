import express, { Router } from 'express';
import { getAuthUrl, handleCallback, checkConnection, getInventory, disconnect } from '../services/quickbooksService';

const router = Router();

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