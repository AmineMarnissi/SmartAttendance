/**
 * @format
 */

import 'react-native-get-random-values';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

const originalConsoleError = console.error;

console.error = (...args) => {
  originalConsoleError(
    ...args.map(arg => {
      if (
        arg instanceof Error ||
        (arg != null && typeof arg === 'object' && 'message' in arg)
      ) {
        try {
          const name = typeof arg.name === 'string' ? arg.name : 'Error';
          const message =
            typeof arg.message === 'string' ? arg.message : String(arg);
          return `${name}: ${message}`;
        } catch {
          return 'Error: <unreadable error object>';
        }
      }

      return arg;
    }),
  );
};

AppRegistry.registerComponent(appName, () => App);
