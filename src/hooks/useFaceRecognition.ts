import {useState, useCallback, useEffect, useMemo} from 'react';
import {useFrameProcessor} from 'react-native-vision-camera';
import {useFaceDetector} from 'react-native-vision-camera-face-detector';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {useRunOnJS} from 'react-native-worklets-core';
import {
  EnrolledEmbedding,
  FaceMatcher,
  MatchDebugInfo,
} from '../services/faceRecognition/FaceMatcher';
import {embeddingStorage} from '../services/faceRecognition/EmbeddingStorage';
import {studentRepository} from '../services/database/studentRepository';
import {
  buildFaceCrop,
  createEmbeddingInput,
  FACE_EMBEDDING_INPUT_SIZE,
  getExactArrayBuffer,
  l2NormalizeEmbedding,
  useFaceEmbedder,
} from '../services/faceRecognition/FaceEmbedder';

export interface DetectedStudent {
  studentId: number | null;
  studentName?: string;
  confidence: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  frameSize?: {
    width: number;
    height: number;
  };
  bestConfidence?: number;
  debugReason?: string;
}

export const LIVE_CAMERA_MATCH_THRESHOLD = 0.68;

type LiveFaceEmbedding = {
  bounds: DetectedStudent['bounds'];
  frameSize: NonNullable<DetectedStudent['frameSize']>;
  embedding: number[];
};

export const useFaceRecognition = (classId?: number) => {
  const [enrolledEmbeddings, setEnrolledEmbeddings] = useState<
    EnrolledEmbedding[]
  >([]);
  const [detectedStudents, setDetectedStudents] = useState<DetectedStudent[]>(
    [],
  );
  const [studentNames, setStudentNames] = useState<Record<number, string>>({});
  const [lastDebug, setLastDebug] = useState<MatchDebugInfo | null>(null);
  const {resize} = useResizePlugin();
  const embedder = useFaceEmbedder();
  const faceDetectionOptions = useMemo(
    () => ({
      performanceMode: 'accurate' as const,
      contourMode: 'all' as const,
      classificationMode: 'all' as const,
      minFaceSize: 0.15,
      cameraFacing: 'front' as const,
    }),
    [],
  );
  const {detectFaces} = useFaceDetector(faceDetectionOptions);

  useEffect(() => {
    const numericClassId = classId ? Number(classId) : null;
    console.log(
      '[useFaceRecognition] classId prop:',
      classId,
      'numeric:',
      numericClassId,
    );
    if (numericClassId) {
      loadClassData(numericClassId);
    } else {
      console.warn(
        '[useFaceRecognition] classId is null/undefined — no embeddings loaded',
      );
      setEnrolledEmbeddings([]);
      setStudentNames({});
    }
  }, [classId]);

  const loadClassData = async (id: number) => {
    console.log('[useFaceRecognition] Loading data for classId:', id);
    const [embeddings, students] = await Promise.all([
      embeddingStorage.getAllForClass(id),
      studentRepository.getForClass(id),
    ]);

    console.log(
      '[useFaceRecognition] Loaded',
      embeddings.length,
      'embeddings and',
      students.length,
      'students for class',
      id,
    );
    setEnrolledEmbeddings(embeddings);
    setStudentNames(
      students.reduce<Record<number, string>>((acc, student) => {
        acc[student.id] = `${student.first_name} ${student.last_name}`;
        return acc;
      }, {}),
    );
  };

  const updateLiveFaces = useCallback(
    (liveFaces: LiveFaceEmbedding[]) => {
      const results = liveFaces.map(face => {
        const liveEmbedding = new Float32Array(face.embedding);
        const {match, debug} = FaceMatcher.matchWithDebug(
          liveEmbedding,
          enrolledEmbeddings,
          LIVE_CAMERA_MATCH_THRESHOLD,
        );

        setLastDebug(debug);
        console.log(
          `[FaceRecognition] best=${debug.bestConfidence.toFixed(
            4,
          )} studentId=${debug.bestStudentId} threshold=${
            debug.threshold
          } enrolled=${debug.enrolledCount} liveLength=${
            debug.liveLength
          } reason=${debug.reason ?? 'ok'}`,
        );

        return {
          studentId: match?.studentId ?? null,
          studentName:
            match?.studentId != null
              ? studentNames[match.studentId]
              : undefined,
          confidence: match?.confidence ?? 0,
          bounds: face.bounds,
          frameSize: face.frameSize,
          bestConfidence: debug.bestConfidence,
          debugReason: debug.reason,
        };
      });

      setDetectedStudents(results);
    },
    [enrolledEmbeddings, studentNames],
  );

  const updateLiveFacesOnJS = useRunOnJS(updateLiveFaces, [updateLiveFaces]);
  const boxedModel = embedder.boxedModel;

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      const faces = detectFaces(frame);
      const liveFaces: LiveFaceEmbedding[] = [];
      const tflite = boxedModel?.unbox();

      if (tflite == null) {
        updateLiveFacesOnJS([]);
        return;
      }

      for (const face of faces) {
        const bounds = {
          x: face.bounds.x,
          y: face.bounds.y,
          width: face.bounds.width,
          height: face.bounds.height,
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
        const liveEmbedding = l2NormalizeEmbedding(new Float32Array(output[0]));

        liveFaces.push({
          bounds,
          frameSize: {width: frame.width, height: frame.height},
          embedding: Array.from(liveEmbedding),
        });
      }

      updateLiveFacesOnJS(liveFaces);
    },
    [boxedModel, detectFaces, resize, updateLiveFacesOnJS],
  );

  return {
    frameProcessor,
    detectedStudents,
    modelState: embedder.state,
    enrolledCount: enrolledEmbeddings.length,
    lastDebug,
    reloadClassData: () => {
      if (classId) {
        loadClassData(Number(classId));
      }
    },
  };
};
