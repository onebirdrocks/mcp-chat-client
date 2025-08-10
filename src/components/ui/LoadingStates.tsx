'use client';

import React from 'react';
import Spinner from './Spinner';

export interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children: React.ReactNode;
  className?: string;
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl';
  backdrop?: boolean;
}

/**
 * Loading overlay that can be placed over any content
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  text = 'Loading...',
  children,
  className = '',
  spinnerSize = 'md',
  backdrop = true
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div 
          className={`
            absolute inset-0 flex items-center justify-center z-50
            ${backdrop ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm' : ''}
            transition-opacity duration-200
          `}
          role="status"
          aria-live="polite"
          aria-label={text}
        >
          <div className="flex flex-col items-center space-y-3">
            <Spinner size={spinnerSize} />
            {text && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

/**
 * Skeleton loading placeholder
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = false,
  animate = true
}) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700
        ${animate ? 'animate-pulse' : ''}
        ${rounded ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  );
};

export interface MessageSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton for chat messages
 */
export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({
  count = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex space-x-3">
          {/* Avatar skeleton */}
          <Skeleton width={32} height={32} rounded className="flex-shrink-0" />
          
          {/* Message content skeleton */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton width={80} height={16} />
              <Skeleton width={60} height={12} />
            </div>
            <div className="space-y-1">
              <Skeleton width="100%" height={16} />
              <Skeleton width="85%" height={16} />
              <Skeleton width="60%" height={16} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export interface SessionSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton for session list items
 */
export const SessionSkeleton: React.FC<SessionSkeletonProps> = ({
  count = 5,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="p-3 border rounded-lg">
          <div className="space-y-2">
            <Skeleton width="80%" height={18} />
            <div className="flex items-center space-x-4">
              <Skeleton width={60} height={14} />
              <Skeleton width={40} height={14} />
              <Skeleton width={80} height={14} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export interface ProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

/**
 * Progress bar component for loading states
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  showPercentage = false,
  color = 'primary',
  size = 'md',
  animated = true
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`
            ${colorClasses[color]} ${sizeClasses[size]} rounded-full
            transition-all duration-300 ease-out
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

export interface PulsingDotProps {
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Pulsing dot indicator for active states
 */
export const PulsingDot: React.FC<PulsingDotProps> = ({
  className = '',
  color = 'primary',
  size = 'md'
}) => {
  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full animate-ping absolute`} />
      <div className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full`} />
    </div>
  );
};

export interface StreamingIndicatorProps {
  isStreaming: boolean;
  className?: string;
}

/**
 * Indicator for streaming content
 */
export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  isStreaming,
  className = ''
}) => {
  if (!isStreaming) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        AI is typing...
      </span>
    </div>
  );
};

export interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

/**
 * Button with integrated loading state
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  loadingText,
  className = '',
  disabled = false,
  onClick,
  variant = 'primary'
}) => {
  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      type="button"
    >
      {isLoading && (
        <Spinner size="sm" color={variant === 'outline' ? 'gray' : 'white'} className="mr-2" />
      )}
      {isLoading ? (loadingText || 'Loading...') : children}
    </button>
  );
};

export interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

/**
 * Fade transition component
 */
export const FadeTransition: React.FC<FadeTransitionProps> = ({
  show,
  children,
  className = '',
  duration = 200
}) => {
  return (
    <div
      className={`
        transition-opacity ease-in-out
        ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className}
      `}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

export interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
  duration?: number;
}

/**
 * Slide transition component
 */
export const SlideTransition: React.FC<SlideTransitionProps> = ({
  show,
  children,
  direction = 'up',
  className = '',
  duration = 300
}) => {
  const directionClasses = {
    up: show ? 'translate-y-0' : 'translate-y-full',
    down: show ? 'translate-y-0' : '-translate-y-full',
    left: show ? 'translate-x-0' : 'translate-x-full',
    right: show ? 'translate-x-0' : '-translate-x-full'
  };

  return (
    <div
      className={`
        transform transition-transform ease-in-out
        ${directionClasses[direction]}
        ${className}
      `}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};