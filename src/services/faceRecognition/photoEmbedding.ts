import RNFS from 'react-native-fs';
import {AlphaType, ColorType, Skia} from '@shopify/react-native-skia';
import {detectFaces as detectFacesInImage} from 'react-native-vision-camera-face-detector';
import type {TfliteModel} from 'react-native-fast-tflite';
import {
  buildFaceCrop,
  createEmbeddingInput,
  estimateFaceQuality,
  FACE_EMBEDDING_INPUT_SIZE,
  getExactArrayBuffer,
  l2NormalizeEmbedding,
} from './FaceEmbedder';

type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PhotoEmbeddingFallback = {
  bounds: FaceBounds;
  frameWidth?: number;
  frameHeight?: number;
};

export type PhotoFaceEmbedding = {
  bounds: FaceBounds;
  confidence: number;
  embedding: Float32Array;
  frameWidth: number;
  frameHeight: number;
  quality: number;
};

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const decodePhoto = async (photoPath: string) => {
  const base64 = await RNFS.readFile(photoPath, 'base64');
  const image = Skia.Image.MakeImageFromEncoded(
    Skia.Data.fromBytes(base64ToBytes(base64)),
  );

  if (image == null) {
    throw new Error('Failed to decode captured photo.');
  }

  return {base64, image};
};

const isValidFaceBounds = (
  bounds: FaceBounds | null | undefined,
): bounds is FaceBounds =>
  bounds != null &&
  Number.isFinite(bounds.x) &&
  Number.isFinite(bounds.y) &&
  Number.isFinite(bounds.width) &&
  Number.isFinite(bounds.height) &&
  bounds.width > 0 &&
  bounds.height > 0;

const clampBounds = (
  bounds: FaceBounds | null | undefined,
  imageWidth: number,
  imageHeight: number,
): FaceBounds | null => {
  if (!isValidFaceBounds(bounds)) {
    return null;
  }

  const x = Math.max(0, Math.min(bounds.x, imageWidth - 1));
  const y = Math.max(0, Math.min(bounds.y, imageHeight - 1));
  const width = Math.max(0, Math.min(bounds.width, imageWidth - x));
  const height = Math.max(0, Math.min(bounds.height, imageHeight - y));

  if (width < 4 || height < 4) {
    return null;
  }

  return {x, y, width, height};
};

const projectFallbackBounds = (
  fallback: FaceBounds | PhotoEmbeddingFallback,
  imageWidth: number,
  imageHeight: number,
): FaceBounds | null => {
  const bounds = 'bounds' in fallback ? fallback.bounds : fallback;
  const frameWidth = 'bounds' in fallback ? fallback.frameWidth : undefined;
  const frameHeight = 'bounds' in fallback ? fallback.frameHeight : undefined;

  if (
    !isValidFaceBounds(bounds) ||
    frameWidth == null ||
    frameHeight == null ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return clampBounds(bounds, imageWidth, imageHeight);
  }

  const imageAspect = imageWidth / imageHeight;
  const frameAspect = frameWidth / frameHeight;
  const directMismatch = Math.abs(imageAspect - frameAspect);
  const rotatedMismatch = Math.abs(imageAspect - 1 / frameAspect);
  const isRotated = rotatedMismatch + 0.05 < directMismatch;

  const projected = isRotated
    ? {
        x: bounds.y * (imageWidth / frameHeight),
        y: bounds.x * (imageHeight / frameWidth),
        width: bounds.height * (imageWidth / frameHeight),
        height: bounds.width * (imageHeight / frameWidth),
      }
    : {
        x: bounds.x * (imageWidth / frameWidth),
        y: bounds.y * (imageHeight / frameHeight),
        width: bounds.width * (imageWidth / frameWidth),
        height: bounds.height * (imageHeight / frameHeight),
      };

  console.log('[PhotoEmbedding] Projected live fallback bounds:', {
    liveFrame: `${frameWidth}x${frameHeight}`,
    image: `${imageWidth}x${imageHeight}`,
    rotated: isRotated,
    original: bounds,
    projected,
  });

  return clampBounds(projected, imageWidth, imageHeight);
};

const createCenteredFallbackBounds = (
  imageWidth: number,
  imageHeight: number,
): FaceBounds => {
  const width = imageWidth * 0.5;
  const height = imageHeight * 0.45;
  return {
    x: (imageWidth - width) / 2,
    y: imageHeight * 0.23,
    width,
    height,
  };
};

