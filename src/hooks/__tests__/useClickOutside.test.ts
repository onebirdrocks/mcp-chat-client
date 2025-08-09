import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { useClickOutside } from '../useClickOutside';

// Mock DOM methods
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(document, 'addEventListener', {
    value: mockAddEventListener,
    writable: true,
  });
  Object.defineProperty(document, 'removeEventListener', {
    value: mockRemoveEventListener,
    writable: true,
  });
});

describe('useClickOutside', () => {
  it('should add event listeners when enabled', () => {
    const mockHandler = vi.fn();
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, mockHandler, true);
      return ref;
    });

    expect(mockAddEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
  });

  it('should not add event listeners when disabled', () => {
    const mockHandler = vi.fn();
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, mockHandler, false);
      return ref;
    });

    expect(mockAddEventListener).not.toHaveBeenCalled();
  });

  it('should remove event listeners on cleanup', () => {
    const mockHandler = vi.fn();
    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, mockHandler, true);
      return ref;
    });

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
  });

  it('should call handler when clicking outside', () => {
    const mockHandler = vi.fn();
    const mockElement = document.createElement('div');
    const mockOutsideElement = document.createElement('div');

    // Mock contains method
    mockElement.contains = vi.fn().mockReturnValue(false);

    renderHook(() => {
      const ref = { current: mockElement };
      useClickOutside(ref, mockHandler, true);
      return ref;
    });

    // Get the event handler that was registered
    const mouseDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mousedown'
    )?.[1];

    // Simulate click outside
    const event = { target: mockOutsideElement } as any;
    mouseDownHandler?.(event);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('should not call handler when clicking inside', () => {
    const mockHandler = vi.fn();
    const mockElement = document.createElement('div');
    const mockInsideElement = document.createElement('div');

    // Mock contains method to return true (inside)
    mockElement.contains = vi.fn().mockReturnValue(true);

    renderHook(() => {
      const ref = { current: mockElement };
      useClickOutside(ref, mockHandler, true);
      return ref;
    });

    // Get the event handler that was registered
    const mouseDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mousedown'
    )?.[1];

    // Simulate click inside
    const event = { target: mockInsideElement } as any;
    mouseDownHandler?.(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should not call handler when clicking on excluded elements', () => {
    const mockHandler = vi.fn();
    const mockElement = document.createElement('div');
    const mockExcludedElement = document.createElement('button');
    mockExcludedElement.setAttribute('data-sidebar-trigger', '');

    // Mock contains method to return false (outside)
    mockElement.contains = vi.fn().mockReturnValue(false);

    // Mock closest method to return the excluded element
    mockExcludedElement.closest = vi.fn().mockReturnValue(mockExcludedElement);

    renderHook(() => {
      const ref = { current: mockElement };
      useClickOutside(ref, mockHandler, true, ['[data-sidebar-trigger]']);
      return ref;
    });

    // Get the event handler that was registered
    const mouseDownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mousedown'
    )?.[1];

    // Simulate click on excluded element
    const event = { target: mockExcludedElement } as any;
    mouseDownHandler?.(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });
});