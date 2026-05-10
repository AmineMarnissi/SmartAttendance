import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {Button, PaperProvider} from 'react-native-paper';
import {initDatabase} from './src/services/database/db';
import {seedData} from './src/services/database/seedData';
import {bootstrapDefaultSession} from './src/services/bootstrap/defaultSession';
import {LocalNotificationService} from './src/services/notification/LocalNotificationService';
import AppNavigator from './src/navigation/AppNavigator';

type AppStatus = 'initializing' | 'ready' | 'error';

function App(): React.JSX.Element {
  const [status, setStatus] = useState<AppStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState('');

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
    <PaperProvider>
      {status === 'ready' ? (
        <AppNavigator />
      ) : (
        <View style={styles.startupContainer}>
          {status === 'initializing' ? (
            <>
              <ActivityIndicator size="large" />
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
    backgroundColor: '#f5f5f5',
  },
  startupTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  startupText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#B00020',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 12,
    color: '#333',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
  },
});

export default App;
