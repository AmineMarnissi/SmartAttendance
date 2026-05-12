import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View, StatusBar} from 'react-native';
import {Button, PaperProvider} from 'react-native-paper';
import {darkTheme, lightTheme} from './src/theme/theme';
import {useThemeStore} from './src/store/useThemeStore';
import {initDatabase} from './src/services/database/db';
import {seedData} from './src/services/database/seedData';
import {bootstrapDefaultSession} from './src/services/bootstrap/defaultSession';
import {LocalNotificationService} from './src/services/notification/LocalNotificationService';
import AppNavigator from './src/navigation/AppNavigator';

type AppStatus = 'initializing' | 'ready' | 'error';

function App(): React.JSX.Element {
  const [status, setStatus] = useState<AppStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  const setup = useCallback(async () => {
    setStatus('initializing');
    setErrorMessage('');

    try {
      await initDatabase();
      await seedData();
      await bootstrapDefaultSession();
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
    <PaperProvider theme={currentTheme}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={currentTheme.colors.background}
      />
      {status === 'ready' ? (
        <AppNavigator />
      ) : (
        <View style={styles.startupContainer}>
          {status === 'initializing' ? (
            <>
              <ActivityIndicator size="large" color={currentTheme.colors.primary} />
              <Text style={styles.startupTitle}>
                Preparing RegistreIntelligent...
              </Text>
              <Text style={styles.startupText}>
                Opening attendance mode without login.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.errorTitle}>Startup failed</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Button
                mode="contained"
                onPress={setup}
                style={styles.retryButton}>
                Retry
              </Button>
            </>
          )}
        </View>
      )}
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  startupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  startupTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  startupText: {
    marginTop: 8,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF5252',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
  },
});

export default App;
