import React, {useState, useEffect, useRef} from 'react';
import {
  Alert,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {useFaceRecognition} from '../../hooks/useFaceRecognition';
import {requestCameraPermission} from '../../utils/permissions';
import {Button, IconButton} from 'react-native-paper';
import {
  adjustFaceOverlayBounds,
  getFaceBoundsProjectionDebug,
  mapFaceBoundsToView,
} from '../../utils/faceBounds';

const ScanScreen = ({navigation, route}: any) => {
  const {classId} = route.params || {};
  const windowSize = useWindowDimensions();
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>(
    'front',
  );
  const [previewSize, setPreviewSize] = useState({
    width: windowSize.width,
    height: windowSize.height,
  });
  const camera = useRef<Camera>(null);
  const lastBboxLogAt = useRef(0);
  const device = useCameraDevice(cameraPosition);
  const {frameProcessor, detectedStudents, modelState, recognizePhoto} =
    useFaceRecognition(classId, cameraPosition);

  const requestPermission = async () => {
    const granted = await requestCameraPermission();
    setHasPermission(granted);
  };

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    if (windowSize.width > 10 && windowSize.height > 10) {
      setPreviewSize({width: windowSize.width, height: windowSize.height});
    }
  }, [windowSize.width, windowSize.height]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>No camera permission</Text>
        <Button mode="contained" onPress={requestPermission}>
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

  const toggleCamera = () => {
    if (isScanning) {
      return;
    }

    setCameraPosition(current => {
      const next = current === 'front' ? 'back' : 'front';
      console.log('[ScanScreen] Switching camera:', current, '->', next);
      return next;
    });
  };

  return (
    <View
      style={styles.container}
      onLayout={event => {
        const {width, height} = event.nativeEvent.layout;
        if (width > 10 && height > 10) {
          setPreviewSize({width, height});
          console.log('[ScanBBox] preview layout:', {width, height});
        }
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
          cameraPosition === 'front',
        );
        const visualBounds = adjustFaceOverlayBounds(
          projectedBounds,
          previewSize,
        );
        const now = Date.now();
        if (index === 0 && now - lastBboxLogAt.current > 1200) {
          lastBboxLogAt.current = now;
          const debugCandidates = getFaceBoundsProjectionDebug(
            face.bounds,
            {width: face.frameWidth, height: face.frameHeight},
            previewSize,
            cameraPosition === 'front',
          );
          console.log('[ScanBBox] projection debug:', {
            cameraPosition,
            previewSize,
            rawFrame: `${face.frameWidth}x${face.frameHeight}`,
            rawBounds: face.bounds,
            rawAreaRatio:
              (face.bounds.width * face.bounds.height) /
              Math.max(1, face.frameWidth * face.frameHeight),
            projected: projectedBounds,
            visual: visualBounds,
            projectedAreaRatio:
              (projectedBounds.width * projectedBounds.height) /
              Math.max(1, previewSize.width * previewSize.height),
            visualAreaRatio:
              (visualBounds.width * visualBounds.height) /
              Math.max(1, previewSize.width * previewSize.height),
            candidates: debugCandidates,
          });
        }

        const isRecognized = face.studentId != null;
        const accentColor = isRecognized ? '#00E676' : '#FFB300';
        const label = face.studentName
          ? face.studentName
          : face.quality < 0.32
          ? 'Align face'
          : 'Face detected';
        const qualityLabel = `${Math.round(face.quality * 100)}%`;

        return (
          <View
            key={index}
            style={[
              styles.faceOverlay,
              {
                left: visualBounds.left,
                top: visualBounds.top,
                width: visualBounds.width,
                height: visualBounds.height,
              },
            ]}>
            <View
              style={[
                styles.corner,
                styles.cornerTopLeft,
                {borderColor: accentColor},
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.cornerTopRight,
                {borderColor: accentColor},
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.cornerBottomLeft,
                {borderColor: accentColor},
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.cornerBottomRight,
                {borderColor: accentColor},
              ]}
            />
            <View style={[styles.scanLine, {backgroundColor: accentColor}]} />
            <View
              style={[
                styles.faceLabelContainer,
                {borderColor: accentColor},
              ]}>
              <View
                style={[styles.statusDot, {backgroundColor: accentColor}]}
              />
              <Text style={styles.faceLabel} numberOfLines={1}>
                {label}
              </Text>
              <Text style={styles.qualityBadge}>{qualityLabel}</Text>
            </View>
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
          disabled={isScanning}
          onPress={toggleCamera}
        />
      </View>

      <View style={styles.statusPill}>
        <Text style={styles.statusText}>
          {modelState === 'loaded'
            ? isScanning
              ? 'Analyzing captured photo...'
              : `${detectedStudents.length} live face(s). ${cameraPosition} camera. Tap to recognize.`
            : modelState === 'error'
            ? `Model error: Failed to load`
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
  faceOverlay: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '52%',
    height: 2,
    opacity: 0.65,
    borderRadius: 2,
  },
  faceLabelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -34,
    minHeight: 28,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5,10,18,0.78)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  faceLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  qualityBadge: {
    color: '#DDE7F0',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
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
