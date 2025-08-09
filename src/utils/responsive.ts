/**
 * Responsive utility functions and hooks
 */
import { useState, useEffect } from 'react';

// Breakpoint definitions (matching Tailwind CSS)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to detect current screen size
 */
export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('sm');
  const [windowWidth, setWindowWidth] = useState<number>(0);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else {
        setCurrentBreakpoint('sm');
      }
    };

    // Set initial value
    updateBreakpoint();

    // Add event listener
    window.addEventListener('resize', updateBreakpoint);

    // Cleanup
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    currentBreakpoint,
    windowWidth,
    isMobile: windowWidth < breakpoints.md,
    isTablet: windowWidth >= breakpoints.md && windowWidth < breakpoints.lg,
    isDesktop: windowWidth >= breakpoints.lg,
    isLargeDesktop: windowWidth >= breakpoints.xl,
  };
}

/**
 * Hook to detect if the screen is mobile size
 */
export function useIsMobile() {
  const { isMobile } = useBreakpoint();
  return isMobile;
}

/**
 * Hook to detect touch device
 */
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
}

/**
 * Utility function to get responsive classes based on screen size
 */
export function getResponsiveClasses(
  classes: Partial<Record<Breakpoint | 'base', string>>,
  currentBreakpoint: Breakpoint
): string {
  const orderedBreakpoints: (Breakpoint | 'base')[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
  
  let applicableClass = classes.base || '';
  
  for (const bp of orderedBreakpoints) {
    if (bp === 'base') continue;
    
    const bpIndex = orderedBreakpoints.indexOf(bp);
    const currentIndex = orderedBreakpoints.indexOf(currentBreakpoint);
    
    if (bpIndex <= currentIndex && classes[bp]) {
      applicableClass = classes[bp] || applicableClass;
    }
  }
  
  return applicableClass;
}

/**
 * Utility function to get responsive padding/margin classes
 */
export function getResponsiveSpacing(
  spacing: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  }
): string {
  const { mobile = 'p-3', tablet = 'sm:p-4', desktop = 'lg:p-6' } = spacing;
  return `${mobile} ${tablet} ${desktop}`;
}

/**
 * Utility function to get responsive text size classes
 */
export function getResponsiveTextSize(
  sizes: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  }
): string {
  const { mobile = 'text-sm', tablet = 'sm:text-base', desktop = 'lg:text-lg' } = sizes;
  return `${mobile} ${tablet} ${desktop}`;
}

/**
 * Utility function to handle responsive grid columns
 */
export function getResponsiveGridCols(
  cols: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  }
): string {
  const { mobile = 1, tablet = 2, desktop = 3 } = cols;
  return `grid-cols-${mobile} sm:grid-cols-${tablet} lg:grid-cols-${desktop}`;
}