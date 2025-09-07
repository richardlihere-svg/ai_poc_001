// Core user management types following SOLID principles and type safety

export interface User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly hashedPassword: string;
  readonly roles: Role[];
  readonly profile: UserProfile;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isActive: boolean;
}

export interface UserProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: string;
  readonly avatar?: string;
  readonly lastLoginAt?: Date;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: Permission[];
  readonly createdAt: Date;
}

export interface Permission {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
  readonly description: string;
}

// Input DTOs for registration and updates
export interface UserRegistrationData {
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: string;
}

export interface UserLoginData {
  readonly email: string;
  readonly password: string;
}

export interface UserProfileUpdateData {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phone?: string;
  readonly avatar?: string;
}

export interface PasswordUpdateData {
  readonly currentPassword: string;
  readonly newPassword: string;
}

// Response DTOs (without sensitive data)
export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly roles: Role[];
  readonly profile: UserProfile;
  readonly createdAt: Date;
  readonly isActive: boolean;
}

export interface AuthenticationResult {
  readonly user: UserResponse;
  readonly token: string;
  readonly expiresAt: Date;
}

// Error types
export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(field: string, value: string) {
    super(`User with ${field} '${value}' already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class InsufficientPermissionsError extends Error {
  constructor(requiredPermission: string) {
    super(`Insufficient permissions: ${requiredPermission} required`);
    this.name = 'InsufficientPermissionsError';
  }
}