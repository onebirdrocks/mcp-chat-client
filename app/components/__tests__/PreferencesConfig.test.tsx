import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import PreferencesConfig from '../PreferencesConfig';
import { useTheme } from '../../../src/hooks/useTheme';
import { useLanguage } from '../../../src/hooks/useLanguage';
import { useAccessibility } from '../../../src/hooks/useAccessibility';
import { useSettingsStore } from '../../../src/store/settingsStore';

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

// Mock custom hooks
vi.mock('../../../src/hooks/useTheme');
vi.mock('../../../src/hooks/useLanguage');
vi.mock('../../../src/hooks/useAccessibility');
vi.mock('../../../src/store/settingsStore');

const mockRouter = {
  push: vi.fn(),
  asPath: '/settings',
  locale: 'en',
};

const mockUseTranslation = {
  t: vi.fn((key: string, fallback?: string) => fallback || key),
};

const mockUseTheme = {
  theme: 'system' as const,
  changeTheme: vi.fn(),
};

const mockUseLanguage = {
  currentLanguage: 'en' as const,
  changeLanguage: vi.fn(),
  supportedLanguages: ['en', 'zh'] as const,
  getLanguageName: vi.fn((lang: string) => lang === 'en' ? 'English' : '中文'),
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
};

describe('PreferencesConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useRouter as any).mockReturnValue(mockRouter);
    (useTranslation as any).mockReturnValue(mockUseTranslation);
    (useTheme as any).mockReturnValue(mockUseTheme);
    (useLanguage as any).mockReturnValue(mockUseLanguage);
    (useAccessibility as any).mockReturnValue(mockUseAccessibility);
    (useSettingsStore as any).mockReturnValue(mockUseSettingsStore);
  });

  it('renders preferences sections', () => {
    render(<PreferencesConfig />);
    
    expect(screen.getByText('settings.general')).toBeInTheDocument();
    expect(screen.getByText('settings.preferences')).toBeInTheDocument();
    expect(screen.getByText('accessibility.title')).toBeInTheDocument();
  });

  it('displays current theme and language settings', () => {
    render(<PreferencesConfig />);
    
    const themeSelect = screen.getByLabelText('settings.theme');
    const languageSelect = screen.getByLabelText('settings.language');
    
    expect(themeSelect).toHaveValue('system');
    expect(languageSelect).toHaveValue('en');
  });

  it('handles theme change', async () => {
    render(<PreferencesConfig />);
    
    const themeSelect = screen.getByLabelText('settings.theme');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    
    await waitFor(() => {
      expect(mockUseTheme.changeTheme).toHaveBeenCalledWith('dark');
      expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
    });
  });

  it('handles language change', async () => {
    render(<PreferencesConfig />);
    
    const languageSelect = screen.getByLabelText('settings.language');
    fireEvent.change(languageSelect, { target: { value: 'zh' } });
    
    await waitFor(() => {
      expect(mockUseLanguage.changeLanguage).toHaveBeenCalledWith('zh');
      expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({ language: 'zh' });
      expect(mockRouter.push).toHaveBeenCalledWith('/settings', '/settings', { locale: 'zh' });
    });
  });

  it('handles auto-scroll toggle', () => {
    render(<PreferencesConfig />);
    
    const autoScrollToggle = screen.getByRole('switch', { name: /settings.autoScroll/i });
    fireEvent.click(autoScrollToggle);
    
    expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({ autoScroll: false });
  });

  it('handles sound notifications toggle', () => {
    render(<PreferencesConfig />);
    
    const soundToggle = screen.getByRole('switch', { name: /settings.soundEnabled/i });
    fireEvent.click(soundToggle);
    
    expect(mockUseSettingsStore.updatePreferences).toHaveBeenCalledWith({ soundEnabled: true });
  });

  it('handles accessibility preference changes', () => {
    render(<PreferencesConfig />);
    
    const highContrastToggle = screen.getByRole('switch', { name: /accessibility.highContrast/i });
    fireEvent.click(highContrastToggle);
    
    expect(mockUseAccessibility.updatePreferences).toHaveBeenCalledWith({ highContrast: true });
  });

  it('shows loading state during language change', async () => {
    const mockChangeLanguage = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    (useLanguage as any).mockReturnValue({
      ...mockUseLanguage,
      changeLanguage: mockChangeLanguage,
    });
    
    render(<PreferencesConfig />);
    
    const languageSelect = screen.getByLabelText('settings.language');
    fireEvent.change(languageSelect, { target: { value: 'zh' } });
    
    // Language select should be disabled during change
    expect(languageSelect).toBeDisabled();
    
    await waitFor(() => {
      expect(languageSelect).not.toBeDisabled();
    });
  });

  it('displays WCAG compliance information', () => {
    render(<PreferencesConfig />);
    
    expect(screen.getByText('accessibility.wcagCompliance')).toBeInTheDocument();
    expect(screen.getByText('accessibility.wcagDescription')).toBeInTheDocument();
  });

  it('applies correct ARIA attributes to toggle switches', () => {
    render(<PreferencesConfig />);
    
    const autoScrollToggle = screen.getByRole('switch', { name: /settings.autoScroll/i });
    
    expect(autoScrollToggle).toHaveAttribute('aria-checked', 'true');
    expect(autoScrollToggle).toHaveAttribute('aria-describedby');
  });

  it('handles keyboard navigation', () => {
    render(<PreferencesConfig />);
    
    const themeSelect = screen.getByLabelText('settings.theme');
    
    // Focus should work
    themeSelect.focus();
    expect(document.activeElement).toBe(themeSelect);
    
    // Keyboard navigation should work
    fireEvent.keyDown(themeSelect, { key: 'ArrowDown' });
    // This would normally change the selection in a real browser
  });
});