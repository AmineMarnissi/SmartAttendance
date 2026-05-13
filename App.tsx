import React, {useCallback, useEffect, useState} from 'react';
import {PaperProvider} from 'react-native-paper';
import {initDatabase} from './src/services/database/db';
import {seedData} from './src/services/database/seedData';
import {LocalNotificationService} from './src/services/notification/LocalNotificationService';
import AppNavigator from './src/navigation/AppNavigator';
import {usePreferencesStore} from './src/store/usePreferencesStore';
import {modernDarkTheme, modernLightTheme} from './src/theme/appTheme';
import SplashScreen from './src/components/ui/SplashScreen';

type AppStatus = 'initializing' | 'ready' | 'error';

function App(): React.JSX.Element {
  const [status, setStatus] = useState<AppStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const themeMode = usePreferencesStore(state => state.themeMode);
  const theme = themeMode === 'dark' ? modernDarkTheme : modernLightTheme;

  const setup = useCallback(async () => {
    setStatus('initializing');
    setErrorMessage('');

    try {
      await initDatabase();
      await seedData();
      await LocalNotificationService.initialize();
      setStatus('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize app:', error);
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    setup();
  }, [setup]);

  return (
    <PaperProvider theme={theme}>
      {status === 'ready' ? (
        <AppNavigator />
      ) : (
        <SplashScreen
          status={status === 'error' ? 'error' : 'initializing'}
          message={errorMessage}
          onRetry={setup}
        />
      )}
    </PaperProvider>
  );
}

export default App;
