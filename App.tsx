import React, {useEffect} from 'react';
import {PaperProvider} from 'react-native-paper';
import {initDatabase} from './src/services/database/db';
import {seedData} from './src/services/database/seedData';
import {LocalNotificationService} from './src/services/notification/LocalNotificationService';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        await seedData();
        await LocalNotificationService.initialize();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    setup();
  }, []);

  return (
    <PaperProvider>
      <AppNavigator />
    </PaperProvider>
  );
}

export default App;
