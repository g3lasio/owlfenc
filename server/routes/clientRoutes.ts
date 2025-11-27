import { Router } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';

const router = Router();

// Initialize Firebase if not already done
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.log('Firebase admin already initialized or configuration missing');
  }
}

// Esquemas de validación para clientes Firebase
const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  mobilePhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  classification: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
}).passthrough(); // Permitir campos adicionales como userId, clientId de la IA

const updateClientSchema = clientSchema.partial();
const importClientsSchema = z.object({
  clients: z.array(clientSchema),
});

// Obtener todos los clientes del usuario autenticado
router.get('/', verifyFirebaseAuth, async (req, res) => {
  try {
    console.log('🔒 [FIREBASE-CLIENTS] Obteniendo clientes para usuario:', req.firebaseUser?.uid);
    
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const db = admin.firestore();
    const clientsRef = db.collection('clients');
    const query = clientsRef.where('userId', '==', userId).orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    console.log(`✅ [FIREBASE-CLIENTS] Encontrados ${clients.length} clientes`);
    res.json(clients);

  } catch (error) {
    console.error('❌ [FIREBASE-CLIENTS] Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Obtener un cliente específico
router.get('/:id', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    const clientId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const db = admin.firestore();
    const clientDoc = await db.collection('clients').doc(clientId).get();
    
    if (!clientDoc.exists) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const clientData = clientDoc.data();
    
    // Verificar que el cliente pertenece al usuario
    if (clientData?.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    res.json({
      id: clientDoc.id,
      ...clientData,
      createdAt: clientData?.createdAt?.toDate() || new Date(),
      updatedAt: clientData?.updatedAt?.toDate() || new Date(),
    });

  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear un nuevo cliente
router.post('/', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const clientData = clientSchema.parse(req.body);
    
    const db = admin.firestore();
    const now = new Date();
    const newClient = {
      ...clientData,
      userId,
      clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('clients').add(newClient);
    
    const savedClient = {
      id: docRef.id,
      ...newClient,
      createdAt: now,
      updatedAt: now,
    };

    console.log('✅ [FIREBASE-CLIENTS] Cliente creado:', savedClient.id);
    res.status(201).json(savedClient);

  } catch (error) {
    console.error('Error al crear cliente:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar un cliente existente
router.patch('/:id', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    const clientId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const updateData = updateClientSchema.parse(req.body);
    
    const db = admin.firestore();
    const clientRef = db.collection('clients').doc(clientId);
    const clientDoc = await clientRef.get();
    
    if (!clientDoc.exists) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const clientData = clientDoc.data();
    if (clientData?.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const updatedData = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await clientRef.update(updatedData);
    
    const updatedDoc = await clientRef.get();
    const result = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
    };

    console.log('✅ [FIREBASE-CLIENTS] Cliente actualizado:', clientId);
    res.json(result);

  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar un cliente
router.delete('/:id', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    const clientId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const db = admin.firestore();
    const clientRef = db.collection('clients').doc(clientId);
    const clientDoc = await clientRef.get();
    
    if (!clientDoc.exists) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const clientData = clientDoc.data();
    if (clientData?.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    await clientRef.delete();
    
    console.log('✅ [FIREBASE-CLIENTS] Cliente eliminado:', clientId);
    res.json({ success: true });

  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Importar múltiples clientes
router.post('/import', verifyFirebaseAuth, async (req, res) => {
  try {
    const userId = req.firebaseUser?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { clients } = importClientsSchema.parse(req.body);
    
    const db = admin.firestore();
    const batch = db.batch();
    const clientIds: string[] = [];

    clients.forEach((clientData) => {
      const newClientRef = db.collection('clients').doc();
      const newClient = {
        ...clientData,
        userId,
        clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(newClientRef, newClient);
      clientIds.push(newClientRef.id);
    });

    await batch.commit();
    
    console.log(`✅ [FIREBASE-CLIENTS] Importados ${clients.length} clientes`);
    res.json({ 
      success: true, 
      imported: clients.length,
      clientIds 
    });

  } catch (error) {
    console.error('Error al importar clientes:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Error al importar clientes' });
  }
});

export default router;