import {cosineSimilarity} from '../src/utils/cosineSimilarity';
import {FaceMatcher} from '../src/services/faceRecognition/FaceMatcher';
import {
  decodeEmbeddingBlob,
  decodeNormalizedEmbeddingBlob,
  encodeEmbeddingBlob,
  normalizeEmbedding,
} from '../src/services/faceRecognition/embeddingCodec';

describe('Face matching regression coverage', () => {
  it('round-trips stored Float32 embeddings through SQLite-style Uint8Array blobs', () => {
    const original = normalizeEmbedding(new Float32Array([0.1, 0.2, 0.3, 0.4]));
    const blob = encodeEmbeddingBlob(original);
    const decoded = decodeEmbeddingBlob(blob);

    expect(Array.from(decoded)).toEqual(
      expect.arrayContaining(Array.from(original)),
    );
    expect(cosineSimilarity(original, decoded)).toBeCloseTo(1, 5);
  });

  it('decodes object-shaped byte blobs returned by native SQLite bridges', () => {
    const original = normalizeEmbedding(new Float32Array([0.7, 0.1, 0.2, 0.3]));
    const blob = encodeEmbeddingBlob(original);
    const objectBlob = Object.fromEntries(
      Array.from(blob).map((value, index) => [String(index), value]),
    );

    const decoded = decodeNormalizedEmbeddingBlob(objectBlob);

    expect(decoded.length).toBe(original.length);
    expect(cosineSimilarity(original, decoded)).toBeCloseTo(1, 5);
  });

  it('matches a live embedding against a saved decoded embedding', () => {
    const saved = normalizeEmbedding(new Float32Array([0.2, 0.4, 0.8, 0.1]));
    const storedBlob = encodeEmbeddingBlob(saved);
    const loaded = decodeNormalizedEmbeddingBlob(storedBlob);
    const live = normalizeEmbedding(new Float32Array([0.21, 0.39, 0.79, 0.11]));

    const result = FaceMatcher.matchWithDebug(live, [
      {studentId: 42, embedding: loaded},
    ]);

    expect(result.match?.studentId).toBe(42);
    expect(result.debug.bestConfidence).toBeGreaterThan(0.95);
  });

  it('returns no comparable embeddings for length mismatch instead of false matching', () => {
    const result = FaceMatcher.matchWithDebug(new Float32Array([1, 0]), [
      {studentId: 1, embedding: new Float32Array([1, 0, 0])},
    ]);

    expect(result.match).toBeNull();
    expect(result.debug.reason).toBe('no-comparable-embeddings');
  });
});
