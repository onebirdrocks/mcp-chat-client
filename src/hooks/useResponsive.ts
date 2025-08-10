import { useState, useEffect } from 'react';

export interface BreakpointConfig {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  currentBreakpoint: keyof BreakpointConfig;
  width: number;
  height: number;
}

// Tailwind CSS default breakpoints
const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Hook for responsive design utilities
 * Provides current screen size information and breakpoint detection
 */
export const useResponsive = (breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        currentBreakpoint: 'lg',
        width: 1024,
        height: 768,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
      isLargeDesktop: width >= breakpoints.xl,
      currentBreakpoint: getCurrentBreakpoint(width, breakpoints),
      width,
      height,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState({
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
        isLargeDesktop: width >= breakpoints.xl,
        currentBreakpoint: getCurrentBreakpoint(width, breakpoints),
        width,
        height,
      });
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoints]);

  return state;
};

/**
 * Determine current breakpoint based on width
 */
function getCurrentBreakpoint(width: number, breakpoints: BreakpointConfig): keyof BreakpointConfig {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  return 'sm';
}

/**
 * Hook for media query matching
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial state
    setMatches(mediaQuery.matches);

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

/**
 * Hook for touch device detection
 */
export const useTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    // Check on mount
    checkTouch();

    // Listen for orientation changes (mobile device rotation)
    window.addEventListener('orientationchange', checkTouch);
    
    return () => window.removeEventListener('orientationchange', checkTouch);
  }, []);

  return isTouch;
};

/**
 * Hook for orientation detection
 */
export const useOrientation = (): 'portrait' | 'landscape' => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'landscape';
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    // Set initial state
    handleOrientationChange();

    // Listen for resize and orientation changes
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
};

/**
 * Utility function to get responsive class names based on breakpoint
 */
export const getResponsiveClasses = (
  classes: Partial<Record<keyof BreakpointConfig | 'base', string>>,
  currentBreakpoint: keyof BreakpointConfig
): string => {
  const breakpointOrder: (keyof BreakpointConfig)[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  
  // Start with base classes
  let result = classes.base || '';
  
  // Apply classes for current and smaller breakpoints
  for (let i = 0; i <= currentIndex; i++) {
    const bp = breakpointOrder[i];
    if (classes[bp]) {
      result += ` ${classes[bp]}`;
    }
  }
  
  return result.trim();
};

export default useResponsive;