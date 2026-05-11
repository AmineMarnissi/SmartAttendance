export type EmbeddingBlob =
  | Float32Array
  | Uint8Array
  | ArrayBuffer
  | number[]
  | Record<string, unknown>
  | null
  | undefined;

export const EMBEDDING_FLOAT_SIZE = 4;

const copyArrayBuffer = (buffer: ArrayBuffer): ArrayBuffer =>
  buffer.slice(0, buffer.byteLength);

const exactBytesFromView = (view: ArrayBufferView): Uint8Array =>
  new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

const isByteArray = (values: number[]): boolean =>
  values.length > 0 &&
  values.every(value => Number.isInteger(value) && value >= 0 && value <= 255);

const numericObjectValues = (value: Record<string, unknown>): number[] =>
  Object.keys(value)
    .filter(key => /^\d+$/.test(key))
    .sort((left, right) => Number(left) - Number(right))
    .map(key => value[key])
    .filter((item): item is number => typeof item === 'number');

export const encodeEmbeddingBlob = (embedding: Float32Array): Uint8Array =>
  new Uint8Array(
    embedding.buffer,
    embedding.byteOffset,
    embedding.byteLength,
  ).slice();

export const decodeEmbeddingBlob = (value: EmbeddingBlob): Float32Array => {
  if (value == null) {
    return new Float32Array();
  }

  if (value instanceof Float32Array) {
    return new Float32Array(value);
  }

  if (value instanceof ArrayBuffer) {
    if (value.byteLength % EMBEDDING_FLOAT_SIZE !== 0) {
      return new Float32Array();
    }
    return new Float32Array(copyArrayBuffer(value));
  }

  if (ArrayBuffer.isView(value)) {
    if (value instanceof Float32Array) {
      return new Float32Array(value);
    }

    const bytes = exactBytesFromView(value);
    if (bytes.byteLength % EMBEDDING_FLOAT_SIZE !== 0) {
      return new Float32Array();
    }
    return new Float32Array(
      encodeEmbeddingBlob(
        new Float32Array(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
        ),
      ).buffer,
    );
  }

  if (Array.isArray(value)) {
    if (!isByteArray(value)) {
      return new Float32Array(value);
    }

    const bytes = new Uint8Array(value);
    if (bytes.byteLength % EMBEDDING_FLOAT_SIZE !== 0) {
      return new Float32Array();
    }
    return new Float32Array(bytes.buffer.slice(0));
  }

  if (typeof value === 'object') {
    const maybeBuffer = (value as {buffer?: unknown}).buffer;
    if (maybeBuffer instanceof ArrayBuffer) {
      return decodeEmbeddingBlob(maybeBuffer);
    }

    const maybeData = (value as {data?: unknown}).data;
    if (Array.isArray(maybeData)) {
      return decodeEmbeddingBlob(maybeData);
    }

    return decodeEmbeddingBlob(numericObjectValues(value));
  }

  return new Float32Array();
};

export const normalizeEmbedding = (embedding: Float32Array): Float32Array => {
  let norm = 0;
  for (let index = 0; index < embedding.length; index += 1) {
    norm += embedding[index] * embedding[index];
  }

  if (norm === 0) {
    return new Float32Array(embedding);
  }

  const normalized = new Float32Array(embedding.length);
  const denominator = Math.sqrt(norm);
  for (let index = 0; index < embedding.length; index += 1) {
    normalized[index] = embedding[index] / denominator;
  }

  return normalized;
};

export const decodeNormalizedEmbeddingBlob = (
  value: EmbeddingBlob,
): Float32Array => normalizeEmbedding(decodeEmbeddingBlob(value));
