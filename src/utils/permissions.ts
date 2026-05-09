import {VisionCamera} from 'react-native-vision-camera';
import {Alert, Linking} from 'react-native';

export const requestCameraPermission = async (): Promise<boolean> => {
  const granted = await VisionCamera.requestCameraPermission();

  if (!granted) {
    const status = VisionCamera.cameraPermissionStatus;
    Alert.alert(
      'Camera Permission',
      'SmartAttendance needs camera access to perform face recognition. Please enable it in settings.',
      [
        {text: 'Cancel', style: 'cancel'},
        ...(status === 'denied' || status === 'restricted'
          ? [{text: 'Open Settings', onPress: () => Linking.openSettings()}]
          : []),
      ],
    );
    return false;
  }

  return true;
};

export const checkCameraPermission = async (): Promise<boolean> => {
  const permission = VisionCamera.cameraPermissionStatus;
  return permission === 'authorized';
};
