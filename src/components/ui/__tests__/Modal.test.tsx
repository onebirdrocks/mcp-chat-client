import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal" closeOnOverlayClick={true}>
        <p>Modal content</p>
      </Modal>
    );
    
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when overlay is clicked and closeOnOverlayClick is false', () => {
    const handleClose = vi.fn();
    
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal" closeOnOverlayClick={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal" closeOnEscape={true}>
        <p>Modal content</p>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when Escape key is pressed and closeOnEscape is false', () => {
    const handleClose = vi.fn();
    
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal" closeOnEscape={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should apply different sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" size="sm">
        <p>Small modal</p>
      </Modal>
    );
    
    expect(screen.getByTestId('modal')).toHaveClass('max-w-md');
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" size="md">
        <p>Medium modal</p>
      </Modal>
    );
    
    expect(screen.getByTestId('modal')).toHaveClass('max-w-lg');
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" size="lg">
        <p>Large modal</p>
      </Modal>
    );
    
    expect(screen.getByTestId('modal')).toHaveClass('max-w-2xl');
  });

  it('should support custom className', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" className="custom-modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByTestId('modal')).toHaveClass('custom-modal');
  });

  it('should have proper ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    const modal = screen.getByTestId('modal');
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
  });

  it('should trap focus within modal', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <button>First button</button>
        <button>Second button</button>
      </Modal>
    );
    
    const firstButton = screen.getByText('First button');
    const secondButton = screen.getByText('Second button');
    const closeButton = screen.getByLabelText('Close modal');
    
    // Focus should be trapped within the modal
    expect(document.activeElement).toBe(closeButton);
    
    // Tab should cycle through focusable elements
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(firstButton);
    
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(secondButton);
  });

  it('should restore focus when closed', () => {
    const triggerButton = document.createElement('button');
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    // Close the modal
    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    // Focus should be restored to the trigger button
    expect(document.activeElement).toBe(triggerButton);
    
    document.body.removeChild(triggerButton);
  });

  it('should prevent body scroll when open', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(document.body).toHaveClass('overflow-hidden');
    
    // Close the modal
    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(document.body).not.toHaveClass('overflow-hidden');
  });

  it('should render footer when provided', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={() => {}} 
        title="Test Modal"
        footer={<button>Custom Footer</button>}
      >
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Custom Footer')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" loading={true}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});