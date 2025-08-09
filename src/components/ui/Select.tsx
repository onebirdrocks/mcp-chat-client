import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'default' | 'filled';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      loading = false,
      fullWidth = false,
      variant = 'default',
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = [
      'block px-3 py-2 border rounded-md shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      'transition-colors duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'appearance-none bg-no-repeat bg-right',
      fullWidth ? 'w-full' : '',
    ].join(' ');

    const variantClasses = {
      default: error
        ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white',
      filled: error
        ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white',
    };

    const selectElement = (
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={`${baseClasses} ${variantClasses[variant]} ${
            loading ? 'pr-10' : 'pr-8'
          } ${className}`}
          disabled={disabled || loading}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {loading ? (
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
          ) : (
            <svg
              className="h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    );

    if (!label && !error && !helperText) {
      return selectElement;
    }

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={selectId}
            className={`block text-sm font-medium mb-1 ${
              error
                ? 'text-red-700 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {label}
          </label>
        )}
        {selectElement}
        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${selectId}-helper`}
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;