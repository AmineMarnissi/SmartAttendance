import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Text, Alert} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {Button, ProgressBar, Title, IconButton} from 'react-native-paper';
import {useFaceDetector} from 'react-native-vision-camera-face-detector';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {useRunOnJS} from 'react-native-worklets-core';
import {studentRepository} from '../../services/database/studentRepository';
import {embeddingStorage} from '../../services/faceRecognition/EmbeddingStorage';
import {requestCameraPermission} from '../../utils/permissions';
import {classRepository} from '../../services/database/classRepository';
import {
  buildFaceCrop,
  createEmbeddingInput,
  estimateFaceQuality,
  FACE_EMBEDDING_CAPTURE_TARGETS,
  FACE_EMBEDDING_INPUT_SIZE,
  getExactArrayBuffer,
  l2NormalizeEmbedding,
  useFaceEmbedder,
} from '../../services/faceRecognition/FaceEmbedder';

const FaceCaptureScreen = ({navigation, route}: any) => {
  const {studentData} = route.params;
  const [hasPermission, setHasPermission] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [liveFaceBounds, setLiveFaceBounds] = useState<any | null>(null);
  const [liveQuality, setLiveQuality] = useState(0);
  const device = useCameraDevice('front');
  const capturedEmbeddings = useRef<Float32Array[]>([]);
  const latestEmbedding = useRef<Float32Array | null>(null);
  const latestQuality = useRef(0);
  const {resize} = useResizePlugin();
  const embedder = useFaceEmbedder();
  const boxedModel = embedder.boxedModel;
  const {detectFaces} = useFaceDetector(
    React.useMemo(
      () => ({
        performanceMode: 'accurate' as const,
        contourMode: 'all' as const,
        classificationMode: 'all' as const,
        minFaceSize: 0.15,
        cameraFacing: 'front' as const,
      }),
      [],
    ),
  );

  useEffect(() => {
    (async () => {
      const granted = await requestCameraPermission();
      setHasPermission(granted);
    })();
  }, []);

  const updateLiveFace = useCallback((payload: any) => {
    setLiveFaceBounds(payload?.bounds ?? null);
    setLiveQuality(payload?.quality ?? 0);
    latestQuality.current = payload?.quality ?? 0;
    latestEmbedding.current = payload?.embedding
      ? new Float32Array(payload.embedding)
      : null;
  }, []);

  const updateLiveFaceOnJS = useRunOnJS(updateLiveFace, [updateLiveFace]);
  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      const faces = detectFaces(frame);
      const tflite = boxedModel?.unbox();

      if (faces.length === 0 || tflite == null) {
        updateLiveFaceOnJS(null);
        return;
      }

      let primaryFace = faces[0];
      for (const face of faces) {
        if (
          face.bounds.width * face.bounds.height >
          primaryFace.bounds.width * primaryFace.bounds.height
        ) {
          primaryFace = face;
        }
      }

      const bounds = {
        x: primaryFace.bounds.x,
        y: primaryFace.bounds.y,
        width: primaryFace.bounds.width,
        height: primaryFace.bounds.height,
      };
      const crop = buildFaceCrop(bounds, frame.width, frame.height);
      const resizedFace = resize(frame, {
        crop,
        scale: {
          width: FACE_EMBEDDING_INPUT_SIZE,
          height: FACE_EMBEDDING_INPUT_SIZE,
        },
        pixelFormat: 'rgb',
        dataType: 'float32',
      }) as Float32Array;
      const input = createEmbeddingInput(resizedFace);
      const output = tflite.runSync([getExactArrayBuffer(input)]);
      const embedding = l2NormalizeEmbedding(new Float32Array(output[0]));
      const quality = estimateFaceQuality(
        bounds,
        frame.width,
        frame.height,
        primaryFace.yawAngle,
        primaryFace.pitchAngle,
      );

      updateLiveFaceOnJS({
        bounds,
        quality,
        embedding: Array.from(embedding),
      });
    },
    [boxedModel, detectFaces, resize, updateLiveFaceOnJS],
  );

  const handleCapture = async () => {
    if (captureCount >= FACE_EMBEDDING_CAPTURE_TARGETS || isCapturing) {
      return;
    }

    if (!latestEmbedding.current) {
      Alert.alert(
        'No Face',
        'Place one face clearly inside the camera before capturing.',
      );
      return;
    }

    setIsCapturing(true);
    const embeddingCopy = new Float32Array(latestEmbedding.current);
    capturedEmbeddings.current.push(embeddingCopy);

    const nextCount = captureCount + 1;
    setCaptureCount(nextCount);

    if (nextCount === FACE_EMBEDDING_CAPTURE_TARGETS) {
      await saveStudent();
    }

    setIsCapturing(false);
  };

  const saveStudent = async () => {
    try {
      const studentId = await studentRepository.create({
        student_code: studentData.studentCode,
        first_name: studentData.firstName,
        last_name: studentData.lastName,
      });
      await classRepository.enrollStudent(studentId, studentData.classId);

      const embeddingLength = capturedEmbeddings.current[0]?.length ?? 0;
      const averageEmbedding = new Float32Array(embeddingLength);
      for (let i = 0; i < embeddingLength; i++) {
        let sum = 0;
        capturedEmbeddings.current.forEach(emb => {
          sum += emb[i];
        });
        averageEmbedding[i] = sum / capturedEmbeddings.current.length;
      }

      await embeddingStorage.save(
        studentId,
        averageEmbedding,
        latestQuality.current,
      );

      Alert.alert('Success', 'Student enrolled successfully', [
        {text: 'OK', onPress: () => navigation.navigate('AdminDashboard')},
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save student data');
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>No Camera Permission</Text>
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.center}>
        <Text>No Camera Device</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Face Capture: {studentData.firstName}</Title>
      <Text style={styles.subtitle}>
        Capture {FACE_EMBEDDING_CAPTURE_TARGETS} stable face samples. Keep the
        face centered and change angle slightly.
      </Text>

      <ProgressBar
        progress={captureCount / FACE_EMBEDDING_CAPTURE_TARGETS}
        color="#4CAF50"
        style={styles.progress}
      />

      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          device={device}
          isActive={true}
          pixelFormat="yuv"
          frameProcessor={frameProcessor}
        />

        {liveFaceBounds && (
          <View
            style={[
              styles.faceBox,
              {
                left: liveFaceBounds.x,
                top: liveFaceBounds.y,
                width: liveFaceBounds.width,
                height: liveFaceBounds.height,
              },
            ]}
          />
        )}
      </View>

      <Text style={styles.qualityText}>
        {embedder.state === 'loading'
          ? 'Loading embedding model...'
          : embedder.state === 'error'
          ? 'Embedding model failed to load.'
          : `Live capture quality: ${Math.round(liveQuality * 100)}%`}
      </Text>

      <View style={styles.controls}>
        <IconButton
          icon="close"
          mode="contained"
          onPress={() => navigation.goBack()}
        />

        <Button
          mode="contained"
          onPress={handleCapture}
          loading={isCapturing}
          disabled={
            isCapturing ||
            captureCount >= FACE_EMBEDDING_CAPTURE_TARGETS ||
            embedder.state !== 'loaded' ||
            !latestEmbedding.current
          }
          contentStyle={styles.captureBtn}>
          {captureCount < FACE_EMBEDDING_CAPTURE_TARGETS
            ? `Capture (${captureCount + 1}/${FACE_EMBEDDING_CAPTURE_TARGETS})`
            : 'Done'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  progress: {
    height: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  qualityText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 20,
  },
  captureBtn: {
    paddingHorizontal: 20,
    height: 50,
  },
});

export default FaceCaptureScreen;
