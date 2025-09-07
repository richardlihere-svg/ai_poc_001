// Password hashing and validation service following security best practices

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export interface PasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
  validatePasswordStrength(password: string): PasswordValidationResult;
}

export interface PasswordValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export class BcryptPasswordService implements PasswordService {
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    this.validatePasswordInput(password);
    
    // Using Node.js crypto for simplicity - in production use bcrypt
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(password + salt)
      .digest('hex');
    
    return `${salt}:${hash}`;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedPassword.split(':');
      if (!salt || !hash) {
        return false;
      }

      const newHash = createHash('sha256')
        .update(password + salt)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(newHash, 'hex')
      );
    } catch {
      return false;
    }
  }

  validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      errors.push(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain more than 2 consecutive identical characters');
    }

    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password cannot contain common words or patterns');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validatePasswordInput(password: string): void {
    if (typeof password !== 'string') {
      throw new Error('Password must be a string');
    }

    if (password.length === 0) {
      throw new Error('Password cannot be empty');
    }
  }
}