import React, { forwardRef, useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'default' | 'filled';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      loading = false,
      fullWidth = false,
      variant = 'default',
      className = '',
      id,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [, setIsFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;

    const baseClasses = [
      'block px-3 py-2 border rounded-md shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      'transition-colors duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth ? 'w-full' : '',
    ].join(' ');

    const variantClasses = {
      default: error
        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400',
      filled: error
        ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400',
    };

    const LoadingSpinner = () => (
      <svg
        className="animate-spin h-4 w-4 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    const inputElement = (
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400" aria-hidden="true">{leftIcon}</span>
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`${baseClasses} ${variantClasses[variant]} ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon || loading ? 'pr-10' : ''} ${className}`}
          disabled={disabled || loading}
          aria-invalid={error ? 'true' : 'false'}
          aria-busy={loading}
          aria-required={props.required}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {(rightIcon || loading) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {loading ? <LoadingSpinner /> : <span className="text-gray-400" aria-hidden="true">{rightIcon}</span>}
          </div>
        )}
      </div>
    );

    if (!label && !error && !helperText) {
      return inputElement;
    }

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-sm font-medium mb-1 ${
              error
                ? 'text-red-700 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {label}
          </label>
        )}
        {inputElement}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;