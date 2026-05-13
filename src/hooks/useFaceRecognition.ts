import {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {
  runAsync,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {useFaceDetector} from 'react-native-vision-camera-face-detector';
import {Worklets} from 'react-native-worklets-core';
import {
  EnrolledEmbedding,
  MATCH_THRESHOLD,
} from '../services/faceRecognition/FaceMatcher';
import {embeddingStorage} from '../services/faceRecognition/EmbeddingStorage';
import {studentRepository} from '../services/database/studentRepository';
import {
  estimateFaceQuality,
  useFaceEmbedder,
} from '../services/faceRecognition/FaceEmbedder';
import {extractFaceEmbeddingsFromPhoto} from '../services/faceRecognition/photoEmbedding';
import type {PhotoEmbeddingFallback} from '../services/faceRecognition/photoEmbedding';
import {cosineSimilarity} from '../utils/cosineSimilarity';

const MIN_RECOGNITION_QUALITY = 0.2;

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

const matchEmbedding = (
  liveEmbedding: Float32Array,
  enrolledEmbeddings: EnrolledEmbedding[],
  studentNames: Record<number, string>,
  excludedStudentIds: Set<number> = new Set(),
) => {
  let bestStudentId: number | null = null;
  let bestConfidence = 0;
  let secondConfidence = 0;

  for (const enrolled of enrolledEmbeddings) {
    if (excludedStudentIds.has(enrolled.studentId)) {
      continue;
    }

    const similarity = cosineSimilarity(liveEmbedding, enrolled.embedding);
    if (similarity > bestConfidence) {
      secondConfidence = bestConfidence;
      bestConfidence = similarity;
      bestStudentId = enrolled.studentId;
    } else if (similarity > secondConfidence) {
      secondConfidence = similarity;
    }
  }

  console.log('[ScanRecognition] best match:', {
    studentId: bestStudentId,
    confidence: bestConfidence,
    secondConfidence,
    threshold: MATCH_THRESHOLD,
  });

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
  const lastLiveFaceRef = useRef<DetectedStudent | null>(null);
  const lastLiveFacesRef = useRef<DetectedStudent[]>([]);
  const frameCounter = useRef(0);
  const bboxHistory = useRef<Record<number | string, {x: number, y: number, w: number, h: number}[]>>({});
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
    const bestLiveFace =
      matches
        .slice()
        .sort(
          (a, b) =>
            b.quality - a.quality ||
            b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height,
        )[0] ?? null;

    lastLiveFaceRef.current = bestLiveFace;
    lastLiveFacesRef.current = matches;
    setDetectedStudents(matches);
  }, []);

  const updateResultsOnJS = useMemo(
    () => Worklets.createRunOnJS(updateResults),
    [updateResults],
  );

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      // 1. Limiteur de frames (Throttle)
      frameCounter.current++;
      if (frameCounter.current % 3 !== 0) {
        return;
      }

      runAsync(frame, () => {
        'worklet';

        const faces = detectFaces(frame);
        const results: DetectedStudent[] = faces
          .map(face => {
            if (face.bounds == null) {
              return null;
            }

            const bounds = face.bounds;
            const quality = estimateFaceQuality(
              bounds,
              frame.width,
              frame.height,
              face.yawAngle,
              face.pitchAngle,
            );

            // 2. Lissage (Smoothing)
            const faceId = face.trackingId ?? 'unknown';
            if (!bboxHistory.current[faceId]) {
              bboxHistory.current[faceId] = [];
            }
            const history = bboxHistory.current[faceId];
            history.push({
              x: bounds.x,
              y: bounds.y,
              w: bounds.width,
              h: bounds.height,
            });
            if (history.length > 5) {
              history.shift();
            }

            const avgX =
              history.reduce((sum, b) => sum + b.x, 0) / history.length;
            const avgY =
              history.reduce((sum, b) => sum + b.y, 0) / history.length;
            const avgW =
              history.reduce((sum, b) => sum + b.w, 0) / history.length;
            const avgH =
              history.reduce((sum, b) => sum + b.h, 0) / history.length;

            return {
              studentId: null,
              confidence: 0,
              quality,
              trackingId: face.trackingId,
              bounds: {
                x: avgX,
                y: avgY,
                width: avgW,
                height: avgH,
              },
              frameWidth: frame.width,
              frameHeight: frame.height,
            };
          })
          .filter((result): result is DetectedStudent => result != null);

        updateResultsOnJS(results);
      });
    },
    [detectFaces, updateResultsOnJS],
  );

  const recognizePhoto = useCallback(
    async (photoPath: string): Promise<DetectedStudent[]> => {
      console.log('[ScanRecognition] Starting photo scan:', {
        classId,
        modelState: embedder.state,
        enrolledEmbeddings: enrolledEmbeddings.length,
        students: Object.keys(studentNames).length,
      });

      if (embedder.state !== 'loaded') {
        throw new Error('Face embedding model is not ready yet.');
      }

      if (enrolledEmbeddings.length === 0) {
        throw new Error('No enrolled face embeddings found for this class.');
      }

      const fallbackFaces: PhotoEmbeddingFallback[] =
        lastLiveFacesRef.current.length > 0
          ? lastLiveFacesRef.current.map(face => ({
              bounds: face.bounds,
              frameWidth: face.frameWidth,
              frameHeight: face.frameHeight,
            }))
          : lastLiveFaceRef.current
          ? [
              {
                bounds: lastLiveFaceRef.current.bounds,
                frameWidth: lastLiveFaceRef.current.frameWidth,
                frameHeight: lastLiveFaceRef.current.frameHeight,
              },
            ]
          : [];

      console.log('[ScanRecognition] Live face fallbacks:', fallbackFaces);

      const {embeddings} = await extractFaceEmbeddingsFromPhoto(
        photoPath,
        embedder.model,
        fallbackFaces,
      );

      console.log('[ScanRecognition] Faces extracted from photo:', embeddings.length);

      const usedStudentIds = new Set<number>();
      const matches = embeddings.map((face, index) => {
        const match =
          face.quality >= MIN_RECOGNITION_QUALITY
            ? matchEmbedding(
                face.embedding,
                enrolledEmbeddings,
                studentNames,
                usedStudentIds,
              )
            : null;
        if (match?.studentId != null) {
          usedStudentIds.add(match.studentId);
        }

        console.log('[ScanRecognition] Face result:', {
          index,
          quality: face.quality,
          studentId: match?.studentId ?? null,
          studentName: match?.studentName ?? 'Unknown',
          confidence: match?.confidence ?? 0,
        });

        return {
          studentId: match?.studentId ?? null,
          studentName: match?.studentName,
          confidence: match?.confidence ?? 0,
          quality: face.quality,
          bounds: face.bounds,
          frameWidth: face.frameWidth,
          frameHeight: face.frameHeight,
        };
      });

      setDetectedStudents(matches);
      return matches;
    },
    [classId, embedder, enrolledEmbeddings, studentNames],
  );

  return {
    frameProcessor,
    detectedStudents,
    modelState: embedder.state,
    recognizePhoto,
  };
};
