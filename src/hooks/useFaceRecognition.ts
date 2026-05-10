import {useState, useCallback, useEffect, useMemo} from 'react';
import {useFrameProcessor} from 'react-native-vision-camera';
import {useFaceDetector} from 'react-native-vision-camera-face-detector';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {useRunOnJS} from 'react-native-worklets-core';
import {
  EnrolledEmbedding,
  MATCH_THRESHOLD,
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

  return {studentId: bestStudentId, confidence: bestConfidence};
};

export const useFaceRecognition = (classId?: number) => {
  const [enrolledEmbeddings, setEnrolledEmbeddings] = useState<
    EnrolledEmbedding[]
  >([]);
  const [detectedStudents, setDetectedStudents] = useState<DetectedStudent[]>(
    [],
  );
  const [studentNames, setStudentNames] = useState<Record<number, string>>({});
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
    if (classId) {
      loadClassData(classId);
    } else {
      setEnrolledEmbeddings([]);
      setStudentNames({});
    }
  }, [classId]);

  const loadClassData = async (id: number) => {
    const [embeddings, students] = await Promise.all([
      embeddingStorage.getAllForClass(id),
      studentRepository.getForClass(id),
    ]);

    setEnrolledEmbeddings(embeddings);
    setStudentNames(
      students.reduce<Record<number, string>>((acc, student) => {
        acc[student.id] = `${student.first_name} ${student.last_name}`;
        return acc;
      }, {}),
    );
  };

  const updateResults = useCallback((matches: DetectedStudent[]) => {
    setDetectedStudents(matches);
  }, []);

  const updateResultsOnJS = useRunOnJS(updateResults, [updateResults]);
  const boxedModel = embedder.boxedModel;

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      const faces = detectFaces(frame);
      const results: DetectedStudent[] = [];
      const tflite = boxedModel?.unbox();

      for (const face of faces) {
        let match: {studentId: number; confidence: number} | null = null;

        if (tflite != null && enrolledEmbeddings.length > 0) {
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
          match = matchEmbeddingWorklet(liveEmbedding, enrolledEmbeddings);
        }

        results.push({
          studentId: match?.studentId ?? null,
          studentName:
            match?.studentId != null
              ? studentNames[match.studentId]
              : undefined,
          confidence: match?.confidence ?? 0,
          bounds: face.bounds,
        });
      }

      updateResultsOnJS(results);
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
