import {useEffect} from 'react';
import {create} from 'zustand';
import {loadTensorflowModel, type TfliteModel} from 'react-native-fast-tflite';
import {NitroModules} from 'react-native-nitro-modules';
import {resolveFaceEmbeddingModelSource} from './faceEmbeddingModelSource';

export const FACE_EMBEDDING_MODEL = require('../../assets/models/mobilefacenet.tflite');
export const FACE_EMBEDDING_INPUT_SIZE = 112;
export const FACE_EMBEDDING_CAPTURE_TARGETS = 3;


type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const FACE_CROP_WIDTH_SCALE = 0.82;
const FACE_CROP_HEIGHT_SCALE = 0.92;
const FACE_CROP_PADDING_SCALE = 1.08;
const FACE_CROP_CENTER_Y = 0.46;

type FaceEmbedderStore = {
  state: 'idle' | 'loading' | 'loaded' | 'error';
  model: TfliteModel | undefined;
  boxedModel: ReturnType<typeof NitroModules.box> | undefined;
  errorMessage: string | null;
  load: () => Promise<void>;
};

// Singleton Zustand store — le modèle n'est chargé qu'une seule fois

const useFaceEmbedderStore = create<FaceEmbedderStore>((set, get) => ({
  state: 'idle',
  model: undefined,
  boxedModel: undefined,
  errorMessage: null,
  load: async () => {
    const {state} = get();
    if (state === 'loading' || state === 'loaded') {
      return; // Déjà chargé ou en cours — ne rien faire
    }

    set({state: 'loading', errorMessage: null});
    try {
      const modelSource = await resolveFaceEmbeddingModelSource({
        bundledModel: FACE_EMBEDDING_MODEL,
      });
      const model = await loadTensorflowModel(modelSource, []);
      const boxedModel = NitroModules.box(model);
      set({state: 'loaded', model, boxedModel, errorMessage: null});
      console.log('[FaceEmbedder] Model loaded (singleton)');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[FaceEmbedder] Failed to load model:', message);
      set({state: 'error', model: undefined, boxedModel: undefined, errorMessage: message});
    }
  },
}));

export const useFaceEmbedder = () => {
  const store = useFaceEmbedderStore();

  useEffect(() => {
    store.load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state: store.state,
    model: store.model,
    boxedModel: store.boxedModel,
    errorMessage: store.errorMessage,
  };
};

export const buildFaceCrop = (
  bounds: FaceBounds | null | undefined,
  frameWidth: number,
  frameHeight: number,
) => {
  'worklet';

  if (bounds == null) {
    return {
      x: 0,
      y: 0,
      width: frameWidth,
      height: frameHeight,
    };
  }

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height * FACE_CROP_CENTER_Y;
  const tightWidth = bounds.width * FACE_CROP_WIDTH_SCALE;
  const tightHeight = bounds.height * FACE_CROP_HEIGHT_SCALE;
  const size = Math.max(tightWidth, tightHeight) * FACE_CROP_PADDING_SCALE;

  let x = centerX - size / 2;
  let y = centerY - size / 2;

  if (x < 0) {
    x = 0;
  }
  if (y < 0) {
    y = 0;
  }
  if (x + size > frameWidth) {
    x = Math.max(0, frameWidth - size);
  }
  if (y + size > frameHeight) {
    y = Math.max(0, frameHeight - size);
  }

  return {
    x,
    y,
    width: Math.min(size, frameWidth),
    height: Math.min(size, frameHeight),
  };
};

export const createEmbeddingInput = (resizedFace: Float32Array) => {
  'worklet';

  const normalized = new Float32Array(resizedFace.length);
  for (let i = 0; i < resizedFace.length; i += 1) {
    normalized[i] = (resizedFace[i] - 0.5) * 2;
  }
  return normalized;
};

export const getExactArrayBuffer = (data: Uint8Array | Float32Array) => {
  'worklet';
  if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
    return data.buffer;
  }
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  return buffer;
};

export const l2NormalizeEmbedding = (embedding: Float32Array) => {
  'worklet';

  let norm = 0;
  for (let i = 0; i < embedding.length; i += 1) {
    norm += embedding[i] * embedding[i];
  }

  norm = Math.sqrt(norm);
  if (norm === 0) {
    return embedding;
  }

  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i += 1) {
    normalized[i] = embedding[i] / norm;
  }

  return normalized;
};

export const estimateFaceQuality = (
  bounds: FaceBounds | null | undefined,
  frameWidth: number,
  frameHeight: number,
  yawAngle = 0,
  pitchAngle = 0,
) => {
  'worklet';

  if (bounds == null || frameWidth <= 0 || frameHeight <= 0) {
    return 0;
  }

  const faceArea = bounds.width * bounds.height;
  const frameArea = Math.max(1, frameWidth * frameHeight);
  const areaScore = Math.min(1, faceArea / (frameArea * 0.14));
  const posePenalty = Math.min(
    1,
    (Math.abs(yawAngle) + Math.abs(pitchAngle)) / 80,
  );

  return Math.max(0, Math.min(1, areaScore * (1 - posePenalty)));
};
