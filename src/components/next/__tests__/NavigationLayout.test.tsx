import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NavigationLayout } from '../NavigationLayout';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock the Sidebar component
vi.mock('../Sidebar', () => ({
  Sidebar: ({ children, isOpen, onClose }: any) => (
    <div data-testid="sidebar" data-open={isOpen} onClick={onClose}>
      {children}
    </div>
  ),
}));

describe('NavigationLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <NavigationLayout>
        <div>Test Content</div>
      </NavigationLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <NavigationLayout className="custom-layout">
        <div>Content</div>
      </NavigationLayout>
    );

    const layout = screen.getByText('Content').closest('.custom-layout');
    expect(layout).toBeInTheDocument();
  });

  it('has proper responsive layout structure', () => {
    render(
      <NavigationLayout>
        <div>Content</div>
      </NavigationLayout>
    );

    // Check for responsive layout classes
    const container = screen.getByText('Content').closest('div');
    expect(container?.parentElement).toHaveClass('flex', 'h-screen');
  });

  it('includes sidebar component', () => {
    render(
      <NavigationLayout>
        <div>Content</div>
      </NavigationLayout>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('manages sidebar state correctly', () => {
    render(
      <NavigationLayout>
        <div>Content</div>
      </NavigationLayout>
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-open', 'false');
  });

  it('provides main content area', () => {
    render(
      <NavigationLayout>
        <main>Main Content</main>
      </NavigationLayout>
    );

    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveTextContent('Main Content');
  });

  it('has proper accessibility structure', () => {
    render(
      <NavigationLayout>
        <main aria-label="Main content">
          <h1>Page Title</h1>
          <p>Page content</p>
        </main>
      </NavigationLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-label', 'Main content');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('supports mobile responsive behavior', () => {
    render(
      <NavigationLayout>
        <div>Mobile Content</div>
      </NavigationLayout>
    );

    // Check that layout adapts to mobile
    const container = screen.getByText('Mobile Content').closest('div');
    expect(container?.parentElement).toHaveClass('flex');
  });

  it('handles empty children gracefully', () => {
    render(<NavigationLayout />);

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('supports nested navigation elements', () => {
    render(
      <NavigationLayout>
        <nav aria-label="Secondary navigation">
          <ul>
            <li><a href="/page1">Page 1</a></li>
            <li><a href="/page2">Page 2</a></li>
          </ul>
        </nav>
        <main>
          <h1>Content</h1>
        </main>
      </NavigationLayout>
    );

    expect(screen.getByRole('navigation', { name: 'Secondary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Page 2' })).toBeInTheDocument();
  });
});