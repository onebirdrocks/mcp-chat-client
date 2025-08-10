import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

export interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  autoFit?: boolean;
  minItemWidth?: string;
}

/**
 * Responsive grid component that adapts column count based on screen size
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  autoFit = false,
  minItemWidth = '250px',
}) => {
  const { currentBreakpoint } = useResponsive();

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  // Determine current column count
  const getCurrentCols = () => {
    switch (currentBreakpoint) {
      case 'sm':
        return cols.sm || 1;
      case 'md':
        return cols.md || cols.sm || 2;
      case 'lg':
        return cols.lg || cols.md || cols.sm || 3;
      case 'xl':
      case '2xl':
        return cols.xl || cols.lg || cols.md || cols.sm || 4;
      default:
        return 1;
    }
  };

  const currentCols = getCurrentCols();

  const gridClasses = autoFit
    ? `grid grid-cols-[repeat(auto-fit,minmax(${minItemWidth},1fr))]`
    : `grid grid-cols-1 sm:grid-cols-${cols.sm || 1} md:grid-cols-${cols.md || 2} lg:grid-cols-${cols.lg || 3} xl:grid-cols-${cols.xl || 4}`;

  const containerClasses = [
    gridClasses,
    gapClasses[gap],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      data-cols={currentCols}
      style={autoFit ? {
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`
      } : undefined}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;