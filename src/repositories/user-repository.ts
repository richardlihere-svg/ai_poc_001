// Repository layer following dependency inversion principle
// Defines contracts for data persistence without implementation details

import {
  User,
  UserRegistrationData,
  UserProfileUpdateData,
  Role,
  Permission
} from '../types/user.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(userData: UserRegistrationData & { hashedPassword: string }): Promise<User>;
  updateProfile(userId: string, profileData: UserProfileUpdateData): Promise<User>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  setActive(userId: string, isActive: boolean): Promise<void>;
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  findAll(limit?: number, offset?: number): Promise<User[]>;
  delete(userId: string): Promise<void>;
}

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  create(name: string, description: string, permissionIds: string[]): Promise<Role>;
  update(roleId: string, name: string, description: string): Promise<Role>;
  addPermission(roleId: string, permissionId: string): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
  delete(roleId: string): Promise<void>;
}

export interface PermissionRepository {
  findById(id: string): Promise<Permission | null>;
  findByResourceAndAction(resource: string, action: string): Promise<Permission | null>;
  findAll(): Promise<Permission[]>;
  create(resource: string, action: string, description: string): Promise<Permission>;
  delete(permissionId: string): Promise<void>;
}

// In-memory implementation for development and testing
export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();
  private nextId = 1;

  private generateId(): string {
    return (this.nextId++).toString();
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async create(userData: UserRegistrationData & { hashedPassword: string }): Promise<User> {
    const id = this.generateId();
    const now = new Date();
    
    const user: User = {
      id,
      email: userData.email,
      username: userData.username,
      hashedPassword: userData.hashedPassword,
      roles: [],
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone
      },
      createdAt: now,
      updatedAt: now,
      isActive: true
    };

    this.users.set(id, user);
    return user;
  }

  async updateProfile(userId: string, profileData: UserProfileUpdateData): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser: User = {
      ...user,
      profile: {
        ...user.profile,
        ...profileData
      },
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser: User = {
      ...user,
      hashedPassword,
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser: User = {
      ...user,
      profile: {
        ...user.profile,
        lastLoginAt: new Date()
      },
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
  }

  async setActive(userId: string, isActive: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser: User = {
      ...user,
      isActive,
      updatedAt: new Date()
    };

    this.users.set(userId, updatedUser);
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // This would need role repository integration in real implementation
    // For now, we'll skip the role assignment logic
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // This would need role repository integration in real implementation
  }

  async findAll(limit?: number, offset?: number): Promise<User[]> {
    const allUsers = Array.from(this.users.values());
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return allUsers.slice(start, end);
  }

  async delete(userId: string): Promise<void> {
    this.users.delete(userId);
  }
}