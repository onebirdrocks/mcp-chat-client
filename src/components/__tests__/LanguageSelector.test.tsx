import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LanguageSelector } from '../LanguageSelector';

// Mock react-i18next
const mockChangeLanguage = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      language: 'en',
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('select variant', () => {
    it('renders select dropdown with current language', () => {
      render(<LanguageSelector variant="select" />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('en');
    });

    it('shows language options', () => {
      render(<LanguageSelector variant="select" />);

      const englishOption = screen.getByRole('option', { name: /english/i });
      const chineseOption = screen.getByRole('option', { name: /中文/i });

      expect(englishOption).toBeInTheDocument();
      expect(chineseOption).toBeInTheDocument();
    });

    it('changes language when option is selected', () => {
      render(<LanguageSelector variant="select" />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'zh' } });

      expect(mockChangeLanguage).toHaveBeenCalledWith('zh');
    });

    it('applies custom className', () => {
      render(<LanguageSelector variant="select" className="custom-class" />);

      const container = screen.getByRole('combobox').closest('div');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('button variant', () => {
    it('renders toggle button with current language', () => {
      render(<LanguageSelector variant="button" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('English');
    });

    it('toggles between languages when clicked', () => {
      render(<LanguageSelector variant="button" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockChangeLanguage).toHaveBeenCalledWith('zh');
    });

    it('shows Chinese when current language is Chinese', () => {
      vi.mocked(require('react-i18next').useTranslation).mockReturnValue({
        t: (key: string, defaultValue?: string) => defaultValue || key,
        i18n: {
          language: 'zh',
          changeLanguage: mockChangeLanguage,
        },
      });

      render(<LanguageSelector variant="button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('中文');
    });

    it('applies custom className to button', () => {
      render(<LanguageSelector variant="button" className="custom-button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-button');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels for select variant', () => {
      render(<LanguageSelector variant="select" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Select language');
    });

    it('has proper ARIA labels for button variant', () => {
      render(<LanguageSelector variant="button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Toggle language');
    });

    it('supports keyboard navigation for select', () => {
      render(<LanguageSelector variant="select" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('tabIndex', '0');
    });

    it('supports keyboard navigation for button', () => {
      render(<LanguageSelector variant="button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('error handling', () => {
    it('handles language change errors gracefully', () => {
      mockChangeLanguage.mockRejectedValue(new Error('Language change failed'));

      render(<LanguageSelector variant="button" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockChangeLanguage).toHaveBeenCalled();
      // Component should not crash
      expect(button).toBeInTheDocument();
    });
  });
});