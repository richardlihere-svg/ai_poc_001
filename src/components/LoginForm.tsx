// Login form component with validation and error handling
// Follows React best practices and TypeScript safety

import React, { useState, FormEvent } from 'react';
import { UserLoginData } from '../types/user.js';

interface LoginFormProps {
  onLogin: (loginData: UserLoginData) => Promise<void>;
  onNavigateToRegister: () => void;
  isLoading?: boolean;
}

interface LoginFormState {
  email: string;
  password: string;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onNavigateToRegister,
  isLoading = false
}) => {
  const [formState, setFormState] = useState<LoginFormState>({
    email: '',
    password: '',
    errors: {}
  });

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formState.email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formState.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formState.password) {
      errors.password = 'Password is required';
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
      await onLogin({
        email: formState.email.trim(),
        password: formState.password
      });
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        errors: {
          submit: error instanceof Error ? error.message : 'Login failed'
        }
      }));
    }
  };

  const handleInputChange = (field: keyof Pick<LoginFormState, 'email' | 'password'>) => 
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setFormState(prev => ({
        ...prev,
        [field]: value,
        errors: { ...prev.errors, [field]: '', submit: '' }
      }));
    };

  return (
    <div className="login-form-container">
      <h2 className="login-form-title">Sign In</h2>
      
      <form onSubmit={handleSubmit} className="login-form">
        {formState.errors.submit && (
          <div className="error-message" role="alert">
            {formState.errors.submit}
          </div>
        )}

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
            placeholder="Enter your email"
            disabled={isLoading}
            autoComplete="email"
            aria-describedby={formState.errors.email ? 'email-error' : undefined}
          />
          {formState.errors.email && (
            <span id="email-error" className="field-error" role="alert">
              {formState.errors.email}
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
            placeholder="Enter your password"
            disabled={isLoading}
            autoComplete="current-password"
            aria-describedby={formState.errors.password ? 'password-error' : undefined}
          />
          {formState.errors.password && (
            <span id="password-error" className="field-error" role="alert">
              {formState.errors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="login-form-footer">
        <p className="register-prompt">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="register-link"
            disabled={isLoading}
          >
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
};

// CSS-in-JS styles (can be moved to external stylesheet)
export const loginFormStyles = `
.login-form-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.login-form-title {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.login-button {
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.login-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.login-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.login-form-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.register-prompt {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.register-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}

.register-link:hover:not(:disabled) {
  color: #0056b3;
}

.register-link:disabled {
  color: #6c757d;
  cursor: not-allowed;
  text-decoration: none;
}
`;