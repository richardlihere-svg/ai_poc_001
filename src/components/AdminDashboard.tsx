// Admin dashboard for managing users and roles
// Provides comprehensive user management functionality with search, filtering, and CRUD operations

import React, { useState, useEffect, FormEvent } from 'react';
import { UserResponse, Role } from '../types/user.js';

interface AdminDashboardProps {
  onGetUsers: (limit?: number, offset?: number) => Promise<{ users: UserResponse[]; total: number }>;
  onGetUserById: (id: string) => Promise<UserResponse>;
  onCreateUser: (userData: CreateUserData) => Promise<UserResponse>;
  onUpdateUser: (id: string, userData: UpdateUserData) => Promise<UserResponse>;
  onDeleteUser: (id: string) => Promise<void>;
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onRemoveRole: (userId: string, roleId: string) => Promise<void>;
  onGetRoles: () => Promise<Role[]>;
  isLoading?: boolean;
}

interface CreateUserData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleIds?: string[];
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
}

interface UserFormState {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleIds: string[];
  errors: Record<string, string>;
}

type ModalType = 'create' | 'edit' | 'delete' | 'roles' | null;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onGetUsers,
  onGetUserById,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onAssignRole,
  onRemoveRole,
  onGetRoles,
  isLoading = false
}) => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const USERS_PER_PAGE = 10;

  const [userForm, setUserForm] = useState<UserFormState>({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleIds: [],
    errors: {}
  });

  const resetUserForm = (): void => {
    setUserForm({
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      roleIds: [],
      errors: {}
    });
  };

  const loadUsers = async (page: number = 1): Promise<void> => {
    try {
      const offset = (page - 1) * USERS_PER_PAGE;
      const result = await onGetUsers(USERS_PER_PAGE, offset);
      setUsers(result.users);
      setTotalUsers(result.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadRoles = async (): Promise<void> => {
    try {
      const rolesData = await onGetRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    
    if (!validateUserForm()) {
      return;
    }

    try {
      await onCreateUser({
        email: userForm.email.trim(),
        username: userForm.username.trim(),
        password: userForm.password,
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        phone: userForm.phone.trim() || undefined,
        roleIds: userForm.roleIds
      });

      setActiveModal(null);
      resetUserForm();
      await loadUsers(currentPage);
    } catch (error) {
      setUserForm(prev => ({
        ...prev,
        errors: {
          submit: error instanceof Error ? error.message : 'Failed to create user'
        }
      }));
    }
  };

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    
    if (!selectedUser || !validateUserForm(false)) {
      return;
    }

    try {
      await onUpdateUser(selectedUser.id, {
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        phone: userForm.phone.trim() || undefined
      });

      setActiveModal(null);
      resetUserForm();
      await loadUsers(currentPage);
    } catch (error) {
      setUserForm(prev => ({
        ...prev,
        errors: {
          submit: error instanceof Error ? error.message : 'Failed to update user'
        }
      }));
    }
  };

  const handleDeleteUser = async (): Promise<void> => {
    if (!selectedUser) return;

    try {
      await onDeleteUser(selectedUser.id);
      setActiveModal(null);
      setSelectedUser(null);
      await loadUsers(currentPage);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const validateUserForm = (includePasswordValidation = true): boolean => {
    const errors: Record<string, string> = {};

    if (!userForm.email.trim()) {
      errors.email = 'Email is required';
    }

    if (!userForm.username.trim()) {
      errors.username = 'Username is required';
    }

    if (includePasswordValidation && !userForm.password) {
      errors.password = 'Password is required';
    }

    if (!userForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!userForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    setUserForm(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = (): void => {
    resetUserForm();
    setActiveModal('create');
  };

  const openEditModal = (user: UserResponse): void => {
    setSelectedUser(user);
    setUserForm({
      email: user.email,
      username: user.username,
      password: '',
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      phone: user.profile.phone || '',
      roleIds: user.roles.map(role => role.id),
      errors: {}
    });
    setActiveModal('edit');
  };

  const openDeleteModal = (user: UserResponse): void => {
    setSelectedUser(user);
    setActiveModal('delete');
  };

  const openRolesModal = (user: UserResponse): void => {
    setSelectedUser(user);
    setActiveModal('roles');
  };

  const closeModal = (): void => {
    setActiveModal(null);
    setSelectedUser(null);
    resetUserForm();
  };

  const handleInputChange = (field: keyof Omit<UserFormState, 'errors'>) => 
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      const value = event.target.value;
      setUserForm(prev => ({
        ...prev,
        [field]: field === 'roleIds' ? [value] : value,
        errors: { ...prev.errors, [field]: '', submit: '' }
      }));
    };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">User Management</h1>
        <div className="dashboard-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="create-button"
            disabled={isLoading}
          >
            Create User
          </button>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Username</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{`${user.profile.firstName} ${user.profile.lastName}`}</td>
                <td>{user.email}</td>
                <td>{user.username}</td>
                <td>
                  <div className="roles-cell">
                    {user.roles.map(role => (
                      <span key={role.id} className="role-badge">
                        {role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openRolesModal(user)}
                      className="roles-button"
                    >
                      Roles
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(user)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <p>No users found matching your search criteria.</p>
          </div>
        )}
      </div>

      <div className="pagination">
        <button
          type="button"
          onClick={() => loadUsers(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="pagination-button"
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => loadUsers(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="pagination-button"
        >
          Next
        </button>
      </div>

      {/* Create/Edit User Modal */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeModal === 'create' ? 'Create New User' : 'Edit User'}</h3>
              <button type="button" onClick={closeModal} className="close-button">
                ×
              </button>
            </div>

            <form onSubmit={activeModal === 'create' ? handleCreateUser : handleUpdateUser}>
              {userForm.errors.submit && (
                <div className="error-message">
                  {userForm.errors.submit}
                </div>
              )}

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    value={userForm.firstName}
                    onChange={handleInputChange('firstName')}
                    className={`form-input ${userForm.errors.firstName ? 'form-input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {userForm.errors.firstName && (
                    <span className="field-error">{userForm.errors.firstName}</span>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    value={userForm.lastName}
                    onChange={handleInputChange('lastName')}
                    className={`form-input ${userForm.errors.lastName ? 'form-input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {userForm.errors.lastName && (
                    <span className="field-error">{userForm.errors.lastName}</span>
                  )}
                </div>
              </div>

              {activeModal === 'create' && (
                <>
                  <div className="form-field">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={handleInputChange('email')}
                      className={`form-input ${userForm.errors.email ? 'form-input-error' : ''}`}
                      disabled={isLoading}
                    />
                    {userForm.errors.email && (
                      <span className="field-error">{userForm.errors.email}</span>
                    )}
                  </div>

                  <div className="form-field">
                    <label className="form-label">Username *</label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={handleInputChange('username')}
                      className={`form-input ${userForm.errors.username ? 'form-input-error' : ''}`}
                      disabled={isLoading}
                    />
                    {userForm.errors.username && (
                      <span className="field-error">{userForm.errors.username}</span>
                    )}
                  </div>

                  <div className="form-field">
                    <label className="form-label">Password *</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={handleInputChange('password')}
                      className={`form-input ${userForm.errors.password ? 'form-input-error' : ''}`}
                      disabled={isLoading}
                    />
                    {userForm.errors.password && (
                      <span className="field-error">{userForm.errors.password}</span>
                    )}
                  </div>
                </>
              )}

              <div className="form-field">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  value={userForm.phone}
                  onChange={handleInputChange('phone')}
                  className="form-input"
                  disabled={isLoading}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : activeModal === 'create' ? 'Create User' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {activeModal === 'delete' && selectedUser && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete User</h3>
              <button type="button" onClick={closeModal} className="close-button">
                ×
              </button>
            </div>

            <div className="delete-confirmation">
              <p>
                Are you sure you want to delete user{' '}
                <strong>{selectedUser.profile.firstName} {selectedUser.profile.lastName}</strong>{' '}
                ({selectedUser.email})?
              </p>
              <p className="warning-text">
                This action cannot be undone.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeModal}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="delete-confirm-button"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS-in-JS styles would go here (similar to previous components)
export const adminDashboardStyles = `
/* Comprehensive styles for admin dashboard would be defined here */
.admin-dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-title {
  margin: 0;
  font-size: 1.8rem;
  color: #333;
}

.dashboard-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.create-button {
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.users-table th,
.users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: #007bff;
  color: white;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-right: 0.25rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.edit-button,
.roles-button,
.delete-button {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.edit-button {
  background-color: #ffc107;
  color: #212529;
}

.roles-button {
  background-color: #6f42c1;
  color: white;
}

.delete-button {
  background-color: #dc3545;
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-input-error {
  border-color: #dc3545;
}

.field-error {
  color: #dc3545;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-button {
  padding: 0.5rem 1rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-confirm-button {
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.pagination-button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
`;