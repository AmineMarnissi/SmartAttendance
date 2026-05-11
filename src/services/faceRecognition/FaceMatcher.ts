import {cosineSimilarity} from '../../utils/cosineSimilarity';

export const MATCH_THRESHOLD = 0.4;

export interface EnrolledEmbedding {
  studentId: number;
  embedding: Float32Array;
}

export const FaceMatcher = {
  match: (
    liveEmbedding: Float32Array,
    enrolledEmbeddings: EnrolledEmbedding[],
  ): {studentId: number; confidence: number} | null => {
    let bestMatch = {studentId: -1, confidence: 0};

    for (const enrolled of enrolledEmbeddings) {
      const similarity = cosineSimilarity(liveEmbedding, enrolled.embedding);
      if (similarity > bestMatch.confidence) {
        bestMatch = {studentId: enrolled.studentId, confidence: similarity};
      }
    }

    return bestMatch.confidence >= MATCH_THRESHOLD ? bestMatch : null;
  },
};
