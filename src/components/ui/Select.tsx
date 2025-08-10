import React, { useState, useRef, useEffect } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { isReducedMotion, announceToScreenReader } = useAccessibilityContext();

  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            onChange(option.value);
            announceToScreenReader(`Selected ${option.label}`, 'polite');
            setIsOpen(false);
            setFocusedIndex(-1);
          }
        } else {
          setIsOpen(!isOpen);
          if (!isOpen) {
            const currentIndex = options.findIndex(opt => opt.value === value);
            setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          const nextIndex = Math.min(focusedIndex + 1, options.length - 1);
          setFocusedIndex(nextIndex);
          announceToScreenReader(options[nextIndex].label, 'polite');
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.length - 1);
        } else {
          const prevIndex = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIndex);
          announceToScreenReader(options[prevIndex].label, 'polite');
        }
        break;
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(0);
          announceToScreenReader(options[0].label, 'polite');
        }
        break;
      case 'End':
        if (isOpen) {
          event.preventDefault();
          setFocusedIndex(options.length - 1);
          announceToScreenReader(options[options.length - 1].label, 'polite');
        }
        break;
    }
  };

  const handleOptionClick = (option: SelectOption) => {
    if (!option.disabled) {
      onChange(option.value);
      announceToScreenReader(`Selected ${option.label}`, 'polite');
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-describedby={ariaDescribedBy}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          relative w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
          rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled 
            ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
            : 'hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isReducedMotion ? '' : 'transition-colors duration-150'}
        `}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transform ${isOpen ? 'rotate-180' : ''} ${
              isReducedMotion ? '' : 'transition-transform duration-150'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby={id}
          className={`
            absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 
            text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none
            ${isReducedMotion ? '' : 'transition-opacity duration-150'}
          `}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleOptionClick(option)}
              className={`
                cursor-default select-none relative py-2 pl-3 pr-9
                ${option.disabled 
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                  : 'text-gray-900 dark:text-white cursor-pointer'
                }
                ${index === focusedIndex 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                  : option.disabled 
                    ? '' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${option.value === value ? 'font-semibold' : 'font-normal'}
              `}
            >
              <span className="block truncate">{option.label}</span>
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Select;