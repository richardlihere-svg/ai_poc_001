// Registration form component with comprehensive validation
// Implements password strength checking and user-friendly error handling

import React, { useState, FormEvent } from 'react';
import { UserRegistrationData } from '../types/user.js';

interface RegisterFormProps {
  onRegister: (registrationData: UserRegistrationData) => Promise<void>;
  onNavigateToLogin: () => void;
  isLoading?: boolean;
}

interface RegisterFormState {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onNavigateToLogin,
  isLoading = false
}) => {
  const [formState, setFormState] = useState<RegisterFormState>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    errors: {}
  });

  const validatePasswordStrength = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Must contain at least one special character');
    }

    return errors;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formState.email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formState.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!formState.username.trim()) {
      errors.username = 'Username is required';
    } else if (formState.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formState.username)) {
      errors.username = 'Username can only contain letters, numbers, underscores, and dashes';
    }

    // Password validation
    if (!formState.password) {
      errors.password = 'Password is required';
    } else {
      const passwordErrors = validatePasswordStrength(formState.password);
      if (passwordErrors.length > 0) {
        errors.password = passwordErrors[0]; // Show first error
      }
    }

    // Confirm password validation
    if (!formState.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formState.password !== formState.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // First name validation
    if (!formState.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formState.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Phone validation (optional but validate if provided)
    if (formState.phone.trim() && !/^[+]?[\d\s\-\(\)]+$/.test(formState.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFormState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onRegister({
        email: formState.email.trim(),
        username: formState.username.trim(),
        password: formState.password,
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        phone: formState.phone.trim() || undefined
      });
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        errors: {
          submit: error instanceof Error ? error.message : 'Registration failed'
        }
      }));
    }
  };

  const handleInputChange = (field: keyof Omit<RegisterFormState, 'errors'>) => 
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setFormState(prev => ({
        ...prev,
        [field]: value,
        errors: { ...prev.errors, [field]: '', submit: '' }
      }));
    };

  const getPasswordStrengthInfo = (): React.ReactNode => {
    if (!formState.password) {
      return null;
    }

    const errors = validatePasswordStrength(formState.password);
    const strength = errors.length === 0 ? 'strong' : errors.length <= 2 ? 'medium' : 'weak';

    return (
      <div className={`password-strength password-strength-${strength}`}>
        <div className="password-strength-label">
          Password strength: <span className="strength-text">{strength}</span>
        </div>
        {errors.length > 0 && (
          <ul className="password-requirements">
            {errors.map((error, index) => (
              <li key={index} className="requirement-item">
                {error}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="register-form-container">
      <h2 className="register-form-title">Create Account</h2>
      
      <form onSubmit={handleSubmit} className="register-form">
        {formState.errors.submit && (
          <div className="error-message" role="alert">
            {formState.errors.submit}
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
              value={formState.firstName}
              onChange={handleInputChange('firstName')}
              className={`form-input ${formState.errors.firstName ? 'form-input-error' : ''}`}
              placeholder="Enter your first name"
              disabled={isLoading}
              autoComplete="given-name"
            />
            {formState.errors.firstName && (
              <span className="field-error" role="alert">
                {formState.errors.firstName}
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
              value={formState.lastName}
              onChange={handleInputChange('lastName')}
              className={`form-input ${formState.errors.lastName ? 'form-input-error' : ''}`}
              placeholder="Enter your last name"
              disabled={isLoading}
              autoComplete="family-name"
            />
            {formState.errors.lastName && (
              <span className="field-error" role="alert">
                {formState.errors.lastName}
              </span>
            )}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="email" className="form-label">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            value={formState.email}
            onChange={handleInputChange('email')}
            className={`form-input ${formState.errors.email ? 'form-input-error' : ''}`}
            placeholder="Enter your email address"
            disabled={isLoading}
            autoComplete="email"
          />
          {formState.errors.email && (
            <span className="field-error" role="alert">
              {formState.errors.email}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="username" className="form-label">
            Username *
          </label>
          <input
            id="username"
            type="text"
            value={formState.username}
            onChange={handleInputChange('username')}
            className={`form-input ${formState.errors.username ? 'form-input-error' : ''}`}
            placeholder="Choose a username"
            disabled={isLoading}
            autoComplete="username"
          />
          {formState.errors.username && (
            <span className="field-error" role="alert">
              {formState.errors.username}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="phone" className="form-label">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={formState.phone}
            onChange={handleInputChange('phone')}
            className={`form-input ${formState.errors.phone ? 'form-input-error' : ''}`}
            placeholder="Enter your phone number (optional)"
            disabled={isLoading}
            autoComplete="tel"
          />
          {formState.errors.phone && (
            <span className="field-error" role="alert">
              {formState.errors.phone}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="password" className="form-label">
            Password *
          </label>
          <input
            id="password"
            type="password"
            value={formState.password}
            onChange={handleInputChange('password')}
            className={`form-input ${formState.errors.password ? 'form-input-error' : ''}`}
            placeholder="Create a strong password"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {formState.errors.password && (
            <span className="field-error" role="alert">
              {formState.errors.password}
            </span>
          )}
          {getPasswordStrengthInfo()}
        </div>

        <div className="form-field">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password *
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formState.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            className={`form-input ${formState.errors.confirmPassword ? 'form-input-error' : ''}`}
            placeholder="Confirm your password"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {formState.errors.confirmPassword && (
            <span className="field-error" role="alert">
              {formState.errors.confirmPassword}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="register-button"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="register-form-footer">
        <p className="login-prompt">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="login-link"
            disabled={isLoading}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

// CSS-in-JS styles
export const registerFormStyles = `
.register-form-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.register-form-title {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.register-form {
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
  margin-top: 0.25rem;
}

.error-message {
  padding: 0.75rem;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  font-size: 0.9rem;
}

.password-strength {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.password-strength-weak {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.password-strength-medium {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.password-strength-strong {
  background-color: #d1edff;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.password-strength-label {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.strength-text {
  text-transform: capitalize;
}

.password-requirements {
  margin: 0.5rem 0 0 0;
  padding-left: 1rem;
}

.requirement-item {
  margin-bottom: 0.25rem;
}

.register-button {
  padding: 0.75rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.register-button:hover:not(:disabled) {
  background-color: #218838;
}

.register-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.register-form-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.login-prompt {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.login-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}

.login-link:hover:not(:disabled) {
  color: #0056b3;
}

.login-link:disabled {
  color: #6c757d;
  cursor: not-allowed;
  text-decoration: none;
}

@media (max-width: 500px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .register-form-container {
    padding: 1.5rem;
  }
}
`;