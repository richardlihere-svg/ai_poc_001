// JWT token service for authentication and authorization
// Handles token generation, validation, and revocation

import { createHmac, randomBytes } from 'node:crypto';

export interface TokenService {
  generateToken(userId: string): Promise<string>;
  validateToken(token: string): Promise<string>;
  revokeToken(token: string): Promise<void>;
  getTokenExpiration(): Date;
}

interface TokenPayload {
  readonly userId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export class JWTTokenService implements TokenService {
  private readonly secret: string;
  private readonly expirationHours = 24;
  private readonly revokedTokens = new Set<string>();

  constructor(secret?: string) {
    this.secret = secret || this.generateSecret();
  }

  async generateToken(userId: string): Promise<string> {
    const now = Date.now();
    const expiresAt = now + (this.expirationHours * 60 * 60 * 1000);

    const payload: TokenPayload = {
      userId,
      issuedAt: now,
      expiresAt
    };

    return this.createToken(payload);
  }

  async validateToken(token: string): Promise<string> {
    if (this.revokedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    const payload = this.decodeToken(token);
    
    if (Date.now() > payload.expiresAt) {
      throw new Error('Token has expired');
    }

    return payload.userId;
  }

  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);
  }

  getTokenExpiration(): Date {
    const expirationMs = Date.now() + (this.expirationHours * 60 * 60 * 1000);
    return new Date(expirationMs);
  }

  private createToken(payload: TokenPayload): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    
    const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private decodeToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = this.createSignature(`${encodedHeader}.${encodedPayload}`);
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    try {
      const payloadJson = this.base64UrlDecode(encodedPayload);
      return JSON.parse(payloadJson);
    } catch {
      throw new Error('Invalid token payload');
    }
  }

  private createSignature(data: string): string {
    return createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }

  private base64UrlEncode(data: string): string {
    return Buffer.from(data)
      .toString('base64url');
  }

  private base64UrlDecode(data: string): string {
    return Buffer.from(data, 'base64url')
      .toString('utf-8');
  }

  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }
}