const createEmbeddingFromCrop = (
  model: TfliteModel,
  image: NonNullable<ReturnType<typeof Skia.Image.MakeImageFromEncoded>>,
  bounds: FaceBounds,
) => {
  if (!isValidFaceBounds(bounds)) {
    throw new Error('Invalid face bounds in captured photo.');
  }

  const crop = buildFaceCrop(bounds, image.width(), image.height());
  const surface = Skia.Surface.MakeOffscreen(
    FACE_EMBEDDING_INPUT_SIZE,
    FACE_EMBEDDING_INPUT_SIZE,
  );

  if (surface == null) {
    throw new Error('Failed to create image processing surface.');
  }

  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(crop.x, crop.y, crop.width, crop.height),
    Skia.XYWHRect(
      0,
      0,
      FACE_EMBEDDING_INPUT_SIZE,
      FACE_EMBEDDING_INPUT_SIZE,
    ),
    paint,
    false,
  );
  surface.flush();

  const resizedImage = surface.makeImageSnapshot();
  const pixels = resizedImage.readPixels(0, 0, {
    alphaType: AlphaType.Unpremul,
    colorType: ColorType.RGBA_8888,
    width: FACE_EMBEDDING_INPUT_SIZE,
    height: FACE_EMBEDDING_INPUT_SIZE,
  });

  if (pixels == null) {
    throw new Error('Failed to read resized face pixels.');
  }

  const rgba = pixels as Uint8Array;
  const rgb = new Float32Array(
    FACE_EMBEDDING_INPUT_SIZE * FACE_EMBEDDING_INPUT_SIZE * 3,
  );
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i] / 255;
    rgb[j + 1] = rgba[i + 1] / 255;
    rgb[j + 2] = rgba[i + 2] / 255;
  }

  const input = createEmbeddingInput(rgb);
  const output = model.runSync([getExactArrayBuffer(input)]);
  return l2NormalizeEmbedding(new Float32Array(output[0]));
};

export const extractFaceEmbeddingsFromPhoto = async (
  photoPath: string,
  model: TfliteModel,
  fallbackBounds?:
    | FaceBounds
    | PhotoEmbeddingFallback
    | Array<FaceBounds | PhotoEmbeddingFallback>
    | null,
) => {
  console.log('[PhotoEmbedding] Reading captured photo:', photoPath);
  const {base64, image} = await decodePhoto(photoPath);
  const faces = await detectFacesInImage({
    image: `file://${photoPath}`,
    options: {
      performanceMode: 'accurate',
      landmarkMode: 'none',
      contourMode: 'none',
      classificationMode: 'none',
      minFaceSize: 0.08,
    },
  });

  console.log(
    '[PhotoEmbedding] Static detector found faces:',
    faces.length,
    'image:',
    `${image.width()}x${image.height()}`,
  );

  const fallbackFaceBounds = (
    Array.isArray(fallbackBounds)
      ? fallbackBounds
      : fallbackBounds
      ? [fallbackBounds]
      : []
  )
    .map(bounds => projectFallbackBounds(bounds, image.width(), image.height()))
    .filter(isValidFaceBounds);
  const detectedBounds = faces
    .map(face => face.bounds)
    .filter(isValidFaceBounds)
    .sort((a, b) => b.width * b.height - a.width * a.height);
  const boundsList =
    fallbackFaceBounds.length > detectedBounds.length
      ? fallbackFaceBounds
      : detectedBounds.length > 0
      ? detectedBounds
      : [createCenteredFallbackBounds(image.width(), image.height())];

  if (fallbackFaceBounds.length > detectedBounds.length) {
    console.warn(
      '[PhotoEmbedding] Static detector found fewer valid face bounds than live; using live face fallbacks.',
      {
        staticFaces: detectedBounds.length,
        liveFallbacks: fallbackFaceBounds.length,
      },
    );
  }

  if (detectedBounds.length === 0 && fallbackFaceBounds.length === 0) {
    console.warn(
      '[PhotoEmbedding] No static face and no live fallback; using centered guide fallback.',
    );
  }

  if (boundsList.length === 0) {
    throw new Error('No face found in captured photo.');
  }

  const embeddings = boundsList.map(bounds => {
    const quality = estimateFaceQuality(
      bounds,
      image.width(),
      image.height(),
      0,
      0,
    );

    return {
      bounds,
      confidence: 0,
      embedding: createEmbeddingFromCrop(model, image, bounds),
      frameWidth: image.width(),
      frameHeight: image.height(),
      quality,
    };
  });

  console.log('[PhotoEmbedding] Extracted embeddings:', embeddings.length);
  return {base64, embeddings};
};
