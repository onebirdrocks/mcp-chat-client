import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  beforeEach(() => {
    // Reset body styles before each test
    document.body.style.overflow = '';
  });

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
    
    // Click on the overlay (background)
    const overlay = screen.getByRole('dialog').firstChild as HTMLElement;
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
    
    const overlay = screen.getByRole('dialog').firstChild as HTMLElement;
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
    
    let modalPanel = screen.getByRole('dialog').children[1] as HTMLElement;
    expect(modalPanel).toHaveClass('max-w-sm');
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" size="md">
        <p>Medium modal</p>
      </Modal>
    );
    
    modalPanel = screen.getByRole('dialog').children[1] as HTMLElement;
    expect(modalPanel).toHaveClass('max-w-md');
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" size="lg">
        <p>Large modal</p>
      </Modal>
    );
    
    modalPanel = screen.getByRole('dialog').children[1] as HTMLElement;
    expect(modalPanel).toHaveClass('max-w-lg');
  });

  it('should support custom className', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" className="custom-modal">
        <p>Modal content</p>
      </Modal>
    );
    
    const modalPanel = screen.getByRole('dialog').children[1] as HTMLElement;
    expect(modalPanel).toHaveClass('custom-modal');
  });

  it('should have proper ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('should prevent body scroll when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should restore body scroll when closed', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    // Close the modal
    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('');
  });

  it('should render without title when not provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Modal content without title</p>
      </Modal>
    );
    
    expect(screen.getByText('Modal content without title')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should hide close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal" showCloseButton={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });
});