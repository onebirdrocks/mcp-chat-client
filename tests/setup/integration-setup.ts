/**
 * Setup file for integration and e2e tests
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock theme initialization before any imports
vi.mock('@/src/utils/themeInit', () => ({
  initializeTheme: vi.fn(),
  initTheme: vi.fn(),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock localStorage and sessionStorage
const createStorageMock = () => ({
  getItem: vi.fn((key) => {
    if (key === 'mcp-chat-ui-theme') return 'light';
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
});

Object.defineProperty(window, 'localStorage', {
  value: createStorageMock(),
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
});

// Mock document.documentElement
Object.defineProperty(document, 'documentElement', {
  value: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
      toggle: vi.fn(),
    },
  },
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('dark'), // Mock dark mode preference
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Ensure matchMedia is available globally
global.matchMedia = window.matchMedia;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock performance.now for performance tests
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
  },
});

// Mock ReadableStream for streaming tests
global.ReadableStream = class MockReadableStream {
  constructor(underlyingSource?: any) {
    this.underlyingSource = underlyingSource;
  }

  private underlyingSource: any;

  getReader() {
    return {
      read: vi.fn(),
      releaseLock: vi.fn(),
      cancel: vi.fn(),
    };
  }

  cancel() {
    return Promise.resolve();
  }

  pipeTo() {
    return Promise.resolve();
  }

  pipeThrough() {
    return this;
  }

  tee() {
    return [this, this];
  }
} as any;

// Mock crypto for encryption tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid'),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      generateKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
    },
  },
});

// Mock URL.createObjectURL for file downloads
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.scroll = vi.fn();
HTMLElement.prototype.scrollTo = vi.fn();

// Setup and teardown
beforeAll(() => {
  // Global setup for all tests
});

afterAll(() => {
  // Global cleanup
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  cleanup();
  vi.resetAllMocks();
});