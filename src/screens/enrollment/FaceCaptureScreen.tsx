import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Text, Alert, Image, AppState} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  Button,
  ProgressBar,
  Title,
  IconButton,
  useTheme,
} from 'react-native-paper';
import {
  useFaceDetector,
} from 'react-native-vision-camera-face-detector';
import {Worklets, useSharedValue} from 'react-native-worklets-core';
import {studentRepository} from '../../services/database/studentRepository';
import {embeddingStorage} from '../../services/faceRecognition/EmbeddingStorage';
import {requestCameraPermission} from '../../utils/permissions';
import {classRepository} from '../../services/database/classRepository';
import {
  estimateFaceQuality,
  FACE_EMBEDDING_CAPTURE_TARGETS,
  useFaceEmbedder,
} from '../../services/faceRecognition/FaceEmbedder';
import {extractFaceEmbeddingsFromPhoto} from '../../services/faceRecognition/photoEmbedding';

const CAMERA_FPS = 15;

type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const hasValidBounds = (bounds: FaceBounds | null | undefined) => {
  'worklet';

  return (
    bounds != null &&
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  );
};

const FaceCaptureScreen = ({navigation, route}: any) => {
  const theme = useTheme();
  const {studentData} = route.params;
  const [hasPermission, setHasPermission] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [liveFaceCount, setLiveFaceCount] = useState(0);
  const [isFaceReady, setIsFaceReady] = useState(false);
  const [liveQuality, setLiveQuality] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const cameraFormat = useCameraFormat(device, [
    {photoResolution: {width: 1280, height: 960}},
    {videoResolution: {width: 1280, height: 720}},
    {fps: CAMERA_FPS},
  ]);
  const latestQuality = useRef(0);
  const latestFaceBounds = useRef<FaceBounds | null>(null);
  const latestFrameSize = useRef<{width: number; height: number} | null>(null);
  const capturedPhotoRef = useRef<string | null>(null);
  const hasSavedRef = useRef(false);
  const capturedEmbeddings = useRef<
    Array<{embedding: Float32Array; quality: number}>
  >([]);
  const embedder = useFaceEmbedder();
  const faceDetectionOptions = React.useMemo(
    () => ({
      performanceMode: 'accurate' as const,
      landmarkMode: 'none' as const,
      contourMode: 'none' as const,
      classificationMode: 'none' as const,
      minFaceSize: 0.15,
      trackingEnabled: true,
      cameraFacing: 'front' as const,
    }),
    [],
  );
  const {detectFaces, stopListeners} = useFaceDetector(faceDetectionOptions);

  useEffect(() => {
    (async () => {
      const granted = await requestCameraPermission();
      setHasPermission(granted);
    })();
  }, []);

  useEffect(() => stopListeners, [stopListeners]);

  const updateLiveFace = useCallback((payload: any) => {
    setLiveFaceCount(payload?.faceCount ?? 0);
    setIsFaceReady(Boolean(payload?.ready));
    setLiveQuality(payload?.quality ?? 0);
    latestQuality.current = payload?.quality ?? 0;
    latestFaceBounds.current = payload?.bounds ?? null;
    latestFrameSize.current =
      payload?.frameWidth > 0 && payload?.frameHeight > 0
        ? {width: payload.frameWidth, height: payload.frameHeight}
        : null;
  }, []);

  const updateLiveFaceOnJS = React.useMemo(
    () => Worklets.createRunOnJS(updateLiveFace),
    [updateLiveFace],
  );
  const isActive = useSharedValue(true);
  const frameCounter = useSharedValue(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      isActive.value = state === 'active';
    });
    return () => sub.remove();
  }, [isActive]);

  const [isCameraReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsCameraReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      if (!isActive.value || !isCameraReady) {
        return;
      }

      frameCounter.value += 1;
      if (frameCounter.value % 5 !== 0) {
        return;
      }

      // Synchrone — pas de runAsync
      try {
        const faces = detectFaces(frame) ?? [];
        const validFaces = [];

        for (let i = 0; i < faces.length; i += 1) {
          if (hasValidBounds(faces[i].bounds)) {
            validFaces.push(faces[i]);
          }
        }

        if (validFaces.length === 0) {
          updateLiveFaceOnJS({
            bounds: null,
            faceCount: 0,
            frameWidth: frame.width,
            frameHeight: frame.height,
          });
          return;
        }

        const bestFace = validFaces.sort(
          (a, b) => (b.bounds?.width ?? 0) - (a.bounds?.width ?? 0),
        )[0];

        const quality = estimateFaceQuality(
          bestFace.bounds,
          frame.width,
          frame.height,
          bestFace.yawAngle,
          bestFace.pitchAngle,
        );

        updateLiveFaceOnJS({
          bounds: bestFace.bounds,
          faceCount: validFaces.length,
          frameWidth: frame.width,
          frameHeight: frame.height,
          quality,
        });
      } catch {
        // Ne jamais laisser une exception crasher le thread worklet
      }
    },
    [detectFaces, updateLiveFaceOnJS, isActive, frameCounter, isCameraReady],
  );

  const extractEmbeddingFromPhoto = useCallback(
    async (photoPath: string) => {
      if (embedder.state !== 'loaded') {
        throw new Error('Face embedding model is not ready yet.');
      }

      const {base64, embeddings} = await extractFaceEmbeddingsFromPhoto(
        photoPath,
        embedder.model,
        latestFaceBounds.current
          ? {
              bounds: latestFaceBounds.current,
              frameWidth: latestFrameSize.current?.width,
              frameHeight: latestFrameSize.current?.height,
            }
          : null,
      );
      if (embeddings[0] == null) {
        throw new Error('No valid face embedding was extracted.');
      }
      return {base64, embedding: embeddings[0].embedding};
    },
    [embedder],
  );

  const handleCapture = async () => {
    if (captureCount >= FACE_EMBEDDING_CAPTURE_TARGETS || isCapturing) {
      return;
    }

    if (!isFaceReady || liveFaceCount !== 1) {
      Alert.alert(
        'Face Not Ready',
        'Keep exactly one face visible and steady before capturing.',
      );
      return;
    }

    if (embedder.state !== 'loaded') {
      Alert.alert('Model Loading', 'Face embedding model is not ready yet.');
      return;
    }

    setIsCapturing(true);

    try {
      if (!camera.current) {
        throw new Error('Camera is not ready.');
      }

      const photo = await camera.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      const {base64, embedding} = await extractEmbeddingFromPhoto(photo.path);

      capturedEmbeddings.current.push({
        embedding,
        quality: latestQuality.current,
      });
      setCaptureCount(capturedEmbeddings.current.length);

      if (captureCount === 0) {
        const dataUri = `data:image/jpeg;base64,${base64}`;
        capturedPhotoRef.current = dataUri;
        setCapturedPhoto(dataUri);
      }
    } catch (e) {
      console.error('[FaceCapture] Capture failed:', e);
      const message = e instanceof Error ? e.message : 'Failed to capture face image';
      Alert.alert('Error', message);
      setIsCapturing(false);
      return;
    } finally {
      if (capturedEmbeddings.current.length < FACE_EMBEDDING_CAPTURE_TARGETS) {
        setIsCapturing(false);
      }
    }
  };

  const saveStudent = useCallback(async () => {
    try {
      setIsCapturing(true);
      console.log('[FaceCapture] Saving student...', studentData);

      // Convert captured photo to Uint8Array for storage if available
      let thumbnail: Uint8Array | undefined;
      const thumbnailSource = capturedPhotoRef.current || capturedPhoto;
      if (thumbnailSource) {
        const base64Data = thumbnailSource.split(',')[1];
        const binaryString = atob(base64Data);
        thumbnail = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          thumbnail[i] = binaryString.charCodeAt(i);
        }
      }

      const studentId = await studentRepository.create({
        student_code: studentData.studentCode,
        first_name: studentData.firstName,
        last_name: studentData.lastName,
        thumbnail,
      });
      console.log('[FaceCapture] Created student with id:', studentId);
      await classRepository.enrollStudent(studentId, studentData.classId);
      console.log(
        '[FaceCapture] Enrolled student',
        studentId,
        'in class',
        studentData.classId,
      );

      for (const capture of capturedEmbeddings.current) {
        await embeddingStorage.save(
          studentId,
          capture.embedding,
          capture.quality,
        );
      }
      console.log(
        '[FaceCapture] Saved embeddings:',
        capturedEmbeddings.current.length,
      );

      Alert.alert('Success', 'Student enrolled successfully', [
        {text: 'OK', onPress: () => navigation.navigate('AdminDashboard')},
      ]);
    } catch (error) {
      hasSavedRef.current = false;
      console.error('[FaceCapture] Failed to save student:', error);
      Alert.alert('Error', 'Failed to save student data');
    } finally {
      setIsCapturing(false);
    }
  }, [capturedPhoto, navigation, studentData]);

  useEffect(() => {
    if (
      captureCount === FACE_EMBEDDING_CAPTURE_TARGETS &&
      !hasSavedRef.current
    ) {
      hasSavedRef.current = true;
      saveStudent();
    }
  }, [captureCount, saveStudent]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={{color: theme.colors.onSurface}}>No Camera Permission</Text>
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={{color: theme.colors.onSurface}}>No Camera Device</Text>
      </View>
    );
  }

  const guideColor =
    liveFaceCount > 1
      ? theme.colors.error
      : isFaceReady
      ? theme.colors.primary
      : theme.colors.tertiary;
  const helperText =
    embedder.state === 'loading'
      ? 'Loading face embedding model...'
      : embedder.state === 'error'
      ? `Face embedding model error: ${embedder.errorMessage || 'Unknown error'}`
      : liveFaceCount === 0
      ? 'No face detected.'
      : liveFaceCount > 1
      ? 'Only one face is allowed during enrollment.'
      : isFaceReady
      ? `Ready to capture (${Math.round(liveQuality * 100)}% quality).`
      : `Hold still (${Math.round(
          liveQuality * 100,
        )}% quality).`;

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Title style={[styles.title, {color: theme.colors.onSurface}]}>
        Face Capture: {studentData.firstName}
      </Title>
      <Text style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>
        Capture {FACE_EMBEDDING_CAPTURE_TARGETS} stable face samples. Keep the
        face centered and change angle slightly.
      </Text>

      <ProgressBar
        progress={captureCount / FACE_EMBEDDING_CAPTURE_TARGETS}
        color={theme.colors.primary}
        style={styles.progress}
      />

      <View
        style={styles.cameraContainer}>
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          format={cameraFormat}
          fps={CAMERA_FPS}
          isActive={true}
          pixelFormat="yuv"
          photoQualityBalance="speed"
          photo={true}
          frameProcessor={frameProcessor}
        />

        <View
          pointerEvents="none"
          style={[
            styles.faceGuide,
            {
              borderColor: guideColor,
              shadowColor: guideColor,
            },
          ]}>
          <Text style={[styles.faceHint, {backgroundColor: guideColor}]}>
            {liveFaceCount > 1
              ? 'Multiple Faces'
              : isFaceReady
              ? 'Ready'
              : liveFaceCount === 1
              ? 'Face Detected'
              : 'No Face'}
          </Text>
        </View>

        {capturedPhoto && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Last Capture:</Text>
            <Image source={{uri: capturedPhoto}} style={styles.previewImage} />
          </View>
        )}
      </View>

      <Text
        style={[styles.qualityText, {color: theme.colors.onSurfaceVariant}]}>
        {helperText}
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
            !isFaceReady ||
            liveFaceCount !== 1
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
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  faceGuide: {
    position: 'absolute',
    alignSelf: 'center',
    top: '18%',
    width: '58%',
    aspectRatio: 0.72,
    borderWidth: 3,
    borderRadius: 999,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 0},
  },
  faceHint: {
    color: '#FFFFFF',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  previewContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewLabel: {
    color: '#fff',
    fontSize: 10,
    marginBottom: 4,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  qualityText: {
    textAlign: 'center',
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
