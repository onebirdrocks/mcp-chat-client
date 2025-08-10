import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Loading } from '../Spinner';

describe('Loading Component', () => {
  it('renders with default props', () => {
    render(<Loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // The role="status" is on the SVG element, but it's also aria-hidden
    const spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveAttribute('role', 'status');
  });

  it('renders with custom text', () => {
    render(<Loading text="Please wait..." />);

    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Loading size="sm" />);
    let spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<Loading size="md" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('h-6', 'w-6');

    rerender(<Loading size="lg" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('h-8', 'w-8');

    rerender(<Loading size="xl" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('applies custom className', () => {
    render(<Loading className="custom-loading" />);

    const container = screen.getByText('Loading...').parentElement;
    expect(container).toHaveClass('custom-loading');
  });

  it('merges custom className with default classes', () => {
    render(<Loading className="bg-blue-500" />);

    const container = screen.getByText('Loading...').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'justify-center', 'space-x-2', 'bg-blue-500');
  });

  it('shows spinner animation', () => {
    render(<Loading />);

    const spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('applies different colors based on color prop', () => {
    const { rerender } = render(<Loading color="primary" />);
    let spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('text-blue-600');

    rerender(<Loading color="secondary" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('text-gray-600');

    rerender(<Loading color="white" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('text-white');

    rerender(<Loading color="gray" />);
    spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('text-gray-400');
  });

  it('handles long text gracefully', () => {
    const longText = 'This is a very long loading message that should be handled properly by the component';
    render(<Loading text={longText} />);

    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  it('renders without text when text is empty', () => {
    render(<Loading text="" />);

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('handles white color variant with appropriate text color', () => {
    render(<Loading color="white" text="Loading..." />);

    const textElement = screen.getByText('Loading...');
    expect(textElement).toHaveClass('text-white');
  });
});