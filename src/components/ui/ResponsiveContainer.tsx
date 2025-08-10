import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  center?: boolean;
}

/**
 * Responsive container component that adapts to different screen sizes
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'lg',
  padding = 'md',
  center = true,
}) => {
  const { isMobile, isTablet } = useResponsive();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-3 sm:px-6 lg:px-8',
    lg: 'px-4 sm:px-8 lg:px-12',
  };

  const containerClasses = [
    'w-full',
    maxWidthClasses[maxWidth],
    paddingClasses[padding],
    center ? 'mx-auto' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      data-mobile={isMobile}
      data-tablet={isTablet}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;