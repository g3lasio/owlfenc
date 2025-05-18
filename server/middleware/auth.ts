
import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Verificar si el usuario está autenticado (en un entorno real, esto verificaría el token JWT o la sesión)
  if (process.env.NODE_ENV === 'development') {
    // En desarrollo, simular un usuario autenticado
    req.user = { 
      id: 'dev-user-123',
      email: 'dev@example.com'
    };
    next();
    return;
  }
  
  // Verificar token o sesión aquí
  if (req.headers.authorization) {
    // Extraer el token
    const token = req.headers.authorization.split(' ')[1];
    
    try {
      // Aquí normalmente verificarías el token JWT
      // Por simplicidad, solo verificamos que exista
      if (token) {
        // En un sistema real, decodificaríamos el token y obtendríamos el ID del usuario
        req.user = { 
          id: 'user-from-token',
          email: 'user@example.com'
        };
        next();
        return;
      }
    } catch (error) {
      console.error('Error de autenticación:', error);
    }
  }
  
  return res.status(401).json({ message: 'No autenticado' });
};
