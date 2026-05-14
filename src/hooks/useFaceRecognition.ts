import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import {
  type CameraPosition,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets, useSharedValue } from 'react-native-worklets-core';
import {
  EnrolledEmbedding,
  MIN_RELAXED_MATCH_MARGIN,
  MATCH_THRESHOLD,
  RELAXED_MATCH_THRESHOLD,
} from '../services/faceRecognition/FaceMatcher';
import { embeddingStorage } from '../services/faceRecognition/EmbeddingStorage';
import { studentRepository } from '../services/database/studentRepository';
import {
  estimateFaceQuality,
  useFaceEmbedder,
} from '../services/faceRecognition/FaceEmbedder';
import { extractFaceEmbeddingsFromPhoto } from '../services/faceRecognition/photoEmbedding';
import type { PhotoEmbeddingFallback } from '../services/faceRecognition/photoEmbedding';
import { cosineSimilarity } from '../utils/cosineSimilarity';

const MIN_RECOGNITION_QUALITY = 0.2;
const MAX_LIVE_BOUNDS_AGE_MS = 5000;
const BBOX_SMOOTHING_ALPHA = 0.22;
const BBOX_DEADBAND_RATIO = 0.012;
const BBOX_MAX_MATCH_DISTANCE_RATIO = 0.18;

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

const getFaceCenter = (face: DetectedStudent) => ({
  x: face.bounds.x + face.bounds.width / 2,
  y: face.bounds.y + face.bounds.height / 2,
});

const getFaceDistanceRatio = (a: DetectedStudent, b: DetectedStudent) => {
  const centerA = getFaceCenter(a);
  const centerB = getFaceCenter(b);
  const frameDiagonal = Math.max(
    1,
    Math.hypot(a.frameWidth, a.frameHeight),
  );

  return Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y) / frameDiagonal;
};

const smoothValue = (previous: number, next: number, deadband: number) => {
  const delta = next - previous;

  if (Math.abs(delta) <= deadband) {
    return previous;
  }

  return previous + delta * BBOX_SMOOTHING_ALPHA;
};

const smoothFaceBounds = (
  previous: DetectedStudent,
  next: DetectedStudent,
): DetectedStudent => {
  const deadband = Math.max(next.frameWidth, next.frameHeight) * BBOX_DEADBAND_RATIO;

  return {
    ...next,
    bounds: {
      x: smoothValue(previous.bounds.x, next.bounds.x, deadband),
      y: smoothValue(previous.bounds.y, next.bounds.y, deadband),
      width: smoothValue(previous.bounds.width, next.bounds.width, deadband),
      height: smoothValue(previous.bounds.height, next.bounds.height, deadband),
    },
  };
};

