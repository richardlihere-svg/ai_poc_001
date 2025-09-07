// Comprehensive tests for authentication service
// Tests all authentication flows and edge cases

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DefaultAuthService } from '../services/auth-service.js';
import { InMemoryUserRepository } from '../repositories/user-repository.js';
import { BcryptPasswordService } from '../services/password-service.js';
import { JWTTokenService } from '../services/token-service.js';
import {
  UserRegistrationData,
  UserLoginData,
  UserAlreadyExistsError,
  InvalidCredentialsError
} from '../types/user.js';

describe('DefaultAuthService', () => {
  let authService: DefaultAuthService;
  let userRepository: InMemoryUserRepository;
  let passwordService: BcryptPasswordService;
  let tokenService: JWTTokenService;

  const mockUserRegistrationData: UserRegistrationData = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890'
  };

  const mockUserLoginData: UserLoginData = {
    email: 'test@example.com',
    password: 'TestPassword123!'
  };

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    passwordService = new BcryptPasswordService();
    tokenService = new JWTTokenService('test-secret');
    authService = new DefaultAuthService(userRepository, passwordService, tokenService);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const result = await authService.register(mockUserRegistrationData);

      expect(result.user).toMatchObject({
        email: mockUserRegistrationData.email,
        username: mockUserRegistrationData.username,
        profile: {
          firstName: mockUserRegistrationData.firstName,
          lastName: mockUserRegistrationData.lastName,
          phone: mockUserRegistrationData.phone
        }
      });
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.user.id).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordData = {
        ...mockUserRegistrationData,
        password: 'weak'
      };

      await expect(authService.register(weakPasswordData))
        .rejects
        .toThrow(/Password validation failed/);
    });

    it('should reject registration with duplicate email', async () => {
      await authService.register(mockUserRegistrationData);

      const duplicateEmailData = {
        ...mockUserRegistrationData,
        username: 'different-username'
      };

      await expect(authService.register(duplicateEmailData))
        .rejects
        .toThrow(UserAlreadyExistsError);
    });

    it('should reject registration with duplicate username', async () => {
      await authService.register(mockUserRegistrationData);

      const duplicateUsernameData = {
        ...mockUserRegistrationData,
        email: 'different@example.com'
      };

      await expect(authService.register(duplicateUsernameData))
        .rejects
        .toThrow(UserAlreadyExistsError);
    });

    it('should handle optional phone field correctly', async () => {
      const dataWithoutPhone = {
        ...mockUserRegistrationData,
        phone: undefined
      };

      const result = await authService.register(dataWithoutPhone);
      expect(result.user.profile.phone).toBeUndefined();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register(mockUserRegistrationData);
    });

    it('should successfully login with valid credentials', async () => {
      const result = await authService.login(mockUserLoginData);

      expect(result.user.email).toBe(mockUserLoginData.email);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject login with invalid email', async () => {
      const invalidEmailData = {
        ...mockUserLoginData,
        email: 'nonexistent@example.com'
      };

      await expect(authService.login(invalidEmailData))
        .rejects
        .toThrow(InvalidCredentialsError);
    });

    it('should reject login with invalid password', async () => {
      const invalidPasswordData = {
        ...mockUserLoginData,
        password: 'wrongpassword'
      };

      await expect(authService.login(invalidPasswordData))
        .rejects
        .toThrow(InvalidCredentialsError);
    });

    it('should reject login for inactive user', async () => {
      const user = await userRepository.findByEmail(mockUserRegistrationData.email);
      if (user) {
        await userRepository.setActive(user.id, false);
      }

      await expect(authService.login(mockUserLoginData))
        .rejects
        .toThrow('User account is deactivated');
    });

    it('should update last login timestamp on successful login', async () => {
      const beforeLogin = new Date();
      await authService.login(mockUserLoginData);
      
      const user = await userRepository.findByEmail(mockUserRegistrationData.email);
      expect(user?.profile.lastLoginAt).toBeDefined();
      expect(user?.profile.lastLoginAt!.getTime()).toBeGreaterThan(beforeLogin.getTime());
    });
  });

  describe('validateToken', () => {
    let validToken: string;

    beforeEach(async () => {
      const registrationResult = await authService.register(mockUserRegistrationData);
      validToken = registrationResult.token;
    });

    it('should validate valid token and return user', async () => {
      const result = await authService.validateToken(validToken);
      
      expect(result.email).toBe(mockUserRegistrationData.email);
      expect(result.username).toBe(mockUserRegistrationData.username);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(authService.validateToken(invalidToken))
        .rejects
        .toThrow();
    });

    it('should reject token for inactive user', async () => {
      const user = await userRepository.findByEmail(mockUserRegistrationData.email);
      if (user) {
        await userRepository.setActive(user.id, false);
      }

      await expect(authService.validateToken(validToken))
        .rejects
        .toThrow('User account is deactivated');
    });
  });

  describe('refreshToken', () => {
    let validToken: string;

    beforeEach(async () => {
      const registrationResult = await authService.register(mockUserRegistrationData);
      validToken = registrationResult.token;
    });

    it('should refresh valid token', async () => {
      const result = await authService.refreshToken(validToken);
      
      expect(result.user.email).toBe(mockUserRegistrationData.email);
      expect(result.token).toBeDefined();
      expect(result.token).not.toBe(validToken); // Should be a new token
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject refresh for invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(authService.refreshToken(invalidToken))
        .rejects
        .toThrow();
    });
  });

  describe('logout', () => {
    let validToken: string;

    beforeEach(async () => {
      const registrationResult = await authService.register(mockUserRegistrationData);
      validToken = registrationResult.token;
    });

    it('should successfully logout user', async () => {
      await expect(authService.logout(validToken))
        .resolves
        .not
        .toThrow();

      // Token should be revoked after logout
      await expect(authService.validateToken(validToken))
        .rejects
        .toThrow('Token has been revoked');
    });
  });

  describe('edge cases and security', () => {
    it('should not expose password in user response', async () => {
      const result = await authService.register(mockUserRegistrationData);
      
      expect((result.user as any).hashedPassword).toBeUndefined();
      expect((result.user as any).password).toBeUndefined();
    });

    it('should handle concurrent registration attempts', async () => {
      const registrations = [
        authService.register(mockUserRegistrationData),
        authService.register({
          ...mockUserRegistrationData,
          username: 'different-user'
        })
      ];

      const [first, second] = await Promise.allSettled(registrations);
      
      expect(first.status).toBe('fulfilled');
      expect(second.status).toBe('rejected');
    });

    it('should validate email format during registration', async () => {
      const invalidEmailData = {
        ...mockUserRegistrationData,
        email: 'not-an-email'
      };

      // This would be handled by validation in the controller layer
      // but we can test password service directly
      await expect(authService.register(invalidEmailData))
        .rejects
        .toThrow();
    });
  });
});