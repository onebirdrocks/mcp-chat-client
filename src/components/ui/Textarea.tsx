import React, { forwardRef, useEffect, useRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'default' | 'filled';
  autoResize?: boolean;
  maxRows?: number;
  minRows?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      loading = false,
      fullWidth = false,
      variant = 'default',
      autoResize = false,
      maxRows,
      minRows = 3,
      className = '',
      id,
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Merge refs
    const mergedRef = (element: HTMLTextAreaElement) => {
      textareaRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea || !autoResize) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate the new height
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const paddingTop = parseInt(getComputedStyle(textarea).paddingTop);
      const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom);
      
      let newHeight = scrollHeight;
      
      if (maxRows) {
        const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
        newHeight = Math.min(newHeight, maxHeight);
      }
      
      const minHeight = lineHeight * minRows + paddingTop + paddingBottom;
      newHeight = Math.max(newHeight, minHeight);
      
      textarea.style.height = `${newHeight}px`;
    };

    useEffect(() => {
      adjustHeight();
    }, [props.value, autoResize, maxRows, minRows]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        adjustHeight();
      }
      onChange?.(event);
    };

    const baseClasses = [
      'block px-3 py-2 border rounded-md shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      'transition-colors duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'resize-none', // Disable manual resize when auto-resize is enabled
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

    const textareaElement = (
      <div className="relative">
        <textarea
          ref={mergedRef}
          id={textareaId}
          className={`${baseClasses} ${variantClasses[variant]} ${
            loading ? 'pr-10' : ''
          } ${className}`}
          disabled={disabled || loading}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          rows={autoResize ? minRows : props.rows || minRows}
          onChange={handleChange}
          {...props}
        />
        {loading && (
          <div className="absolute top-3 right-3 pointer-events-none">
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
          </div>
        )}
      </div>
    );

    if (!label && !error && !helperText) {
      return textareaElement;
    }

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={textareaId}
            className={`block text-sm font-medium mb-1 ${
              error
                ? 'text-red-700 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {label}
          </label>
        )}
        {textareaElement}
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${textareaId}-helper`}
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;