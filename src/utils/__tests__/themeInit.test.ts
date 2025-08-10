import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeTheme, applyTheme, getSystemTheme } from '../themeInit';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
const matchMediaMock = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock,
});

// Mock document
const documentMock = {
  documentElement: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
    },
  },
};

Object.defineProperty(global, 'document', {
  value: documentMock,
});

describe('themeInit utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset document element classes
    documentMock.documentElement.classList.add.mockClear();
    documentMock.documentElement.classList.remove.mockClear();
    documentMock.documentElement.classList.contains.mockClear();
  });

  describe('getSystemTheme', () => {
    it('should return dark when system prefers dark', () => {
      matchMediaMock.mockReturnValue({ matches: true });

      const theme = getSystemTheme();

      expect(theme).toBe('dark');
      expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should return light when system prefers light', () => {
      matchMediaMock.mockReturnValue({ matches: false });

      const theme = getSystemTheme();

      expect(theme).toBe('light');
      expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should handle matchMedia not being available', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: undefined,
      });

      const theme = getSystemTheme();

      expect(theme).toBe('light'); // Default fallback
    });
  });

  describe('applyTheme', () => {
    it('should apply dark theme to document', () => {
      applyTheme('dark');

      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light');
    });

    it('should apply light theme to document', () => {
      applyTheme('light');

      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('light');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should apply system theme based on system preference', () => {
      matchMediaMock.mockReturnValue({ matches: true }); // System prefers dark

      applyTheme('system');

      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light');
    });

    it('should handle invalid theme values', () => {
      applyTheme('invalid' as any);

      // Should default to light theme
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('light');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('initializeTheme', () => {
    it('should use stored theme preference', () => {
      localStorageMock.getItem.mockReturnValue('dark');

      initializeTheme();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light');
    });

    it('should use system theme when no stored preference', () => {
      localStorageMock.getItem.mockReturnValue(null);
      matchMediaMock.mockReturnValue({ matches: false }); // System prefers light

      initializeTheme();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('light');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      matchMediaMock.mockReturnValue({ matches: false });

      expect(() => initializeTheme()).not.toThrow();

      // Should fall back to system theme
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('should handle system theme preference', () => {
      localStorageMock.getItem.mockReturnValue('system');
      matchMediaMock.mockReturnValue({ matches: true }); // System prefers dark

      initializeTheme();

      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light');
    });

    it('should set up system theme change listener', () => {
      const addEventListenerSpy = vi.fn();
      const mediaQueryList = {
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      };
      matchMediaMock.mockReturnValue(mediaQueryList);
      localStorageMock.getItem.mockReturnValue('system');

      initializeTheme();

      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update theme when system preference changes', () => {
      const addEventListenerSpy = vi.fn();
      const mediaQueryList = {
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      };
      matchMediaMock.mockReturnValue(mediaQueryList);
      localStorageMock.getItem.mockReturnValue('system');

      initializeTheme();

      // Simulate system theme change
      const changeHandler = addEventListenerSpy.mock.calls[0][1];
      changeHandler({ matches: true }); // System changed to dark

      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light');
    });

    it('should not set up listener for non-system themes', () => {
      const addEventListenerSpy = vi.fn();
      const mediaQueryList = {
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      };
      matchMediaMock.mockReturnValue(mediaQueryList);
      localStorageMock.getItem.mockReturnValue('dark');

      initializeTheme();

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe('theme persistence', () => {
    it('should save theme preference to localStorage', () => {
      const saveTheme = (theme: string) => {
        localStorage.setItem('theme', theme);
        applyTheme(theme as any);
      };

      saveTheme('dark');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should handle theme changes dynamically', () => {
      // Initial theme
      localStorageMock.getItem.mockReturnValue('light');
      initializeTheme();

      // Change theme
      localStorageMock.getItem.mockReturnValue('dark');
      applyTheme('dark');

      expect(documentMock.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(documentMock.documentElement.classList.remove).toHaveBeenCalledWith('light');
    });
  });
});