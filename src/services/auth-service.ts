// Authentication service implementing business logic for user registration and login
// Follows single responsibility principle and dependency inversion

import {
  User,
  UserRegistrationData,
  UserLoginData,
  UserResponse,
  AuthenticationResult,
  UserNotFoundError,
  InvalidCredentialsError,
  UserAlreadyExistsError
} from '../types/user.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PasswordService } from './password-service.js';
import { TokenService } from './token-service.js';

export interface AuthService {
  register(userData: UserRegistrationData): Promise<AuthenticationResult>;
  login(loginData: UserLoginData): Promise<AuthenticationResult>;
  validateToken(token: string): Promise<UserResponse>;
  refreshToken(token: string): Promise<AuthenticationResult>;
  logout(token: string): Promise<void>;
}

export class DefaultAuthService implements AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService
  ) {}

  async register(userData: UserRegistrationData): Promise<AuthenticationResult> {
    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
    if (existingUserByEmail) {
      throw new UserAlreadyExistsError('email', userData.email);
    }

    const existingUserByUsername = await this.userRepository.findByUsername(userData.username);
    if (existingUserByUsername) {
      throw new UserAlreadyExistsError('username', userData.username);
    }

    // Hash password and create user
    const hashedPassword = await this.passwordService.hashPassword(userData.password);
    const user = await this.userRepository.create({
      ...userData,
      hashedPassword
    });

    // Generate authentication token
    const token = await this.tokenService.generateToken(user.id);
    const expiresAt = this.tokenService.getTokenExpiration();

    return {
      user: this.toUserResponse(user),
      token,
      expiresAt
    };
  }

  async login(loginData: UserLoginData): Promise<AuthenticationResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      loginData.password,
      user.hashedPassword
    );
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    // Update last login timestamp
    await this.userRepository.updateLastLogin(user.id);

    // Generate authentication token
    const token = await this.tokenService.generateToken(user.id);
    const expiresAt = this.tokenService.getTokenExpiration();

    return {
      user: this.toUserResponse(user),
      token,
      expiresAt
    };
  }

  async validateToken(token: string): Promise<UserResponse> {
    const userId = await this.tokenService.validateToken(token);
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    return this.toUserResponse(user);
  }

  async refreshToken(token: string): Promise<AuthenticationResult> {
    const userId = await this.tokenService.validateToken(token);
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    const newToken = await this.tokenService.generateToken(user.id);
    const expiresAt = this.tokenService.getTokenExpiration();

    return {
      user: this.toUserResponse(user),
      token: newToken,
      expiresAt
    };
  }

  async logout(token: string): Promise<void> {
    await this.tokenService.revokeToken(token);
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      profile: user.profile,
      createdAt: user.createdAt,
      isActive: user.isActive
    };
  }
}