import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Text, Alert, LayoutChangeEvent} from 'react-native';
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
import {db} from '../../services/database/db';
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
import {
  Bounds,
  clampBoundsToPreview,
  mapCameraBoundsToPreview,
  mirrorPreviewBounds,
  PreviewSize,
} from '../../utils/mapCameraBounds';

const FaceCaptureScreen = ({navigation, route}: any) => {
  const {studentData} = route.params;
  const [hasPermission, setHasPermission] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [liveFaceBounds, setLiveFaceBounds] = useState<Bounds | null>(null);
  const [liveFrameSize, setLiveFrameSize] = useState<PreviewSize | null>(null);
  const [previewSize, setPreviewSize] = useState<PreviewSize>({
    width: 1,
    height: 1,
  });
  const [liveQuality, setLiveQuality] = useState(0);
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);
  const capturedEmbeddings = useRef<Float32Array[]>([]);
  const capturedPhotoPath = useRef<string | null>(null);
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
    setLiveFrameSize(payload?.frameSize ?? null);
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
        frameSize: {width: frame.width, height: frame.height},
      });
    },
    [boxedModel, detectFaces, resize, updateLiveFaceOnJS],
  );

  const previewFaceBounds = liveFaceBounds
    ? clampBoundsToPreview(
        mirrorPreviewBounds(
          mapCameraBoundsToPreview(liveFaceBounds, liveFrameSize, previewSize),
          previewSize,
        ),
        previewSize,
      )
    : null;

  const handleCameraLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setPreviewSize({width, height});
  };

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

    if (!capturedPhotoPath.current && cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto({});
        capturedPhotoPath.current = photo.path;
        console.log('[FaceCapture] Saved thumbnail photo path:', photo.path);
      } catch (error) {
        console.warn('[FaceCapture] Could not capture thumbnail photo:', error);
      }
    }

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
      console.log('[FaceCapture] Saving student...', studentData);
      const studentId = await studentRepository.create({
        student_code: studentData.studentCode,
        first_name: studentData.firstName,
        last_name: studentData.lastName,
        thumbnail: capturedPhotoPath.current ?? undefined,
      });
      console.log('[FaceCapture] Created student with id:', studentId);
      await classRepository.enrollStudent(studentId, studentData.classId);
      console.log(
        '[FaceCapture] Enrolled student',
        studentId,
        'in class',
        studentData.classId,
      );

      const embeddingLength = capturedEmbeddings.current[0]?.length ?? 0;
      console.log(
        '[FaceCapture] Saving',
        capturedEmbeddings.current.length,
        'embeddings of length',
        embeddingLength,
      );

      for (const capturedEmbedding of capturedEmbeddings.current) {
        const normalizedEmbedding = l2NormalizeEmbedding(capturedEmbedding);
        console.log(
          '[FaceCapture] Saving embedding sample length:',
          normalizedEmbedding.length,
          'quality:',
          latestQuality.current,
        );
        await embeddingStorage.save(
          studentId,
          normalizedEmbedding,
          latestQuality.current,
        );
      }

      const savedFaceResult = await db.execute(
        'SELECT COUNT(*) as face_count, MAX(LENGTH(embedding)) as embedding_bytes FROM face_embeddings WHERE student_id = ?;',
        [studentId],
      );
      const savedFaceRow = savedFaceResult.rows[0] as any;
      const savedFaceCount = savedFaceRow?.face_count ?? 0;
      const savedEmbeddingBytes = savedFaceRow?.embedding_bytes ?? 0;
      console.log(
        '[FaceCapture] Embedding saved successfully. Count:',
        savedFaceCount,
        'bytes:',
        savedEmbeddingBytes,
        'thumbnail:',
        capturedPhotoPath.current,
      );

      if (savedFaceCount < capturedEmbeddings.current.length) {
        throw new Error(
          'Not all face embeddings were stored for this student.',
        );
      }

      Alert.alert('Success', 'Student enrolled successfully', [
        {text: 'OK', onPress: () => navigation.navigate('AdminDashboard')},
      ]);
    } catch (error) {
      console.error('[FaceCapture] Failed to save student:', error);
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

      <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={true}
          photo={true}
          pixelFormat="yuv"
          frameProcessor={frameProcessor}
        />

        {previewFaceBounds && (
          <View
            style={[
              styles.faceBox,
              {
                left: previewFaceBounds.x,
                top: previewFaceBounds.y,
                width: previewFaceBounds.width,
                height: previewFaceBounds.height,
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
