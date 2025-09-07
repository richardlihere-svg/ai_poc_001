// User management API controllers
// Handles HTTP requests and responses with proper error handling and validation

import { Request, Response } from 'express';
import { AuthService } from '../services/auth-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PasswordService } from '../services/password-service.js';
import {
  UserRegistrationData,
  UserLoginData,
  UserProfileUpdateData,
  PasswordUpdateData,
  UserNotFoundError,
  InvalidCredentialsError,
  UserAlreadyExistsError
} from '../types/user.js';

export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService
  ) {}

  // POST /auth/register
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: UserRegistrationData = this.validateRegistrationData(req.body);
      const result = await this.authService.register(userData);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // POST /auth/login
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: UserLoginData = this.validateLoginData(req.body);
      const result = await this.authService.login(loginData);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // POST /auth/refresh
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Token is required'
        });
        return;
      }

      const result = await this.authService.refreshToken(token);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // POST /auth/logout
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Token is required'
        });
        return;
      }

      await this.authService.logout(token);
      
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // GET /users/profile
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: req.user
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // PUT /users/profile
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const updateData: UserProfileUpdateData = this.validateProfileUpdateData(req.body);
      const updatedUser = await this.userRepository.updateProfile(req.user.id, updateData);
      
      res.status(200).json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          roles: updatedUser.roles,
          profile: updatedUser.profile,
          createdAt: updatedUser.createdAt,
          isActive: updatedUser.isActive
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // PUT /users/password
  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const passwordData: PasswordUpdateData = this.validatePasswordUpdateData(req.body);
      
      // Get current user to verify current password
      const currentUser = await this.userRepository.findById(req.user.id);
      if (!currentUser) {
        throw new UserNotFoundError(req.user.id);
      }

      // Verify current password
      const isCurrentPasswordValid = await this.passwordService.verifyPassword(
        passwordData.currentPassword,
        currentUser.hashedPassword
      );
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
        return;
      }

      // Validate new password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(passwordData.newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Password validation failed',
          details: passwordValidation.errors
        });
        return;
      }

      // Hash new password and update
      const hashedNewPassword = await this.passwordService.hashPassword(passwordData.newPassword);
      await this.userRepository.updatePassword(req.user.id, hashedNewPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private validateRegistrationData(body: any): UserRegistrationData {
    const { email, username, password, firstName, lastName, phone } = body;

    if (!email || typeof email !== 'string') {
      throw new Error('Valid email is required');
    }

    if (!username || typeof username !== 'string') {
      throw new Error('Valid username is required');
    }

    if (!password || typeof password !== 'string') {
      throw new Error('Valid password is required');
    }

    if (!firstName || typeof firstName !== 'string') {
      throw new Error('Valid first name is required');
    }

    if (!lastName || typeof lastName !== 'string') {
      throw new Error('Valid last name is required');
    }

    if (phone && typeof phone !== 'string') {
      throw new Error('Phone must be a string');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    return { email, username, password, firstName, lastName, phone };
  }

  private validateLoginData(body: any): UserLoginData {
    const { email, password } = body;

    if (!email || typeof email !== 'string') {
      throw new Error('Valid email is required');
    }

    if (!password || typeof password !== 'string') {
      throw new Error('Valid password is required');
    }

    return { email, password };
  }

  private validateProfileUpdateData(body: any): UserProfileUpdateData {
    const { firstName, lastName, phone, avatar } = body;
    const updateData: UserProfileUpdateData = {};

    if (firstName !== undefined) {
      if (typeof firstName !== 'string') {
        throw new Error('First name must be a string');
      }
      updateData.firstName = firstName;
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string') {
        throw new Error('Last name must be a string');
      }
      updateData.lastName = lastName;
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        throw new Error('Phone must be a string');
      }
      updateData.phone = phone;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string') {
        throw new Error('Avatar must be a string');
      }
      updateData.avatar = avatar;
    }

    return updateData;
  }

  private validatePasswordUpdateData(body: any): PasswordUpdateData {
    const { currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      throw new Error('Current password is required');
    }

    if (!newPassword || typeof newPassword !== 'string') {
      throw new Error('New password is required');
    }

    return { currentPassword, newPassword };
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof UserAlreadyExistsError) {
      res.status(409).json({
        success: false,
        error: error.message
      });
    } else if (error instanceof InvalidCredentialsError) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else if (error instanceof UserNotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}