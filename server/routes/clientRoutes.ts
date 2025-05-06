import { Router } from 'express';
import { z } from 'zod';
import { clientStorage } from '../DatabaseStorageClient';
import { insertClientSchema } from '@shared/schema';

const router = Router();

// Esquema para validar búsqueda de clientes por userId
const getUserClientsSchema = z.object({
  userId: z.coerce.number()
});

// Esquema para validar edición de cliente
const updateClientSchema = insertClientSchema.partial();

// Obtener todos los clientes de un usuario
router.get('/', async (req, res) => {
  try {
    const { userId } = getUserClientsSchema.parse(req.query);
    const clients = await clientStorage.getClientsByUserId(userId);
    res.json(clients);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un cliente específico
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const client = await clientStorage.getClient(id);
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear un nuevo cliente
router.post('/', async (req, res) => {
  try {
    const clientData = insertClientSchema.parse(req.body);
    const client = await clientStorage.createClient(clientData);
    res.status(201).json(client);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar un cliente existente
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const clientData = updateClientSchema.parse(req.body);
    
    // Verificar si el cliente existe
    const existingClient = await clientStorage.getClient(id);
    if (!existingClient) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    const updatedClient = await clientStorage.updateClient(id, clientData);
    res.json(updatedClient);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar un cliente
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Verificar si el cliente existe
    const existingClient = await clientStorage.getClient(id);
    if (!existingClient) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    const result = await clientStorage.deleteClient(id);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'No se pudo eliminar el cliente' });
    }
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;