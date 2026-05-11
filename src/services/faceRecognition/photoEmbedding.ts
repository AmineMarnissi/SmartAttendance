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

const createEmbeddingFromCrop = (
  model: TfliteModel,
  image: NonNullable<ReturnType<typeof Skia.Image.MakeImageFromEncoded>>,
  bounds: FaceBounds,
) => {
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
  fallbackBounds?: FaceBounds | null,
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
      minFaceSize: 0.12,
    },
  });

  console.log(
    '[PhotoEmbedding] Static detector found faces:',
    faces.length,
    'image:',
    `${image.width()}x${image.height()}`,
  );

  const boundsList =
    faces.length > 0
      ? faces
          .map(face => face.bounds)
          .sort((a, b) => b.width * b.height - a.width * a.height)
      : fallbackBounds
      ? [fallbackBounds]
      : [];

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
