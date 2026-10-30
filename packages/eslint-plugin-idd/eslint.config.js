// Fiscaliza o exemplo com o próprio plugin (o editor usa este arquivo via extensão ESLint).
import tsParser from '@typescript-eslint/parser';
import idd from './dist/index.js';

export default [
  {
    files: ['example/**/*.ts'],
    ignores: ['example/test/**'],
    languageOptions: { parser: tsParser },
    ...idd.configs.recommended,
  },
];
