/**
 * Jest roda em CommonJS (via ts-jest), enquanto o Vite usa ESM.
 * Por isso:
 * - `@/config` é trocado por um mock, já que `import.meta.env` só existe no Vite;
 * - imports de CSS viram um módulo vazio.
 */
export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^@/config$': '<rootDir>/src/test/configMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': '<rootDir>/src/test/styleMock.ts',
  },
};
