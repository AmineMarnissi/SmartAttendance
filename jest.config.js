module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|tflite)$':
      '<rootDir>/__mocks__/AssetMock.js',
  },
  testMatch: ['<rootDir>/__tests__/**/*.(test|spec).(ts|tsx|js)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/node_modules_broken_[^/\\\\]+/',
    '/__mocks__/',
    '/__tests__/App.test.tsx',
  ],
};
