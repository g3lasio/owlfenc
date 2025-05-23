import { Request, Response, NextFunction } from 'express';

// Extender el tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username?: string;
      };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Para desarrollo, simular usuario autenticado
  // En producción, esto validaría el token JWT o la sesión
  
  if (process.env.NODE_ENV === 'production') {
    // En producción, verificar autenticación real
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }
    
    // Aquí iría la validación del token JWT
    // Por ahora usamos un usuario por defecto
  }
  
  // Simular usuario autenticado para desarrollo
  req.user = {
    id: 1,
    email: 'demo@owlfence.com',
    username: 'demo_user'
  };
  
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // Middleware opcional que no requiere autenticación pero puede incluir usuario si está disponible
  
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Si hay token, intentar validar
    req.user = {
      id: 1,
      email: 'demo@owlfence.com',
      username: 'demo_user'
    };
  }
  
  next();
};

// Alias para compatibilidad con código existente
export const isAuthenticated = requireAuth;