import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 9,
      globals: {
        ...globals.node,
        ...globals.commonjs,
        ...globals.mocha,
        ...globals.es6
      }
    },
    rules: {
      indent: ['error', 2, {
        MemberExpression: 'off',
        SwitchCase: 1
      }],
      'linebreak-style': [ 'error', 'unix' ],
      quotes: [ 'error', 'single' ],
      semi: [ 'error', 'always' ],
      'no-console': 'off'
    }
  }
];
