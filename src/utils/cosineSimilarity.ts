export const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
  if (a.length !== b.length || a.length === 0) {
    console.warn('[cosineSimilarity] Invalid embedding lengths:', {
      a: a.length,
      b: b.length,
    });
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dot / denominator : 0;
};
