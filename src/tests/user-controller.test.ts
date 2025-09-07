// Tests for user controller endpoints
// Covers all HTTP endpoints and error scenarios

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { UserController } from '../controllers/user-controller.js';
import { DefaultAuthService } from '../services/auth-service.js';
import { InMemoryUserRepository } from '../repositories/user-repository.js';
import { BcryptPasswordService } from '../services/password-service.js';
import { UserResponse } from '../types/user.js';

// Mock Express Request and Response
const mockRequest = (body: any = {}, user?: UserResponse): Partial<Request> => ({
  body,
  user
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('UserController', () => {
  let userController: UserController;
  let authService: DefaultAuthService;
  let userRepository: InMemoryUserRepository;
  let passwordService: BcryptPasswordService;

  const mockUserData = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890'
  };

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    passwordService = new BcryptPasswordService();
    authService = new DefaultAuthService(userRepository, passwordService, {} as any);
    userController = new UserController(authService, userRepository, passwordService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const req = mockRequest(mockUserData);
      const res = mockResponse();

      jest.spyOn(authService, 'register').mockResolvedValueOnce({
        user: {
          id: '1',
          email: mockUserData.email,
          username: mockUserData.username,
          roles: [],
          profile: {
            firstName: mockUserData.firstName,
            lastName: mockUserData.lastName,
            phone: mockUserData.phone
          },
          createdAt: new Date(),
          isActive: true
        },
        token: 'mock-token',
        expiresAt: new Date()
      });

      await userController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: mockUserData.email,
            username: mockUserData.username
          }),
          token: 'mock-token'
        })
      });
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = { ...mockUserData, email: 'not-an-email' };
      const req = mockRequest(invalidData);
      const res = mockResponse();

      await userController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid email format'
      });
    });

    it('should reject registration with missing required fields', async () => {
      const incompleteData = { email: 'test@example.com' };
      const req = mockRequest(incompleteData);
      const res = mockResponse();

      await userController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid username is required'
      });
    });

    it('should handle service errors gracefully', async () => {
      const req = mockRequest(mockUserData);
      const res = mockResponse();

      jest.spyOn(authService, 'register').mockRejectedValueOnce(new Error('Service error'));

      await userController.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service error'
      });
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: mockUserData.email,
        password: mockUserData.password
      };
      const req = mockRequest(loginData);
      const res = mockResponse();

      jest.spyOn(authService, 'login').mockResolvedValueOnce({
        user: {
          id: '1',
          email: mockUserData.email,
          username: mockUserData.username,
          roles: [],
          profile: {
            firstName: mockUserData.firstName,
            lastName: mockUserData.lastName
          },
          createdAt: new Date(),
          isActive: true
        },
        token: 'mock-token',
        expiresAt: new Date()
      });

      await userController.login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          token: 'mock-token'
        })
      });
    });

    it('should reject login with missing credentials', async () => {
      const req = mockRequest({ email: 'test@example.com' });
      const res = mockResponse();

      await userController.login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Valid password is required'
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const req = mockRequest({ token: 'valid-token' });
      const res = mockResponse();

      jest.spyOn(authService, 'refreshToken').mockResolvedValueOnce({
        user: {
          id: '1',
          email: mockUserData.email,
          username: mockUserData.username,
          roles: [],
          profile: {
            firstName: mockUserData.firstName,
            lastName: mockUserData.lastName
          },
          createdAt: new Date(),
          isActive: true
        },
        token: 'new-mock-token',
        expiresAt: new Date()
      });

      await userController.refreshToken(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          token: 'new-mock-token'
        })
      });
    });

    it('should reject refresh without token', async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await userController.refreshToken(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token is required'
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const req = mockRequest({ token: 'valid-token' });
      const res = mockResponse();

      jest.spyOn(authService, 'logout').mockResolvedValueOnce();

      await userController.logout(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should reject logout without token', async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await userController.logout(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token is required'
      });
    });
  });

  describe('getProfile', () => {
    const mockUser: UserResponse = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      roles: [],
      profile: {
        firstName: 'John',
        lastName: 'Doe'
      },
      createdAt: new Date(),
      isActive: true
    };

    it('should return user profile for authenticated user', async () => {
      const req = mockRequest({}, mockUser);
      const res = mockResponse();

      await userController.getProfile(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should reject request without authentication', async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await userController.getProfile(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('updateProfile', () => {
    const mockUser: UserResponse = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      roles: [],
      profile: {
        firstName: 'John',
        lastName: 'Doe'
      },
      createdAt: new Date(),
      isActive: true
    };

    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890'
      };
      const req = mockRequest(updateData, mockUser);
      const res = mockResponse();

      const updatedUser = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          ...updateData
        },
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'updateProfile').mockResolvedValueOnce(updatedUser as any);

      await userController.updateProfile(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          profile: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+1234567890'
          })
        })
      });
    });

    it('should reject update without authentication', async () => {
      const req = mockRequest({ firstName: 'Jane' });
      const res = mockResponse();

      await userController.updateProfile(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should validate profile update data types', async () => {
      const invalidData = { firstName: 123 };
      const req = mockRequest(invalidData, mockUser);
      const res = mockResponse();

      await userController.updateProfile(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'First name must be a string'
      });
    });
  });

  describe('updatePassword', () => {
    const mockUser: UserResponse = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      roles: [],
      profile: {
        firstName: 'John',
        lastName: 'Doe'
      },
      createdAt: new Date(),
      isActive: true
    };

    it('should update password successfully', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };
      const req = mockRequest(passwordData, mockUser);
      const res = mockResponse();

      const fullUser = {
        ...mockUser,
        hashedPassword: 'old-hashed-password'
      };

      jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(fullUser as any);
      jest.spyOn(passwordService, 'verifyPassword').mockResolvedValueOnce(true);
      jest.spyOn(passwordService, 'validatePasswordStrength').mockReturnValueOnce({
        isValid: true,
        errors: []
      });
      jest.spyOn(passwordService, 'hashPassword').mockResolvedValueOnce('new-hashed-password');
      jest.spyOn(userRepository, 'updatePassword').mockResolvedValueOnce();

      await userController.updatePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password updated successfully'
      });
    });

    it('should reject password update with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword123!'
      };
      const req = mockRequest(passwordData, mockUser);
      const res = mockResponse();

      const fullUser = {
        ...mockUser,
        hashedPassword: 'old-hashed-password'
      };

      jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(fullUser as any);
      jest.spyOn(passwordService, 'verifyPassword').mockResolvedValueOnce(false);

      await userController.updatePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Current password is incorrect'
      });
    });

    it('should reject weak new password', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak'
      };
      const req = mockRequest(passwordData, mockUser);
      const res = mockResponse();

      const fullUser = {
        ...mockUser,
        hashedPassword: 'old-hashed-password'
      };

      jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(fullUser as any);
      jest.spyOn(passwordService, 'verifyPassword').mockResolvedValueOnce(true);
      jest.spyOn(passwordService, 'validatePasswordStrength').mockReturnValueOnce({
        isValid: false,
        errors: ['Password too weak']
      });

      await userController.updatePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Password validation failed',
        details: ['Password too weak']
      });
    });

    it('should reject password update without authentication', async () => {
      const req = mockRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      });
      const res = mockResponse();

      await userController.updatePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('validation helpers', () => {
    it('should validate email format correctly', async () => {
      const invalidEmails = ['not-email', '@example.com', 'user@', 'user@.com'];
      
      for (const email of invalidEmails) {
        const req = mockRequest({ ...mockUserData, email });
        const res = mockResponse();

        await userController.register(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid email format'
        });
      }
    });

    it('should accept valid emails', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@example-domain.com'
      ];
      
      for (const email of validEmails) {
        jest.spyOn(authService, 'register').mockResolvedValueOnce({
          user: {
            id: '1',
            email,
            username: 'testuser',
            roles: [],
            profile: {
              firstName: 'John',
              lastName: 'Doe'
            },
            createdAt: new Date(),
            isActive: true
          },
          token: 'mock-token',
          expiresAt: new Date()
        });

        const req = mockRequest({ ...mockUserData, email });
        const res = mockResponse();

        await userController.register(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(201);
      }
    });
  });
});