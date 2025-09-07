// User profile management component
// Allows users to view and update their profile information and password

import React, { useState, FormEvent } from 'react';
import { UserResponse, UserProfileUpdateData, PasswordUpdateData } from '../types/user.js';

interface UserProfileProps {
  user: UserResponse;
  onUpdateProfile: (profileData: UserProfileUpdateData) => Promise<void>;
  onUpdatePassword: (passwordData: PasswordUpdateData) => Promise<void>;
  isLoading?: boolean;
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  phone: string;
  errors: Record<string, string>;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  errors: Record<string, string>;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdateProfile,
  onUpdatePassword,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: user.profile.firstName,
    lastName: user.profile.lastName,
    phone: user.profile.phone || '',
    errors: {}
  });

  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    errors: {}
  });

  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!profileForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (profileForm.phone.trim() && !/^[+]?[\d\s\-\(\)]+$/.test(profileForm.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    setProfileForm(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordForm(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!validateProfileForm()) {
      return;
    }

    try {
      await onUpdateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim() || undefined
      });
      
      setProfileForm(prev => ({
        ...prev,
        errors: { success: 'Profile updated successfully' }
      }));
    } catch (error) {
      setProfileForm(prev => ({
        ...prev,
        errors: {
          submit: error instanceof Error ? error.message : 'Profile update failed'
        }
      }));
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    try {
      await onUpdatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        errors: { success: 'Password updated successfully' }
      });
    } catch (error) {
      setPasswordForm(prev => ({
        ...prev,
        errors: {
          submit: error instanceof Error ? error.message : 'Password update failed'
        }
      }));
    }
  };

  const handleProfileInputChange = (field: keyof Omit<ProfileFormState, 'errors'>) => 
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setProfileForm(prev => ({
        ...prev,
        [field]: value,
        errors: { ...prev.errors, [field]: '', submit: '', success: '' }
      }));
    };

  const handlePasswordInputChange = (field: keyof Omit<PasswordFormState, 'errors'>) => 
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setPasswordForm(prev => ({
        ...prev,
        [field]: value,
        errors: { ...prev.errors, [field]: '', submit: '', success: '' }
      }));
    };

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h2 className="profile-title">My Profile</h2>
        <div className="user-info">
          <p className="user-email">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="user-username">
            <strong>Username:</strong> {user.username}
          </p>
          <p className="user-roles">
            <strong>Roles:</strong> {user.roles.map(role => role.name).join(', ') || 'None'}
          </p>
          <p className="user-member-since">
            <strong>Member since:</strong> {new Date(user.createdAt).toLocaleDateString()}
          </p>
          {user.profile.lastLoginAt && (
            <p className="user-last-login">
              <strong>Last login:</strong> {new Date(user.profile.lastLoginAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'profile' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Information
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'password' ? 'tab-button-active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Change Password
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <h3 className="tab-title">Update Profile Information</h3>
            
            <form onSubmit={handleProfileSubmit} className="profile-form">
              {profileForm.errors.submit && (
                <div className="error-message" role="alert">
                  {profileForm.errors.submit}
                </div>
              )}
              
              {profileForm.errors.success && (
                <div className="success-message" role="alert">
                  {profileForm.errors.success}
                </div>
              )}

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="firstName" className="form-label">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={profileForm.firstName}
                    onChange={handleProfileInputChange('firstName')}
                    className={`form-input ${profileForm.errors.firstName ? 'form-input-error' : ''}`}
                    disabled={isLoading}
                    autoComplete="given-name"
                  />
                  {profileForm.errors.firstName && (
                    <span className="field-error" role="alert">
                      {profileForm.errors.firstName}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="lastName" className="form-label">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={profileForm.lastName}
                    onChange={handleProfileInputChange('lastName')}
                    className={`form-input ${profileForm.errors.lastName ? 'form-input-error' : ''}`}
                    disabled={isLoading}
                    autoComplete="family-name"
                  />
                  {profileForm.errors.lastName && (
                    <span className="field-error" role="alert">
                      {profileForm.errors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="phone" className="form-label">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={handleProfileInputChange('phone')}
                  className={`form-input ${profileForm.errors.phone ? 'form-input-error' : ''}`}
                  disabled={isLoading}
                  autoComplete="tel"
                />
                {profileForm.errors.phone && (
                  <span className="field-error" role="alert">
                    {profileForm.errors.phone}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="update-button"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="password-tab">
            <h3 className="tab-title">Change Password</h3>
            
            <form onSubmit={handlePasswordSubmit} className="password-form">
              {passwordForm.errors.submit && (
                <div className="error-message" role="alert">
                  {passwordForm.errors.submit}
                </div>
              )}
              
              {passwordForm.errors.success && (
                <div className="success-message" role="alert">
                  {passwordForm.errors.success}
                </div>
              )}

              <div className="form-field">
                <label htmlFor="currentPassword" className="form-label">
                  Current Password *
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange('currentPassword')}
                  className={`form-input ${passwordForm.errors.currentPassword ? 'form-input-error' : ''}`}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                {passwordForm.errors.currentPassword && (
                  <span className="field-error" role="alert">
                    {passwordForm.errors.currentPassword}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="newPassword" className="form-label">
                  New Password *
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange('newPassword')}
                  className={`form-input ${passwordForm.errors.newPassword ? 'form-input-error' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {passwordForm.errors.newPassword && (
                  <span className="field-error" role="alert">
                    {passwordForm.errors.newPassword}
                  </span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange('confirmPassword')}
                  className={`form-input ${passwordForm.errors.confirmPassword ? 'form-input-error' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {passwordForm.errors.confirmPassword && (
                  <span className="field-error" role="alert">
                    {passwordForm.errors.confirmPassword}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="update-button password-button"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// CSS-in-JS styles
export const userProfileStyles = `
.user-profile-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.profile-header {
  margin-bottom: 2rem;
}

.profile-title {
  margin-bottom: 1rem;
  color: #333;
  font-size: 1.8rem;
  font-weight: 600;
}

.user-info {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid #007bff;
}

.user-info p {
  margin: 0.5rem 0;
  color: #555;
}

.profile-tabs {
  display: flex;
  border-bottom: 2px solid #dee2e6;
  margin-bottom: 2rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: #007bff;
  background-color: #f8f9fa;
}

.tab-button-active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 500;
}

.profile-content {
  min-height: 400px;
}

.tab-title {
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.2rem;
  font-weight: 500;
}

.profile-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #555;
  font-size: 0.9rem;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input-error {
  border-color: #dc3545;
}

.form-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.field-error {
  color: #dc3545;
  font-size: 0.8rem;
}

.error-message {
  padding: 0.75rem;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  font-size: 0.9rem;
}

.success-message {
  padding: 0.75rem;
  background-color: #d1edff;
  color: #0c5460;
  border: 1px solid #bee5eb;
  border-radius: 4px;
  font-size: 0.9rem;
}

.update-button {
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  align-self: flex-start;
}

.update-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.update-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.password-button {
  background-color: #ffc107;
  color: #212529;
}

.password-button:hover:not(:disabled) {
  background-color: #e0a800;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .user-profile-container {
    padding: 1.5rem;
  }
  
  .profile-tabs {
    flex-direction: column;
  }
  
  .tab-button {
    text-align: left;
    border-bottom: 1px solid #dee2e6;
  }
  
  .tab-button-active {
    background-color: #f8f9fa;
    border-bottom-color: #dee2e6;
  }
}
`;