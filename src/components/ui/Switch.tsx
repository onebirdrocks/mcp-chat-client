import React from 'react';
import { useAccessibilityContext } from './AccessibilityProvider';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  children?: React.ReactNode;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  children,
}) => {
  const { isReducedMotion } = useAccessibilityContext();

  const sizeClasses = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4'
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7'
    }
  };

  const sizes = sizeClasses[size];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={ariaDescribedBy}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          ${sizes.track}
          relative inline-flex items-center rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isReducedMotion ? 'transition-none' : ''}
          ${checked 
            ? 'bg-blue-600 dark:bg-blue-500' 
            : 'bg-gray-200 dark:bg-gray-700'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-opacity-80'
          }
        `}
      >
        <span className="sr-only">
          {checked ? 'Enabled' : 'Disabled'}
        </span>
        <span
          className={`
            ${sizes.thumb}
            inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
            ${isReducedMotion ? 'transition-none' : ''}
            ${checked ? sizes.translate : 'translate-x-0'}
          `}
        />
      </button>
      {children && (
        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
          {children}
        </span>
      )}
    </div>
  );
};

export default Switch;