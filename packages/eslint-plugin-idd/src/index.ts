import { stateMutationRule } from './rules/state-mutation.js';
import { noExposedMutableStateRule } from './rules/no-exposed-mutable-state.js';

export const rules = {
  'state-mutation': stateMutationRule,
  'no-exposed-mutable-state': noExposedMutableStateRule,
};

const plugin: { meta: { name: string; version: string }; rules: typeof rules; configs: Record<string, unknown> } = {
  meta: { name: '@idd/eslint-plugin', version: '0.1.0' },
  rules,
  configs: {},
};

/**
 * Config "flat" do ESLint 9. Uso em eslint.config.js:
 *   import idd from '@idd/eslint-plugin';
 *   export default [{ files: ['**\/*.ts'], languageOptions: { parser: tsParser }, ...idd.configs.recommended }];
 */
export const configs = {
  recommended: {
    plugins: { idd: plugin },
    rules: { 'idd/state-mutation': 'error', 'idd/no-exposed-mutable-state': 'error' },
  },
};
plugin.configs = configs;

export default plugin;
