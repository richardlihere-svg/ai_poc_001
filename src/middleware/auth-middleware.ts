// Authentication and authorization middleware for Express.js
// Implements role-based access control (RBAC) following security best practices

import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { UserResponse, InsufficientPermissionsError } from '../types/user.js';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserResponse;
    }
  }
}

export interface AuthMiddleware {
  authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
  requireRole(role: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
  requirePermission(resource: string, action: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

export class DefaultAuthMiddleware implements AuthMiddleware {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository
  ) {}

  async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = this.extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'Authentication token required' });
        return;
      }

      const userId = await this.tokenService.validateToken(token);
      const user = await this.userRepository.findById(userId);

      if (!user) {
        res.status(401).json({ error: 'Invalid authentication token' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: 'User account is deactivated' });
        return;
      }

      // Add user to request object without sensitive data
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles,
        profile: user.profile,
        createdAt: user.createdAt,
        isActive: user.isActive
      };

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      res.status(401).json({ error: errorMessage });
    }
  }

  requireRole(roleName: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const hasRole = req.user.roles.some(role => role.name === roleName);
        if (!hasRole) {
          throw new InsufficientPermissionsError(`Role '${roleName}' required`);
        }

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authorization failed';
        res.status(403).json({ error: errorMessage });
      }
    };
  }

  requirePermission(resource: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const hasPermission = this.userHasPermission(req.user, resource, action);
        if (!hasPermission) {
          throw new InsufficientPermissionsError(`Permission '${resource}:${action}' required`);
        }

        next();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authorization failed';
        res.status(403).json({ error: errorMessage });
      }
    };
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  private userHasPermission(user: UserResponse, resource: string, action: string): boolean {
    return user.roles.some(role =>
      role.permissions.some(permission =>
        permission.resource === resource && permission.action === action
      )
    );
  }
}

// Utility functions for common authorization patterns
export const createAuthMiddleware = (
  tokenService: TokenService,
  userRepository: UserRepository
): AuthMiddleware => {
  return new DefaultAuthMiddleware(tokenService, userRepository);
};

// Common role-based middleware factories
export const requireAdmin = (authMiddleware: AuthMiddleware) => 
  authMiddleware.requireRole('admin');

export const requireManager = (authMiddleware: AuthMiddleware) => 
  authMiddleware.requireRole('manager');

export const requireUser = (authMiddleware: AuthMiddleware) => 
  authMiddleware.requireRole('user');

// Permission-based middleware factories
export const requireUserRead = (authMiddleware: AuthMiddleware) =>
  authMiddleware.requirePermission('user', 'read');

export const requireUserWrite = (authMiddleware: AuthMiddleware) =>
  authMiddleware.requirePermission('user', 'write');

export const requireUserDelete = (authMiddleware: AuthMiddleware) =>
  authMiddleware.requirePermission('user', 'delete');