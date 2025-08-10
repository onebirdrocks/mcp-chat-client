import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CardHeader, CardTitle, CardContent, CardFooter } from '../Card';

describe('Card Components', () => {
  describe('CardHeader', () => {
    it('renders children correctly', () => {
      render(
        <CardHeader>
          <h2>Test Header</h2>
        </CardHeader>
      );

      expect(screen.getByText('Test Header')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(
        <CardHeader>
          <span>Header Content</span>
        </CardHeader>
      );

      const header = screen.getByText('Header Content').parentElement;
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('applies custom className', () => {
      render(
        <CardHeader className="custom-header">
          <span>Header Content</span>
        </CardHeader>
      );

      const header = screen.getByText('Header Content').parentElement;
      expect(header).toHaveClass('custom-header');
    });

    it('merges custom className with default classes', () => {
      render(
        <CardHeader className="bg-blue-500">
          <span>Header Content</span>
        </CardHeader>
      );

      const header = screen.getByText('Header Content').parentElement;
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6', 'bg-blue-500');
    });
  });

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Test Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Title');
    });

    it('applies default classes', () => {
      render(<CardTitle>Test Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('applies custom className', () => {
      render(<CardTitle className="text-blue-600">Test Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('text-blue-600');
    });

    it('merges custom className with default classes', () => {
      render(<CardTitle className="text-center">Test Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight', 'text-center');
    });
  });

  describe('CardContent', () => {
    it('renders children correctly', () => {
      render(
        <CardContent>
          <p>Test content paragraph</p>
        </CardContent>
      );

      expect(screen.getByText('Test content paragraph')).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(
        <CardContent>
          <span>Content</span>
        </CardContent>
      );

      const content = screen.getByText('Content').parentElement;
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('applies custom className', () => {
      render(
        <CardContent className="custom-content">
          <span>Content</span>
        </CardContent>
      );

      const content = screen.getByText('Content').parentElement;
      expect(content).toHaveClass('custom-content');
    });

    it('merges custom className with default classes', () => {
      render(
        <CardContent className="bg-gray-100">
          <span>Content</span>
        </CardContent>
      );

      const content = screen.getByText('Content').parentElement;
      expect(content).toHaveClass('p-6', 'pt-0', 'bg-gray-100');
    });
  });

  describe('CardFooter', () => {
    it('renders children correctly', () => {
      render(
        <CardFooter>
          <button>Action Button</button>
        </CardFooter>
      );

      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });

    it('applies default classes', () => {
      render(
        <CardFooter>
          <span>Footer</span>
        </CardFooter>
      );

      const footer = screen.getByText('Footer').parentElement;
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('applies custom className', () => {
      render(
        <CardFooter className="justify-end">
          <span>Footer</span>
        </CardFooter>
      );

      const footer = screen.getByText('Footer').parentElement;
      expect(footer).toHaveClass('justify-end');
    });

    it('merges custom className with default classes', () => {
      render(
        <CardFooter className="border-t">
          <span>Footer</span>
        </CardFooter>
      );

      const footer = screen.getByText('Footer').parentElement;
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0', 'border-t');
    });
  });

  describe('Card Components Integration', () => {
    it('works together in a complete card structure', () => {
      render(
        <div className="card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the card content.</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </div>
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Card Title' })).toBeInTheDocument();
      expect(screen.getByText('This is the card content.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('maintains proper semantic structure', () => {
      render(
        <div className="card">
          <CardHeader>
            <CardTitle>Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Content with proper semantics</p>
          </CardContent>
          <CardFooter>
            <button type="button">Submit</button>
          </CardFooter>
        </div>
      );

      // Check that the heading is properly structured
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();

      // Check that button has proper type
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});