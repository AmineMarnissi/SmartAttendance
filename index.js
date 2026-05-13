/**
 * @format
 */

import 'react-native-get-random-values';
import './src/polyfills/crypto.js'; // Ensure crypto is available early
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Simple error logging for release
const register = () => {
  try {
    AppRegistry.registerComponent(appName, () => App);
  } catch (e) {
    console.error('CRITICAL: App registration failed', e);
  }
};

register();
