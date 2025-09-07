// Express application setup with all routes and middleware
// Demonstrates complete user management system integration

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { UserController } from './controllers/user-controller.js';
import { AdminController } from './controllers/admin-controller.js';
import { DefaultAuthService } from './services/auth-service.js';
import { InMemoryUserRepository } from './repositories/user-repository.js';
import { BcryptPasswordService } from './services/password-service.js';
import { JWTTokenService } from './services/token-service.js';
import { createAuthMiddleware, requireAdmin } from './middleware/auth-middleware.js';

export class UserManagementApp {
  public app: Application;
  private userController: UserController;
  private adminController: AdminController;
  private authMiddleware: any;

  constructor() {
    this.app = express();
    this.setupDependencies();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupDependencies(): void {
    // Initialize repositories and services
    const userRepository = new InMemoryUserRepository();
    const passwordService = new BcryptPasswordService();
    const tokenService = new JWTTokenService(process.env.JWT_SECRET);
    const authService = new DefaultAuthService(userRepository, passwordService, tokenService);

    // Initialize controllers
    this.userController = new UserController(authService, userRepository, passwordService);
    this.adminController = new AdminController(userRepository, {} as any, passwordService);

    // Initialize middleware
    this.authMiddleware = createAuthMiddleware(tokenService, userRepository);
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use(limiter);
    this.app.use('/auth', authLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging (in development)
    if (process.env.NODE_ENV !== 'production') {
      this.app.use((req: Request, res: Response, next) => {
        console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
      });
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Authentication routes (public)
    this.app.post('/auth/register', this.asyncHandler(this.userController.register.bind(this.userController)));
    this.app.post('/auth/login', this.asyncHandler(this.userController.login.bind(this.userController)));
    this.app.post('/auth/refresh', this.asyncHandler(this.userController.refreshToken.bind(this.userController)));
    this.app.post('/auth/logout', this.asyncHandler(this.userController.logout.bind(this.userController)));

    // User profile routes (authenticated)
    this.app.get('/users/profile', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      this.asyncHandler(this.userController.getProfile.bind(this.userController))
    );
    
    this.app.put('/users/profile', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      this.asyncHandler(this.userController.updateProfile.bind(this.userController))
    );
    
    this.app.put('/users/password', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      this.asyncHandler(this.userController.updatePassword.bind(this.userController))
    );

    // Admin routes (authenticated + admin role required)
    this.app.get('/admin/users', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      requireAdmin(this.authMiddleware),
      this.asyncHandler(this.adminController.getAllUsers.bind(this.adminController))
    );
    
    this.app.get('/admin/users/:id', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      requireAdmin(this.authMiddleware),
      this.asyncHandler(this.adminController.getUserById.bind(this.adminController))
    );
    
    this.app.post('/admin/users', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      requireAdmin(this.authMiddleware),
      this.asyncHandler(this.adminController.createUser.bind(this.adminController))
    );
    
    this.app.put('/admin/users/:id', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      requireAdmin(this.authMiddleware),
      this.asyncHandler(this.adminController.updateUser.bind(this.adminController))
    );
    
    this.app.delete('/admin/users/:id', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      requireAdmin(this.authMiddleware),
      this.asyncHandler(this.adminController.deleteUser.bind(this.adminController))
    );
    
    this.app.post('/admin/users/:id/roles/:roleId', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      requireAdmin(this.authMiddleware),
      this.asyncHandler(this.adminController.assignRole.bind(this.adminController))
    );
    
    this.app.delete('/admin/users/:id/roles/:roleId', 
      this.asyncHandler(this.authMiddleware.authenticate.bind(this.authMiddleware)),
      requireAdmin(this.authMiddleware),
      this.asyncHandler(this.adminController.removeRole.bind(this.adminController))
    );

    // API documentation endpoint
    this.app.get('/api/docs', (req: Request, res: Response) => {
      res.json({
        name: 'User Management API',
        version: '1.0.0',
        description: 'Complete user management system with authentication and authorization',
        endpoints: {
          authentication: {
            'POST /auth/register': 'Register a new user account',
            'POST /auth/login': 'Login with email and password',
            'POST /auth/refresh': 'Refresh authentication token',
            'POST /auth/logout': 'Logout and revoke token'
          },
          userProfile: {
            'GET /users/profile': 'Get current user profile',
            'PUT /users/profile': 'Update current user profile',
            'PUT /users/password': 'Update current user password'
          },
          adminOperations: {
            'GET /admin/users': 'List all users (admin only)',
            'GET /admin/users/:id': 'Get specific user (admin only)',
            'POST /admin/users': 'Create new user (admin only)',
            'PUT /admin/users/:id': 'Update user (admin only)',
            'DELETE /admin/users/:id': 'Delete user (admin only)',
            'POST /admin/users/:id/roles/:roleId': 'Assign role to user (admin only)',
            'DELETE /admin/users/:id/roles/:roleId': 'Remove role from user (admin only)'
          }
        },
        authentication: {
          type: 'Bearer Token',
          header: 'Authorization: Bearer <token>'
        }
      });
    });

    // 404 handler for undefined routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: any) => {
      console.error('Unhandled error:', error);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(isDevelopment && {
          details: error.message,
          stack: error.stack
        })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  // Async error wrapper to catch promise rejections
  private asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  public start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`🚀 User Management API server running on port ${port}`);
      console.log(`📚 API documentation available at http://localhost:${port}/api/docs`);
      console.log(`❤️  Health check available at http://localhost:${port}/health`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔧 Development mode - detailed error reporting enabled`);
      }
    });
  }
}

// Create and export app instance
export const createApp = (): UserManagementApp => {
  return new UserManagementApp();
};

// Start server if this file is run directly
if (require.main === module) {
  const app = createApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  app.start(port);
}