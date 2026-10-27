import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Component and chart libraries clash with the design kit (constitution Principle III),
// and PnPjs is not used (research R3).
const bannedImports = {
  patterns: [
    { group: ['@fluentui/*', 'office-ui-fabric-react', 'office-ui-fabric-react/*'], message: 'Fluent UI is not allowed (constitution Principle III). Use the design kit.' },
    { group: ['bootstrap', 'bootstrap/*'], message: 'Bootstrap is not allowed (constitution Principle III).' },
    { group: ['recharts', 'chart.js', 'chart.js/*', 'echarts', 'echarts/*', 'd3', 'd3-*'], message: 'Chart libraries are not used; charts are hand-built SVG (research R1).' },
    { group: ['@pnp/*'], message: 'PnPjs is not used; the web part calls the Function API (research R3).' },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
      'design-kit/**',
      '.specify/**',
      '.claude/**',
      'apps/webpart/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-restricted-imports': ['error', bannedImports],
    },
  },
  {
    files: ['packages/dashboard-ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Calculations are pure: no clock, no network, no Node APIs (constitution Principle VI).
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          ...bannedImports,
          patterns: [
            ...bannedImports.patterns,
            { group: ['node:*', 'fs', 'path', 'http', 'https'], message: 'packages/core must not do I/O.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'Pass "now" in; never read the clock in packages/core.' },
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Pass "today"/"now" in; never read the clock in packages/core.' },
        { selector: "CallExpression[callee.name='fetch']", message: 'packages/core must not do I/O.' },
      ],
    },
  },
);
