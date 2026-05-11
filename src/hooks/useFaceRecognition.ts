import {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {
  runAsync,
  runAtTargetFps,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {useFaceDetector} from 'react-native-vision-camera-face-detector';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {Worklets} from 'react-native-worklets-core';
import {
  EnrolledEmbedding,
  MATCH_THRESHOLD,
} from '../services/faceRecognition/FaceMatcher';
import {embeddingStorage} from '../services/faceRecognition/EmbeddingStorage';
import {studentRepository} from '../services/database/studentRepository';
import {
  buildFaceCrop,
  createEmbeddingInput,
  estimateFaceQuality,
  FACE_EMBEDDING_INPUT_SIZE,
  getExactArrayBuffer,
  l2NormalizeEmbedding,
  useFaceEmbedder,
} from '../services/faceRecognition/FaceEmbedder';

const RECOGNITION_PROCESS_FPS = 5;
const MIN_RECOGNITION_QUALITY = 0.32;
const STABLE_MATCH_FRAMES = 2;

export interface DetectedStudent {
  studentId: number | null;
  studentName?: string;
  confidence: number;
  quality: number;
  trackingId?: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  frameWidth: number;
  frameHeight: number;
}

const cosineSimilarityWorklet = (a: Float32Array, b: Float32Array) => {
  'worklet';

  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return denominator === 0 ? 0 : dot / denominator;
};

const matchEmbeddingWorklet = (
  liveEmbedding: Float32Array,
  enrolledEmbeddings: EnrolledEmbedding[],
  studentNames: Record<number, string>,
) => {
  'worklet';

  let bestStudentId: number | null = null;
  let bestConfidence = 0;

  for (const enrolled of enrolledEmbeddings) {
    const similarity = cosineSimilarityWorklet(
      liveEmbedding,
      enrolled.embedding,
    );
    if (similarity > bestConfidence) {
      bestConfidence = similarity;
      bestStudentId = enrolled.studentId;
    }
  }

  if (bestStudentId == null || bestConfidence < MATCH_THRESHOLD) {
    return null;
  }

  return {
    studentId: bestStudentId,
    confidence: bestConfidence,
    studentName: studentNames[bestStudentId],
  };
};

export const useFaceRecognition = (classId?: number) => {
  const [enrolledEmbeddings, setEnrolledEmbeddings] = useState<
    EnrolledEmbedding[]
  >([]);
  const [detectedStudents, setDetectedStudents] = useState<DetectedStudent[]>(
    [],
  );
  const [studentNames, setStudentNames] = useState<Record<number, string>>({});
  const stabilityRef = useRef<Record<number, {count: number; studentId: number | null}>>(
    {},
  );
  const {resize} = useResizePlugin();
  const embedder = useFaceEmbedder();
  const faceDetectionOptions = useMemo(
    () => ({
      performanceMode: 'fast' as const,
      landmarkMode: 'none' as const,
      contourMode: 'none' as const,
      classificationMode: 'none' as const,
      minFaceSize: 0.18,
      trackingEnabled: true,
      cameraFacing: 'front' as const,
    }),
    [],
  );
  const {detectFaces, stopListeners} = useFaceDetector(faceDetectionOptions);

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

  useEffect(() => stopListeners, [stopListeners]);

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

  const updateResults = useCallback((matches: DetectedStudent[]) => {
    const nextStability: Record<number, {count: number; studentId: number | null}> =
      {};
    const stabilizedMatches = matches.map((match, index) => {
      const key = match.trackingId ?? index;
      const previous = stabilityRef.current[key];
      const count =
        match.studentId != null && previous?.studentId === match.studentId
          ? previous.count + 1
          : match.studentId != null
          ? 1
          : 0;

      nextStability[key] = {
        count,
        studentId: match.studentId,
      };

      if (match.studentId == null || count < STABLE_MATCH_FRAMES) {
        return {
          ...match,
          studentId: null,
          studentName: undefined,
          confidence: 0,
        };
      }

      return match;
    });

    stabilityRef.current = nextStability;
    setDetectedStudents(stabilizedMatches);
  }, []);

  const updateResultsOnJS = useMemo(
    () => Worklets.createRunOnJS(updateResults),
    [updateResults],
  );
  const boxedModel = embedder.boxedModel;

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      runAtTargetFps(RECOGNITION_PROCESS_FPS, () => {
        'worklet';

        runAsync(frame, () => {
          'worklet';

          const faces = detectFaces(frame);
          const results: DetectedStudent[] = [];
          const tflite = boxedModel?.unbox();

          for (const face of faces) {
            const quality = estimateFaceQuality(
              face.bounds,
              frame.width,
              frame.height,
              face.yawAngle,
              face.pitchAngle,
            );
            let match:
              | {studentId: number; confidence: number; studentName?: string}
              | null = null;

            if (
              tflite != null &&
              enrolledEmbeddings.length > 0 &&
              quality >= MIN_RECOGNITION_QUALITY
            ) {
              const crop = buildFaceCrop(face.bounds, frame.width, frame.height);
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
              const liveEmbedding = l2NormalizeEmbedding(
                new Float32Array(output[0]),
              );
              match = matchEmbeddingWorklet(
                liveEmbedding,
                enrolledEmbeddings,
                studentNames,
              );
            }

            results.push({
              studentId: match?.studentId ?? null,
              studentName: match?.studentName,
              confidence: match?.confidence ?? 0,
              quality,
              trackingId: face.trackingId,
              bounds: face.bounds,
              frameWidth: frame.width,
              frameHeight: frame.height,
            });
          }

          updateResultsOnJS(results);
        });
      });
    },
    [
      boxedModel,
      detectFaces,
      enrolledEmbeddings,
      resize,
      studentNames,
      updateResultsOnJS,
    ],
  );

  return {
    frameProcessor,
    detectedStudents,
    modelState: embedder.state,
  };
};
