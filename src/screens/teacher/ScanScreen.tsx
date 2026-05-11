import React, {useState, useEffect, useRef} from 'react';
import {Alert, View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {useFaceRecognition} from '../../hooks/useFaceRecognition';
import {requestCameraPermission} from '../../utils/permissions';
import {Button, IconButton} from 'react-native-paper';
import {mapFaceBoundsToView} from '../../utils/faceBounds';

const ScanScreen = ({navigation, route}: any) => {
  const {classId} = route.params || {};
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [previewSize, setPreviewSize] = useState({width: 1, height: 1});
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const {frameProcessor, detectedStudents, modelState, recognizePhoto} =
    useFaceRecognition(classId);

  useEffect(() => {
    (async () => {
      const granted = await requestCameraPermission();
      setHasPermission(granted);
    })();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>No camera permission</Text>
        <Button mode="contained" onPress={() => requestCameraPermission()}>
          Grant Permission
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text>No camera device found</Text>
      </View>
    );
  }

  const handleCapture = async () => {
    if (isScanning) {
      return;
    }

    if (!camera.current) {
      Alert.alert('Camera Not Ready', 'Please wait for the camera preview.');
      return;
    }

    if (modelState !== 'loaded') {
      Alert.alert('Model Loading', 'Face recognition model is not ready yet.');
      return;
    }

    setIsScanning(true);
    console.log('[ScanScreen] Scan button pressed for class:', classId);

    try {
      const photo = await camera.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      console.log('[ScanScreen] Photo captured:', photo.path);
      const results = await recognizePhoto(photo.path);
      console.log('[ScanScreen] Recognition results:', results);
      navigation.navigate('ScanReview', {classId, results});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to scan faces.';
      console.error('[ScanScreen] Scan failed:', error);
      Alert.alert('Scan Failed', message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={event => {
        const {width, height} = event.nativeEvent.layout;
        setPreviewSize({width, height});
      }}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        pixelFormat="yuv"
        photo={true}
        frameProcessor={frameProcessor}
      />

      {/* Overlays for bounding boxes */}
      {detectedStudents.map((face, index) => {
        const projectedBounds = mapFaceBoundsToView(
          face.bounds,
          {width: face.frameWidth, height: face.frameHeight},
          previewSize,
          true,
        );
        const isRecognized = face.studentId != null;

        return (
          <View
            key={index}
            style={[
              styles.faceBox,
              isRecognized ? styles.faceBoxRecognized : styles.faceBoxPending,
              {
                left: projectedBounds.left,
                top: projectedBounds.top,
                width: projectedBounds.width,
                height: projectedBounds.height,
              },
            ]}>
            <Text
              style={[
                styles.faceLabel,
                isRecognized
                  ? styles.faceLabelRecognized
                  : styles.faceLabelPending,
              ]}>
              {face.studentName ||
                (face.quality < 0.32 ? 'Align Face' : 'Scanning...')}
            </Text>
          </View>
        );
      })}

      <View style={styles.controls}>
        <IconButton
          icon="close"
          mode="contained"
          containerColor="rgba(0,0,0,0.5)"
          iconColor="white"
          onPress={() => navigation.goBack()}
        />

        <TouchableOpacity
          disabled={isScanning}
          style={[
            styles.captureBtn,
            isScanning ? styles.captureBtnDisabled : null,
          ]}
          onPress={handleCapture}>
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <IconButton
          icon="camera-flip"
          mode="contained"
          containerColor="rgba(0,0,0,0.5)"
          iconColor="white"
          onPress={() => {}} // Toggle camera device
        />
      </View>

      <View style={styles.statusPill}>
        <Text style={styles.statusText}>
          {modelState === 'loaded'
            ? isScanning
              ? 'Analyzing captured photo...'
              : `${detectedStudents.length} live face(s). Tap to recognize.`
            : modelState === 'error'
            ? 'Embedding model unavailable'
            : 'Loading face embedding model...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  faceBoxRecognized: {
    borderColor: '#4CAF50',
  },
  faceBoxPending: {
    borderColor: '#FFB300',
  },
  faceLabel: {
    color: 'white',
    fontSize: 12,
    paddingHorizontal: 4,
    position: 'absolute',
    top: -20,
    left: -2,
  },
  faceLabelRecognized: {
    backgroundColor: '#4CAF50',
  },
  faceLabelPending: {
    backgroundColor: '#FFB300',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusPill: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
});

export default ScanScreen;
