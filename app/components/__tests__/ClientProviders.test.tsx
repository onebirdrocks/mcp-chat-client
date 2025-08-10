import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClientProviders from '../ClientProviders';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="i18n-provider">{children}</div>,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue({}),
    t: vi.fn((key) => key),
    language: 'en',
    languages: ['en', 'zh'],
  },
}));

// Mock the i18n configuration
vi.mock('@/lib/i18n', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue({}),
  },
}));

// Mock AccessibilityProvider
vi.mock('@/src/components/ui/AccessibilityProvider', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accessibility-provider">{children}</div>
  ),
}));

describe('ClientProviders', () => {
  it('should render children with all providers', () => {
    render(
      <ClientProviders>
        <div data-testid="test-child">Test content</div>
      </ClientProviders>
    );

    // Should render the child content
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should wrap children with I18nextProvider', () => {
    render(
      <ClientProviders>
        <div data-testid="test-child">Test content</div>
      </ClientProviders>
    );

    // Should have I18nextProvider wrapper
    expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
  });

  it('should wrap children with AccessibilityProvider', () => {
    render(
      <ClientProviders>
        <div data-testid="test-child">Test content</div>
      </ClientProviders>
    );

    // Should have AccessibilityProvider wrapper
    expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    render(
      <ClientProviders>
        <div data-testid="child-1">First child</div>
        <div data-testid="child-2">Second child</div>
      </ClientProviders>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('should handle empty children', () => {
    render(<ClientProviders>{null}</ClientProviders>);

    // Should still render provider wrappers
    expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
    expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();
  });

  it('should maintain provider hierarchy', () => {
    render(
      <ClientProviders>
        <div data-testid="test-child">Test content</div>
      </ClientProviders>
    );

    const i18nProvider = screen.getByTestId('i18n-provider');
    const accessibilityProvider = screen.getByTestId('accessibility-provider');
    const testChild = screen.getByTestId('test-child');

    // Check that providers are properly nested
    expect(i18nProvider).toContainElement(accessibilityProvider);
    expect(accessibilityProvider).toContainElement(testChild);
  });

  it('should not crash with complex children', () => {
    const ComplexChild = () => (
      <div>
        <h1>Title</h1>
        <p>Paragraph</p>
        <button>Button</button>
      </div>
    );

    expect(() => {
      render(
        <ClientProviders>
          <ComplexChild />
        </ClientProviders>
      );
    }).not.toThrow();

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
  });
});