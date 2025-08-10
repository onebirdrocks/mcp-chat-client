/**
 * Simple integration test to verify setup
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Simple Integration Test', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello Test</div>;
    
    render(<TestComponent />);
    
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});