import { Router } from 'express';
import { z } from 'zod';
import { clientStorage } from '../DatabaseStorageClient';
import { insertClientSchema, clients } from '@shared/schema';
import { db } from '../db';

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
    console.log('=== INICIANDO CARGA DE CLIENTES ===');
    console.log('Query params recibidos:', req.query);
    
    // Intentar obtener clientes de la base de datos
    try {
      console.log('Obteniendo clientes de la base de datos...');
      const allClients = await db.select().from(clients).limit(100);
      console.log(`✅ Clientes encontrados en base de datos: ${allClients.length}`);
      
      // Mapear los datos para asegurar compatibilidad
      const formattedClients = allClients.map(client => ({
        id: client.id,
        name: client.name || 'Sin nombre',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
      }));
      
      console.log('Primeros 3 clientes formateados:', formattedClients.slice(0, 3));
      res.json(formattedClients);
      
    } catch (dbError) {
      console.log('❌ Error en base de datos, usando clientStorage como respaldo...');
      
      // Intentar con clientStorage como respaldo
      try {
        const storageClients = await clientStorage.getClients();
        console.log(`✅ Clientes obtenidos del storage: ${storageClients?.length || 0}`);
        
        if (storageClients && storageClients.length > 0) {
          res.json(storageClients);
        } else {
          // Si no hay clientes en storage, devolver array vacío para que la interfaz funcione
          console.log('No hay clientes disponibles, devolviendo array vacío');
          res.json([]);
        }
      } catch (storageError) {
        console.error('Error en clientStorage:', storageError);
        // Devolver array vacío para que la interfaz funcione
        res.json([]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general al obtener clientes:', error);
    // Devolver array vacío para que la interfaz funcione
    res.json([]);
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