const findPreviousFace = (
  match: DetectedStudent,
  previousFaces: DetectedStudent[],
  usedPreviousIndexes: Set<number>,
) => {
  if (match.trackingId != null) {
    const trackingIndex = previousFaces.findIndex(
      (previous, index) =>
        !usedPreviousIndexes.has(index) &&
        previous.trackingId === match.trackingId,
    );

    if (trackingIndex >= 0) {
      return trackingIndex;
    }
  }

  let bestIndex = -1;
  let bestDistance = BBOX_MAX_MATCH_DISTANCE_RATIO;

  previousFaces.forEach((previous, index) => {
    if (usedPreviousIndexes.has(index)) {
      return;
    }

    const distance = getFaceDistanceRatio(previous, match);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const matchEmbedding = (
  liveEmbedding: Float32Array,
  enrolledEmbeddings: EnrolledEmbedding[],
  studentNames: Record<number, string>,
  excludedStudentIds: Set<number> = new Set(),
) => {
  const scoresByStudent = new Map<number, number[]>();
  const topCandidates: Array<{ studentId: number; confidence: number }> = [];

  for (const enrolled of enrolledEmbeddings) {
    if (excludedStudentIds.has(enrolled.studentId)) {
      continue;
    }

    const similarity = cosineSimilarity(liveEmbedding, enrolled.embedding);
    const scores = scoresByStudent.get(enrolled.studentId) ?? [];
    scores.push(similarity);
    scoresByStudent.set(enrolled.studentId, scores);
  }

  let bestStudentId: number | null = null;
  let bestConfidence = 0;
  let secondConfidence = 0;

  for (const [studentId, scores] of scoresByStudent) {
    const sortedScores = scores.slice().sort((a, b) => b - a);
    const strongestScores = sortedScores.slice(0, 2);
    const studentConfidence =
      strongestScores.reduce((sum, score) => sum + score, 0) /
      strongestScores.length;

    topCandidates.push({
      studentId,
      confidence: studentConfidence,
    });

    if (studentConfidence > bestConfidence) {
      secondConfidence = bestConfidence;
      bestConfidence = studentConfidence;
      bestStudentId = studentId;
    } else if (studentConfidence > secondConfidence) {
      secondConfidence = studentConfidence;
    }
  }

  if (bestStudentId != null) {
    console.log(`[Matching] Best match for face: ${studentNames[bestStudentId]} (ID: ${bestStudentId})`);
    console.log(`[Matching]   - Confidence: ${bestConfidence.toFixed(4)}`);
    console.log(`[Matching]   - Second Best: ${secondConfidence.toFixed(4)}`);
    console.log(`[Matching]   - Margin: ${(bestConfidence - secondConfidence).toFixed(4)}`);
    console.log(`[Matching]   - Required Threshold: ${MATCH_THRESHOLD}`);
  } else {
    console.log('[Matching] No candidate students found with embeddings.');
  }

  const isStrictMatch = bestConfidence >= MATCH_THRESHOLD;
  const isRelaxedMatch =
    bestConfidence >= RELAXED_MATCH_THRESHOLD &&
    bestConfidence - secondConfidence >= MIN_RELAXED_MATCH_MARGIN;

  if (bestStudentId == null || (!isStrictMatch && !isRelaxedMatch)) {
    if (bestStudentId != null) {
      console.warn(`[Matching] Match REJECTED for ${studentNames[bestStudentId]} (Score too low or margin too small)`);
    }
    return null;
  }

  return {
    studentId: bestStudentId,
    confidence: bestConfidence,
    studentName: studentNames[bestStudentId],
  };
};

export const useFaceRecognition = (
  classId?: number,
  cameraPosition: CameraPosition = 'front',
) => {
  const [enrolledEmbeddings, setEnrolledEmbeddings] = useState<
    EnrolledEmbedding[]
  >([]);
  const [detectedStudents, setDetectedStudents] = useState<DetectedStudent[]>(
    [],
  );
  const [studentNames, setStudentNames] = useState<Record<number, string>>({});
  const lastLiveFaceRef = useRef<DetectedStudent | null>(null);
  const lastLiveFacesRef = useRef<DetectedStudent[]>([]);
  const lastLiveFacesTimestamp = useRef(0);
  const embedder = useFaceEmbedder();
  const faceDetectionOptions = useMemo(
    () => ({
      performanceMode: 'fast' as const,
      landmarkMode: 'none' as const,
      contourMode: 'none' as const,
      classificationMode: 'none' as const,
      minFaceSize: 0.15,
      trackingEnabled: true,
      cameraFacing: cameraPosition,
    }),
    [cameraPosition],
  );
  const { detectFaces, stopListeners } = useFaceDetector(faceDetectionOptions);

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

  const smoothedResultsRef = useRef<DetectedStudent[]>([]);

  const updateResults = useCallback((matches: DetectedStudent[]) => {
    const previousFaces = smoothedResultsRef.current;
    const usedPreviousIndexes = new Set<number>();

    const smoothedMatches = matches.map(match => {
      const previousIndex = findPreviousFace(
        match,
        previousFaces,
        usedPreviousIndexes,
      );

      if (previousIndex < 0) {
        return match;
      }

      usedPreviousIndexes.add(previousIndex);
      return smoothFaceBounds(previousFaces[previousIndex], match);
    });

    smoothedResultsRef.current = smoothedMatches;

    const bestLiveFace =
      smoothedMatches
        .slice()
        .sort(
          (a, b) =>
            b.quality - a.quality ||
            b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height,
        )[0] ?? null;

    lastLiveFaceRef.current = bestLiveFace;
    lastLiveFacesRef.current = smoothedMatches;
    lastLiveFacesTimestamp.current = Date.now();
    setDetectedStudents(smoothedMatches);
  }, []);

  const updateResultsOnJS = useMemo(
    () => Worklets.createRunOnJS(updateResults),
    [updateResults],
  );

  const isActive = useSharedValue(true);
  const frameCounter = useSharedValue(0);
  const bboxHistory = useSharedValue<
    Record<string, { x: number; y: number; w: number; h: number }[]>
  >({});

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      isActive.value = state === 'active';
    });
    return () => sub.remove();
  }, [isActive]);

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      frameCounter.value += 1;

      if (!isActive.value) {
        return;
      }

      if (frameCounter.value % 5 !== 0) {
        return;
      }

      console.log('[FaceRecognition] Processing frame:', frameCounter.value);

      // Tout le traitement est synchrone — pas de runAsync
      try {
        const faces = detectFaces(frame) ?? [];
        const results: DetectedStudent[] = [];
        const history = bboxHistory.value;
        const activeIds = new Set<string>();

        for (let i = 0; i < faces.length; i++) {
          const face = faces[i];
          if (face.bounds == null) {
            continue;
          }

          const faceId = String(face.trackingId ?? 'unknown');
          activeIds.add(faceId);

          if (!history[faceId]) {
            history[faceId] = [];
          }
          const h = history[faceId];
          h.push({
            x: face.bounds.x,
            y: face.bounds.y,
            w: face.bounds.width,
            h: face.bounds.height,
          });
          if (h.length > 3) {
            h.shift();
          }

          const avgX = h.reduce((s, b) => s + b.x, 0) / h.length;
          const avgY = h.reduce((s, b) => s + b.y, 0) / h.length;
          const avgW = h.reduce((s, b) => s + b.w, 0) / h.length;
          const avgH = h.reduce((s, b) => s + b.h, 0) / h.length;

          const quality = estimateFaceQuality(
            face.bounds,
            frame.width,
            frame.height,
            face.yawAngle,
            face.pitchAngle,
          );

          results.push({
            studentId: null,
            confidence: 0,
            quality,
            trackingId: face.trackingId,
            bounds: { x: avgX, y: avgY, width: avgW, height: avgH },
            frameWidth: frame.width,
            frameHeight: frame.height,
          });
        }

        // Nettoyage IDs disparus
        const keys = Object.keys(history);
        for (let i = 0; i < keys.length; i++) {
          if (!activeIds.has(keys[i])) {
            delete history[keys[i]];
          }
        }
        bboxHistory.value = history;

        updateResultsOnJS(results);
      } catch (e: any) {
        console.log('[FaceRecognition] Worklet crash:', e.message || e);
      }
    },
    [detectFaces, updateResultsOnJS, isActive, frameCounter, bboxHistory],
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

      const liveBoundsAge = Date.now() - lastLiveFacesTimestamp.current;
      const liveBoundsAreFresh = liveBoundsAge <= MAX_LIVE_BOUNDS_AGE_MS;
      const fallbackFaces: PhotoEmbeddingFallback[] =
        liveBoundsAreFresh && lastLiveFacesRef.current.length > 0
          ? lastLiveFacesRef.current.map(face => ({
            bounds: face.bounds,
            frameWidth: face.frameWidth,
            frameHeight: face.frameHeight,
          }))
          : liveBoundsAreFresh && lastLiveFaceRef.current
            ? [
              {
                bounds: lastLiveFaceRef.current.bounds,
                frameWidth: lastLiveFaceRef.current.frameWidth,
                frameHeight: lastLiveFaceRef.current.frameHeight,
              },
            ]
            : [];

      console.log('[ScanRecognition] Live face fallbacks:', {
        count: fallbackFaces.length,
        ageMs: liveBoundsAge,
        fresh: liveBoundsAreFresh,
        faces: fallbackFaces,
      });

      const { embeddings } = await extractFaceEmbeddingsFromPhoto(
        photoPath,
        embedder.model!,
        fallbackFaces,
      );

      console.log('[ScanRecognition] Faces extracted from photo:', embeddings.length);

      const sortedEmbeddings = embeddings.slice().sort((a, b) => {
        const areaA = a.bounds.width * a.bounds.height;
        const areaB = b.bounds.width * b.bounds.height;
        return areaB - areaA;
      });

      const usedStudentIds = new Set<number>();
      const matches = sortedEmbeddings.map((face, index) => {
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
