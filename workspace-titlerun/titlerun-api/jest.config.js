module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(@titlerun/validation|lru-cache)/)',
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};
