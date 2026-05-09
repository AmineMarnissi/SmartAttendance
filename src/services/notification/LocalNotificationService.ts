import notifee, {AndroidImportance} from '@notifee/react-native';

export const LocalNotificationService = {
  initialize: async () => {
    // Request permissions (required for iOS)
    await notifee.requestPermission();

    // Create a channel (required for Android)
    await notifee.createChannel({
      id: 'attendance-alerts',
      name: 'Attendance Alerts',
      importance: AndroidImportance.HIGH,
    });
  },

  sendAbsenceAlert: async (studentName: string, absenceCount: number) => {
    await notifee.displayNotification({
      title: 'Absence Alert',
      body: `${studentName} has been absent for ${absenceCount} consecutive sessions.`,
      android: {
        channelId: 'attendance-alerts',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
    });
  },
};
