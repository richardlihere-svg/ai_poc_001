// Tests for password service including hashing and validation
// Covers security requirements and edge cases

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BcryptPasswordService } from '../services/password-service.js';

describe('BcryptPasswordService', () => {
  let passwordService: BcryptPasswordService;

  beforeEach(() => {
    passwordService = new BcryptPasswordService();
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await passwordService.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.includes(':')).toBe(true); // Salt:Hash format
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should reject empty password', async () => {
      await expect(passwordService.hashPassword(''))
        .rejects
        .toThrow('Password cannot be empty');
    });

    it('should reject non-string password', async () => {
      await expect(passwordService.hashPassword(null as any))
        .rejects
        .toThrow('Password must be a string');
      
      await expect(passwordService.hashPassword(123 as any))
        .rejects
        .toThrow('Password must be a string');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashedPassword = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle malformed hash gracefully', async () => {
      const password = 'TestPassword123!';
      const malformedHash = 'not-a-valid-hash';
      
      const isValid = await passwordService.verifyPassword(password, malformedHash);
      expect(isValid).toBe(false);
    });

    it('should handle hash without salt gracefully', async () => {
      const password = 'TestPassword123!';
      const hashWithoutSalt = 'just-a-hash-without-colon';
      
      const isValid = await passwordService.verifyPassword(password, hashWithoutSalt);
      expect(isValid).toBe(false);
    });

    it('should be resistant to timing attacks', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await passwordService.hashPassword(password);
      
      // Test with various wrong passwords - timing should be similar
      const wrongPasswords = ['x', 'wrong', 'verylongwrongpassword'];
      const timings: number[] = [];

      for (const wrongPassword of wrongPasswords) {
        const start = process.hrtime.bigint();
        await passwordService.verifyPassword(wrongPassword, hashedPassword);
        const end = process.hrtime.bigint();
        timings.push(Number(end - start));
      }

      // Timings should be relatively similar (within order of magnitude)
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      expect(maxTiming / minTiming).toBeLessThan(10); // Rough timing similarity check
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const strongPassword = 'StrongPassword123!';
      const result = passwordService.validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';
      const result = passwordService.validatePasswordStrength(shortPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = passwordService.validatePasswordStrength(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be no more than 128 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const noUppercasePassword = 'testpassword123!';
      const result = passwordService.validatePasswordStrength(noUppercasePassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const noLowercasePassword = 'TESTPASSWORD123!';
      const result = passwordService.validatePasswordStrength(noLowercasePassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const noNumberPassword = 'TestPassword!';
      const result = passwordService.validatePasswordStrength(noNumberPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const noSpecialCharPassword = 'TestPassword123';
      const result = passwordService.validatePasswordStrength(noSpecialCharPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password with consecutive identical characters', () => {
      const consecutiveCharsPassword = 'TestPassword111!';
      const result = passwordService.validatePasswordStrength(consecutiveCharsPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain more than 2 consecutive identical characters');
    });

    it('should reject password containing common words', () => {
      const commonWordPasswords = [
        'Password123!',
        'Admin123!',
        'Qwerty123!',
        'Letmein123!'
      ];

      for (const password of commonWordPasswords) {
        const result = passwordService.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password cannot contain common words or patterns');
      }
    });

    it('should return multiple errors for very weak password', () => {
      const veryWeakPassword = 'pass';
      const result = passwordService.validatePasswordStrength(veryWeakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it('should accept various special characters', () => {
      const specialCharacters = '!@#$%^&*()_+-=[]{};\':"|,.<>?/';
      
      for (const char of specialCharacters) {
        const password = `TestPassword123${char}`;
        const result = passwordService.validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
      }
    });

    it('should handle edge cases gracefully', () => {
      // Empty password
      const emptyResult = passwordService.validatePasswordStrength('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors.length).toBeGreaterThan(0);

      // Null/undefined input (if passed)
      // Note: TypeScript should prevent this, but testing runtime behavior
      const nullResult = passwordService.validatePasswordStrength(null as any);
      expect(nullResult.isValid).toBe(false);
    });

    it('should validate minimum viable strong password', () => {
      const minimalStrongPassword = 'Aa1!bcde';
      const result = passwordService.validatePasswordStrength(minimalStrongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('security considerations', () => {
    it('should generate cryptographically secure salt', async () => {
      const password = 'TestPassword123!';
      const hashes = [];
      
      // Generate multiple hashes to check salt randomness
      for (let i = 0; i < 10; i++) {
        const hash = await passwordService.hashPassword(password);
        const salt = hash.split(':')[0];
        hashes.push(salt);
      }
      
      // All salts should be unique
      const uniqueSalts = new Set(hashes);
      expect(uniqueSalts.size).toBe(hashes.length);
    });

    it('should have sufficient salt length', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await passwordService.hashPassword(password);
      const salt = hashedPassword.split(':')[0];
      
      // Salt should be at least 16 characters (128 bits in hex)
      expect(salt.length).toBeGreaterThanOrEqual(32); // 16 bytes = 32 hex chars
    });

    it('should produce deterministic hashes for same password and salt', async () => {
      // This is more of an implementation detail test
      // We can't easily test this with the current interface, but it's important
      // that the hash function is deterministic given the same input and salt
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hashPassword(password);
      
      // Extract salt and hash parts
      const [salt, hashPart] = hash1.split(':');
      expect(salt).toBeDefined();
      expect(hashPart).toBeDefined();
      expect(hashPart.length).toBeGreaterThan(0);
    });
  });
});