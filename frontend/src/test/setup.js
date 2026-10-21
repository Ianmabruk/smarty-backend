import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Keep the test output readable; individual tests re-spy on this when they
// need to assert on the diagnostic output.
vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});
