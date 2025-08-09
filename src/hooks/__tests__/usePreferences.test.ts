import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../usePreferences';
import { useTheme } from '../useTheme';
import { useLanguage } from '../useLanguage';
import { useAccessibility } from '../useAccessibility';
import { useSettingsStore } from '../../store/settingsStore';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

// Mock custom hooks
vi.mock('../useTheme');
vi.mock('../useLanguage');
vi.mock('../useAccessibility');
vi.mock('../../store/settingsStore');

const mockRouter = {
  push: vi.fn(),
  asPath: '/settings',
  locale: 'en',
};

const mockUseTranslation = {
  i18n: {
    changeLanguage: vi.fn(),
  },
};

const mockUseTheme = {
  theme: 'system' as const,
  changeTheme: vi.fn(),
};

const mockUseLanguage = {
  currentLanguage: 'en' as const,
  changeLanguage: vi.fn(),
};

const mockUseAccessibility = {
  userPreferences: {
    highContrast: false,
    reducedMotion: false,
    screenReaderAnnouncements: true,
    keyboardNavigation: true,
    focusVisible: true,
    largeText: false,
  },
  updatePreferences: vi.fn(),
};

const mockUseSettingsStore = {
  preferences: {
    theme: 'system' as const,
    language: 'en' as const,
    autoScroll: true,
    soundEnabled: false,
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      screenReaderAnnouncements: true,
      keyboardNavigation: true,
      focusVisible: true,
      largeText: false,
    },
  },
  updatePreferences: vi.fn(),
  isSaving: false,
};

describe('usePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useRouter as any).mockReturnValue(mockRouter);
    (useTranslation as any).mockReturnValue(mockUseTranslation);
    (useTheme as any).mockReturnValue(mockUseTheme);
    (useLanguage as any).mockReturnValue(mockUseLanguage);
    (useAccessibility as any).mockReturnValue(mockUseAccessibility);
    (useSettingsStore as any).mockReturnValue(mockUseSettingsStore);
  });

  it('returns current preferences', () => {
    const { result } = renderHook(() => usePreferences());
    
    expect(result.current.preferences).toEqual({
      theme: 'system',
      language: 'en',
      autoScroll: true,
      soundEnabled: false,
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReaderAnnouncements: true,
        keyboardNavigation: true,
        focusVisible: true,
        largeText: false,
      },
    });
  });

  it('handles theme change', async () => {
    const { result } = renderHook(() => usePreferences());
    
    await act(async () => {
      result.current.changeTheme('dark');
    });
    
    expect(mockUseTheme.changeTheme).toHaveBeenCalledWith('dark');
    expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('handles language change', async () => {
    const { result } = renderHook(() => usePreferences());
    
    await act(async () => {
      await result.current.changeLanguage('zh');
    });
    
    expect(mockUseLanguage.changeLanguage).toHaveBeenCalledWith('zh');
    expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({ language: 'zh' });
    expect(mockRouter.push).toHaveBeenCalledWith('/settings', '/settings', { locale: 'zh' });
  });

  it('handles preference change', async () => {
    const { result } = renderHook(() => usePreferences());
    
    await act(async () => {
      result.current.changePreference('autoScroll', false);
    });
    
    expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({ autoScroll: false });
  });

  it('handles accessibility preference change', async () => {
    const { result } = renderHook(() => usePreferences());
    
    await act(async () => {
      result.current.changeAccessibilityPreference('highContrast', true);
    });
    
    expect(mockUseAccessibility.updatePreferences).toHaveBeenCalledWith({ highContrast: true });
  });

  it('handles bulk preference update', async () => {
    const { result } = renderHook(() => usePreferences());
    
    const newPreferences = {
      theme: 'dark' as const,
      language: 'zh' as const,
      autoScroll: false,
      soundEnabled: true,
    };
    
    await act(async () => {
      await result.current.updateAllPreferences(newPreferences);
    });
    
    expect(mockUseTheme.changeTheme).toHaveBeenCalledWith('dark');
    expect(mockUseLanguage.changeLanguage).toHaveBeenCalledWith('zh');
    expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({
      autoScroll: false,
      soundEnabled: true,
    });
  });

  it('resets preferences to defaults', async () => {
    const { result } = renderHook(() => usePreferences());
    
    await act(async () => {
      await result.current.resetPreferences();
    });
    
    expect(mockUseTheme.changeTheme).toHaveBeenCalledWith('system');
    expect(mockUseLanguage.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('detects modified preferences', () => {
    // Mock modified preferences
    (useSettingsStore as any).mockReturnValue({
      ...mockUseSettingsStore,
      preferences: {
        ...mockUseSettingsStore.preferences,
        autoScroll: false, // Different from default
      },
    });
    
    const { result } = renderHook(() => usePreferences());
    
    expect(result.current.hasModifiedPreferences).toBe(true);
  });

  it('exports preferences', () => {
    const { result } = renderHook(() => usePreferences());
    
    const exported = result.current.exportPreferences();
    
    expect(exported).toHaveProperty('preferences');
    expect(exported).toHaveProperty('exportedAt');
    expect(exported).toHaveProperty('version');
    expect(exported.preferences).toEqual(result.current.preferences);
  });

  it('imports preferences', async () => {
    const { result } = renderHook(() => usePreferences());
    
    const importData = {
      preferences: {
        theme: 'dark' as const,
        language: 'zh' as const,
        autoScroll: false,
        soundEnabled: true,
        accessibility: {
          highContrast: true,
          reducedMotion: false,
          screenReaderAnnouncements: true,
          keyboardNavigation: true,
          focusVisible: true,
          largeText: false,
        },
      },
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    let importResult: boolean;
    await act(async () => {
      importResult = await result.current.importPreferences(importData);
    });
    
    expect(importResult!).toBe(true);
    expect(mockUseTheme.changeTheme).toHaveBeenCalledWith('dark');
    expect(mockUseLanguage.changeLanguage).toHaveBeenCalledWith('zh');
  });

  it('handles invalid import data', async () => {
    const { result } = renderHook(() => usePreferences());
    
    let importResult: boolean;
    await act(async () => {
      importResult = await result.current.importPreferences({ invalid: 'data' });
    });
    
    expect(importResult!).toBe(false);
  });

  it('skips language change if same language', async () => {
    const { result } = renderHook(() => usePreferences());
    
    await act(async () => {
      await result.current.changeLanguage('en'); // Same as current
    });
    
    expect(mockUseLanguage.changeLanguage).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('returns correct state flags', () => {
    (useSettingsStore as any).mockReturnValue({
      ...mockUseSettingsStore,
      isSaving: true,
    });
    
    const { result } = renderHook(() => usePreferences());
    
    expect(result.current.isSaving).toBe(true);
    expect(result.current.hasModifiedPreferences).toBe(false); // Default preferences
  });
});