/**
 * CONFIGURACIÓN GLOBAL DE TESTING
 * 
 * Setup inicial para todas las pruebas que incluye:
 * - Configuración de jsdom y testing-library
 * - Mocks globales y utilidades
 * - Polyfills para APIs del navegador
 * - Configuración de timeouts y cleanup
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills globales
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock de performance API
global.performance = {
  ...performance,
  now: () => Date.now()
};

// Mock de ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock de IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock de matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock de fetch global
global.fetch = jest.fn();

// Mock de console para tests de performance
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Cleanup después de cada test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Timeout global más largo para pruebas de integración
jest.setTimeout(10000);