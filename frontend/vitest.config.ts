import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Đảm bảo @testing-library/react và components dùng chung 1 thể hiện duy nhất của React 19
const tlrPath = require.resolve('@testing-library/react');
const tlrRequire = createRequire(tlrPath);
const reactDir = path.dirname(tlrRequire.resolve('react/package.json'));
const reactDomDir = path.dirname(tlrRequire.resolve('react-dom/package.json'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: reactDir,
      'react-dom': reactDomDir,
      'react/jsx-runtime': path.join(reactDir, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(reactDir, 'jsx-dev-runtime.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: ['./src/setupTests.ts'],
    server: {
      deps: {
        inline: [/react/, /@testing-library/],
      },
    },
  },
});

