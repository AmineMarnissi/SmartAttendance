import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {useFaceRecognition} from '../../hooks/useFaceRecognition';
import {requestCameraPermission} from '../../utils/permissions';
import {Button, IconButton} from 'react-native-paper';

const ScanScreen = ({navigation, route}: any) => {
  const {classId} = route.params || {};
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('front'); // Or 'back' depending on preference
  const {frameProcessor, detectedStudents, modelState} =
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

  const handleCapture = () => {
    // Save results and navigate to Review
    navigation.navigate('ScanReview', {classId, results: detectedStudents});
  };

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        pixelFormat="yuv"
        frameProcessor={frameProcessor}
      />

      {/* Overlays for bounding boxes */}
      {detectedStudents.map((face, index) => (
        <View
          key={index}
          style={[
            styles.faceBox,
            {
              left: face.bounds.x,
              top: face.bounds.y,
              width: face.bounds.width,
              height: face.bounds.height,
            },
          ]}>
          <Text style={styles.faceLabel}>{face.studentName || 'Unknown'}</Text>
        </View>
      ))}

      <View style={styles.controls}>
        <IconButton
          icon="close"
          mode="contained"
          containerColor="rgba(0,0,0,0.5)"
          iconColor="white"
          onPress={() => navigation.goBack()}
        />

        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
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
            ? `${detectedStudents.length} face(s) analyzed`
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
    borderColor: '#4CAF50',
    borderRadius: 4,
  },
  faceLabel: {
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: 12,
    paddingHorizontal: 4,
    position: 'absolute',
    top: -20,
    left: -2,
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
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
});

export default ScanScreen;
