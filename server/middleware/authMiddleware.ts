import { Request, Response, NextFunction } from 'express';
import { DatabaseStorage } from '../DatabaseStorage';
import { UserMappingService } from '../services/UserMappingService';

/**
 * CRITICAL: Secure Authentication Middleware
 * 
 * This middleware eliminates the dangerous fallback to userId = 1
 * and ensures proper user mapping for all requests.
 */

export interface AuthenticatedRequest extends Request {
  userId: number;
  firebaseUid: string;
  userEmail?: string;
}

export class AuthMiddleware {
  private userMappingService: UserMappingService;

  constructor(storage: DatabaseStorage) {
    this.userMappingService = UserMappingService.getInstance(storage);
  }

  /**
   * CRITICAL: Secure authentication middleware
   * Replaces ALL dangerous userId = 1 fallbacks
   */
  authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get Firebase UID from headers
      const firebaseUid = req.headers["x-firebase-uid"] as string;
      const userEmail = req.headers["x-user-email"] as string;

      if (!firebaseUid) {
        console.warn("🔒 [AUTH-MIDDLEWARE] No Firebase UID provided - access denied");
        return res.status(401).json({
          success: false,
          error: "Authentication required - Firebase UID missing"
        });
      }

      console.log(`🔐 [AUTH-MIDDLEWARE] Authenticating Firebase UID: ${firebaseUid}`);

      // Use secure user mapping service to get or create user
      let userId: number;
      try {
        userId = await this.userMappingService.getOrCreateUserIdForFirebaseUid(
          firebaseUid,
          userEmail
        );
        console.log(`✅ [AUTH-MIDDLEWARE] Secure mapping: ${firebaseUid} → ${userId}`);
      } catch (error) {
        console.error(`❌ [AUTH-MIDDLEWARE] Failed to map user:`, error);
        return res.status(401).json({
          success: false,
          error: "User authentication failed - mapping error"
        });
      }

      // Add user information to request
      (req as AuthenticatedRequest).userId = userId;
      (req as AuthenticatedRequest).firebaseUid = firebaseUid;
      (req as AuthenticatedRequest).userEmail = userEmail;

      next();
    } catch (error) {
      console.error(`❌ [AUTH-MIDDLEWARE] Critical authentication error:`, error);
      return res.status(500).json({
        success: false,
        error: "Internal authentication error"
      });
    }
  };

  /**
   * Optional middleware for endpoints that can work without auth
   * but should use proper user mapping when auth is available
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const firebaseUid = req.headers["x-firebase-uid"] as string;
      const userEmail = req.headers["x-user-email"] as string;

      if (firebaseUid) {
        try {
          const userId = await this.userMappingService.getOrCreateUserIdForFirebaseUid(
            firebaseUid,
            userEmail
          );
          (req as AuthenticatedRequest).userId = userId;
          (req as AuthenticatedRequest).firebaseUid = firebaseUid;
          (req as AuthenticatedRequest).userEmail = userEmail;
          console.log(`✅ [AUTH-MIDDLEWARE] Optional auth: ${firebaseUid} → ${userId}`);
        } catch (error) {
          console.warn(`⚠️ [AUTH-MIDDLEWARE] Optional auth failed for ${firebaseUid}:`, error);
          // Continue without auth - let endpoint handle
        }
      }

      next();
    } catch (error) {
      console.error(`❌ [AUTH-MIDDLEWARE] Optional auth error:`, error);
      next(); // Continue without auth
    }
  };

  /**
   * Verify user ownership of data
   */
  verifyOwnership = (dataUserId: number) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required for ownership verification"
        });
      }

      const isOwner = authReq.userId === dataUserId;
      
      if (!isOwner) {
        console.warn(`🔒 [SECURITY] Access denied: User ${authReq.userId} tried to access data owned by user ${dataUserId}`);
        return res.status(403).json({
          success: false,
          error: "Access denied - data belongs to different user"
        });
      }

      next();
    } catch (error) {
      console.error(`❌ [AUTH-MIDDLEWARE] Ownership verification error:`, error);
      return res.status(500).json({
        success: false,
        error: "Ownership verification failed"
      });
    }
  };
}

/**
 * Helper function to get authenticated user from request
 */
export function getAuthenticatedUser(req: Request): { userId: number; firebaseUid: string; userEmail?: string } | null {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.userId || !authReq.firebaseUid) {
    return null;
  }

  return {
    userId: authReq.userId,
    firebaseUid: authReq.firebaseUid,
    userEmail: authReq.userEmail
  };
}

/**
 * Helper function to require authenticated user (throws if not authenticated)
 */
export function requireAuthenticatedUser(req: Request): { userId: number; firebaseUid: string; userEmail?: string } {
  const user = getAuthenticatedUser(req);
  
  if (!user) {
    throw new Error("Authentication required - user not found in request");
  }

  return user;
}