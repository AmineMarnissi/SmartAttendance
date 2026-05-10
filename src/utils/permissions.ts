import {Camera} from 'react-native-vision-camera';
import {Alert, Linking} from 'react-native';

export const requestCameraPermission = async (): Promise<boolean> => {
  const status = await Camera.requestCameraPermission();
  const granted = status === 'granted';

  if (!granted) {
    const currentStatus = Camera.getCameraPermissionStatus();
    Alert.alert(
      'Camera Permission',
      'SmartAttendance needs camera access to perform face recognition. Please enable it in settings.',
      [
        {text: 'Cancel', style: 'cancel'},
        ...(currentStatus === 'denied' || currentStatus === 'restricted'
          ? [{text: 'Open Settings', onPress: () => Linking.openSettings()}]
          : []),
      ],
    );
    return false;
  }

  return true;
};

export const checkCameraPermission = async (): Promise<boolean> => {
  const permission = Camera.getCameraPermissionStatus();
  return permission === 'granted';
};
