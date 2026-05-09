import {scanFaces, type Face} from 'vision-camera-face-detector';

export const useFaceDetector = () => {
  return {
    detectFaces: (frame: any): Face[] => {
      'worklet';
      return scanFaces(frame);
    },
  };
};
