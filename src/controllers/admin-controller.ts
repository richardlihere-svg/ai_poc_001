// Admin-only user management API controllers
// Provides administrative functions for managing users and roles

import { Request, Response } from 'express';
import { UserRepository, RoleRepository } from '../repositories/user-repository.js';
import { PasswordService } from '../services/password-service.js';
import { UserNotFoundError } from '../types/user.js';

interface PaginationQuery {
  readonly limit?: number;
  readonly offset?: number;
}

interface CreateUserRequest {
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: string;
  readonly roleIds?: string[];
}

interface UpdateUserRequest {
  readonly email?: string;
  readonly username?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phone?: string;
  readonly isActive?: boolean;
}

export class AdminController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly passwordService: PasswordService
  ) {}

  // GET /admin/users
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset } = this.validatePaginationQuery(req.query);
      const users = await this.userRepository.findAll(limit, offset);
      
      // Remove sensitive data from response
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles,
        profile: user.profile,
        createdAt: user.createdAt,
        isActive: user.isActive
      }));

      res.status(200).json({
        success: true,
        data: {
          users: sanitizedUsers,
          pagination: {
            limit: limit || users.length,
            offset: offset || 0,
            total: users.length
          }
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // GET /admin/users/:id
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userRepository.findById(id);
      
      if (!user) {
        throw new UserNotFoundError(id);
      }

      // Remove sensitive data
      const sanitizedUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles,
        profile: user.profile,
        createdAt: user.createdAt,
        isActive: user.isActive
      };

      res.status(200).json({
        success: true,
        data: sanitizedUser
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // POST /admin/users
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData = this.validateCreateUserRequest(req.body);
      
      // Check if user already exists
      const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
      if (existingUserByEmail) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
        return;
      }

      const existingUserByUsername = await this.userRepository.findByUsername(userData.username);
      if (existingUserByUsername) {
        res.status(409).json({
          success: false,
          error: 'User with this username already exists'
        });
        return;
      }

      // Validate password strength
      const passwordValidation = this.passwordService.validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Password validation failed',
          details: passwordValidation.errors
        });
        return;
      }

      // Hash password and create user
      const hashedPassword = await this.passwordService.hashPassword(userData.password);
      const user = await this.userRepository.create({
        email: userData.email,
        username: userData.username,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        hashedPassword
      });

      // Assign roles if provided
      if (userData.roleIds && userData.roleIds.length > 0) {
        for (const roleId of userData.roleIds) {
          await this.userRepository.assignRole(user.id, roleId);
        }
      }

      // Return created user without sensitive data
      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          roles: user.roles,
          profile: user.profile,
          createdAt: user.createdAt,
          isActive: user.isActive
        }
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // PUT /admin/users/:id
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = this.validateUpdateUserRequest(req.body);
      
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new UserNotFoundError(id);
      }

      // Update profile if profile fields are provided
      if (updateData.firstName || updateData.lastName || updateData.phone) {
        await this.userRepository.updateProfile(id, {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          phone: updateData.phone
        });
      }

      // Update active status if provided
      if (updateData.isActive !== undefined) {
        await this.userRepository.setActive(id, updateData.isActive);
      }

      // Get updated user
      const updatedUser = await this.userRepository.findById(id);
      if (!updatedUser) {
        throw new UserNotFoundError(id);
      }

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

  // DELETE /admin/users/:id
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new UserNotFoundError(id);
      }

      await this.userRepository.delete(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // POST /admin/users/:id/roles/:roleId
  async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const { id, roleId } = req.params;
      
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new UserNotFoundError(id);
      }

      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }

      await this.userRepository.assignRole(id, roleId);

      res.status(200).json({
        success: true,
        message: 'Role assigned successfully'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  // DELETE /admin/users/:id/roles/:roleId
  async removeRole(req: Request, res: Response): Promise<void> {
    try {
      const { id, roleId } = req.params;
      
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new UserNotFoundError(id);
      }

      await this.userRepository.removeRole(id, roleId);

      res.status(200).json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private validatePaginationQuery(query: any): PaginationQuery {
    const result: PaginationQuery = {};

    if (query.limit) {
      const limit = parseInt(query.limit as string);
      if (isNaN(limit) || limit <= 0 || limit > 100) {
        throw new Error('Limit must be a positive number between 1 and 100');
      }
      result.limit = limit;
    }

    if (query.offset) {
      const offset = parseInt(query.offset as string);
      if (isNaN(offset) || offset < 0) {
        throw new Error('Offset must be a non-negative number');
      }
      result.offset = offset;
    }

    return result;
  }

  private validateCreateUserRequest(body: any): CreateUserRequest {
    const { email, username, password, firstName, lastName, phone, roleIds } = body;

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

    if (roleIds && (!Array.isArray(roleIds) || !roleIds.every(id => typeof id === 'string'))) {
      throw new Error('Role IDs must be an array of strings');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    return { email, username, password, firstName, lastName, phone, roleIds };
  }

  private validateUpdateUserRequest(body: any): UpdateUserRequest {
    const { email, username, firstName, lastName, phone, isActive } = body;
    const updateData: UpdateUserRequest = {};

    if (email !== undefined) {
      if (typeof email !== 'string') {
        throw new Error('Email must be a string');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }
      updateData.email = email;
    }

    if (username !== undefined) {
      if (typeof username !== 'string') {
        throw new Error('Username must be a string');
      }
      updateData.username = username;
    }

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

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        throw new Error('isActive must be a boolean');
      }
      updateData.isActive = isActive;
    }

    return updateData;
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof UserNotFoundError) {
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