/**
 * TEMPORARY DEBUG ROUTES - ACCESO DIRECTO A DATOS
 * Para resolver problema de autenticación mientras se corrige el sistema principal
 */

const express = require('express');

function createDebugRoutes(storage) {
  const router = express.Router();

  // Obtener todos los datos del usuario específico
  router.get('/user-data/:firebaseUid', async (req, res) => {
    try {
      const { firebaseUid } = req.params;
      console.log(`🔍 [DEBUG] Getting complete data for: ${firebaseUid}`);
      
      // Get user info
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get ALL clients for this user
      const clients = await storage.listClients();
      const userClients = clients.filter(client => client.userId === user.id);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name,
          company: user.company
        },
        data: {
          totalClients: userClients.length,
          clients: userClients.map(client => ({
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            city: client.city,
            state: client.state,
            zipCode: client.zipCode,
            notes: client.notes,
            source: client.source,
            tags: client.tags,
            createdAt: client.createdAt,
            updatedAt: client.updatedAt
          }))
        },
        message: `Successfully loaded ${userClients.length} clients for user ${user.email}`
      });
      
    } catch (error) {
      console.error("❌ [DEBUG] Error:", error);
      res.status(500).json({ 
        error: error.message,
        details: "Error accessing user data directly"
      });
    }
  });

  // Test endpoint
  router.get('/test', (req, res) => {
    res.json({ 
      success: true, 
      message: "Debug routes working",
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

module.exports = { createDebugRoutes };