import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Global mocks for IndexedDB, localStorage or any other browser API if needed
if (typeof window !== 'undefined') {
  // Mock matchMedia if needed
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
