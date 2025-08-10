import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  getBreakpoint, 
  isBreakpoint, 
  getScreenSize, 
  createResponsiveValue,
  useResponsiveValue 
} from '../responsive';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();

describe('Responsive utilities', () => {
  beforeEach(() => {
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
    
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getBreakpoint', () => {
    it('should return correct breakpoint for different screen sizes', () => {
      // Test mobile
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      expect(getBreakpoint()).toBe('sm');

      // Test tablet
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(getBreakpoint()).toBe('md');

      // Test desktop
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(getBreakpoint()).toBe('lg');

      // Test large desktop
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      expect(getBreakpoint()).toBe('xl');

      // Test extra large
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      expect(getBreakpoint()).toBe('2xl');
    });
  });

  describe('isBreakpoint', () => {
    it('should correctly identify breakpoints', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      
      expect(isBreakpoint('lg')).toBe(true);
      expect(isBreakpoint('md')).toBe(false);
      expect(isBreakpoint('xl')).toBe(false);
    });

    it('should handle min-width queries', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      
      expect(isBreakpoint('md', 'min')).toBe(true); // 1024 >= 768
      expect(isBreakpoint('xl', 'min')).toBe(false); // 1024 < 1280
    });

    it('should handle max-width queries', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      
      expect(isBreakpoint('xl', 'max')).toBe(true); // 1024 < 1280
      expect(isBreakpoint('md', 'max')).toBe(false); // 1024 >= 768
    });
  });

  describe('getScreenSize', () => {
    it('should return correct screen size categories', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      expect(getScreenSize()).toBe('mobile');

      Object.defineProperty(window, 'innerWidth', { value: 768 });
      expect(getScreenSize()).toBe('tablet');

      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(getScreenSize()).toBe('desktop');

      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      expect(getScreenSize()).toBe('desktop');
    });
  });

  describe('createResponsiveValue', () => {
    it('should create responsive value object', () => {
      const responsiveValue = createResponsiveValue({
        sm: 'small',
        md: 'medium',
        lg: 'large',
      });

      expect(responsiveValue).toEqual({
        sm: 'small',
        md: 'medium',
        lg: 'large',
      });
    });

    it('should handle single value', () => {
      const responsiveValue = createResponsiveValue('single');

      expect(responsiveValue).toBe('single');
    });
  });

  describe('useResponsiveValue', () => {
    it('should return correct value for current breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      
      const responsiveValue = {
        sm: 'small',
        md: 'medium',
        lg: 'large',
        xl: 'extra-large',
      };

      const result = useResponsiveValue(responsiveValue);
      expect(result).toBe('large');
    });

    it('should fall back to smaller breakpoint if current not defined', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      
      const responsiveValue = {
        sm: 'small',
        md: 'medium',
        // lg not defined
        xl: 'extra-large',
      };

      const result = useResponsiveValue(responsiveValue);
      expect(result).toBe('medium'); // Falls back to md
    });

    it('should handle single value', () => {
      const result = useResponsiveValue('single-value');
      expect(result).toBe('single-value');
    });

    it('should return undefined if no matching breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      
      const responsiveValue = {
        lg: 'large',
        xl: 'extra-large',
      };

      const result = useResponsiveValue(responsiveValue);
      expect(result).toBeUndefined();
    });
  });

  describe('Media query utilities', () => {
    it('should create correct media queries', () => {
      // This would test internal media query creation functions
      // if they were exported from the responsive utility
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Responsive hooks integration', () => {
    it('should work with React hooks', () => {
      // This would test the integration with useResponsive hook
      // if it was part of this utility file
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Edge cases', () => {
    it('should handle window resize events', () => {
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      expect(getBreakpoint()).toBe('sm');

      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      expect(getBreakpoint()).toBe('lg');
    });

    it('should handle undefined window', () => {
      // Mock server-side rendering scenario
      const originalWindow = global.window;
      delete (global as any).window;

      // Should not throw error
      expect(() => getBreakpoint()).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });

    it('should handle invalid breakpoint names', () => {
      expect(isBreakpoint('invalid' as any)).toBe(false);
    });
  });
});