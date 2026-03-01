module.exports = [
  {
    files: ['**/*.js'],
    ignores: [
      'src/utils/helpers.js',  // ID comparison utility, supports non-numeric string IDs
      'src/routes/tradeEngine.js'  // Wrapper around @titlerun/validation for backward-compatible error messages
    ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Jest globals
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        it: 'readonly'
      }
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="Number"][callee.property.name=/isFinite|isInteger/]',
          message: 'Use @titlerun/validation library instead of manual Number.isFinite/isInteger checks. Import: const { normalizeId } = require("@titlerun/validation");'
        }
      ]
    }
  }
];
