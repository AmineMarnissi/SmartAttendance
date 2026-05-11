import {cosineSimilarity} from '../../utils/cosineSimilarity';

export const MATCH_THRESHOLD = 0.85;

export interface EnrolledEmbedding {
  studentId: number;
  embedding: Float32Array;
}

export interface MatchDebugInfo {
  bestStudentId: number | null;
  bestConfidence: number;
  threshold: number;
  liveLength: number;
  enrolledCount: number;
  reason?: string;
}

export interface FaceMatchResult {
  studentId: number;
  confidence: number;
}

const isUsableEmbedding = (embedding: Float32Array): boolean =>
  embedding.length > 0 && embedding.every(value => Number.isFinite(value));

export const FaceMatcher = {
  matchWithDebug: (
    liveEmbedding: Float32Array,
    enrolledEmbeddings: EnrolledEmbedding[],
  ): {match: FaceMatchResult | null; debug: MatchDebugInfo} => {
    if (!isUsableEmbedding(liveEmbedding)) {
      return {
        match: null,
        debug: {
          bestStudentId: null,
          bestConfidence: 0,
          threshold: MATCH_THRESHOLD,
          liveLength: liveEmbedding.length,
          enrolledCount: enrolledEmbeddings.length,
          reason: 'invalid-live-embedding',
        },
      };
    }

    let bestStudentId: number | null = null;
    let bestConfidence = 0;
    let comparableCount = 0;

    for (const enrolled of enrolledEmbeddings) {
      if (
        !isUsableEmbedding(enrolled.embedding) ||
        enrolled.embedding.length !== liveEmbedding.length
      ) {
        continue;
      }

      comparableCount += 1;
      const similarity = cosineSimilarity(liveEmbedding, enrolled.embedding);
      if (similarity > bestConfidence) {
        bestConfidence = similarity;
        bestStudentId = enrolled.studentId;
      }
    }

    const debug: MatchDebugInfo = {
      bestStudentId,
      bestConfidence,
      threshold: MATCH_THRESHOLD,
      liveLength: liveEmbedding.length,
      enrolledCount: enrolledEmbeddings.length,
      reason: comparableCount === 0 ? 'no-comparable-embeddings' : undefined,
    };

    if (bestStudentId == null || bestConfidence < MATCH_THRESHOLD) {
      return {match: null, debug};
    }

    return {
      match: {studentId: bestStudentId, confidence: bestConfidence},
      debug,
    };
  },

  match: (
    liveEmbedding: Float32Array,
    enrolledEmbeddings: EnrolledEmbedding[],
  ): FaceMatchResult | null =>
    FaceMatcher.matchWithDebug(liveEmbedding, enrolledEmbeddings).match,
};
