import {Platform} from 'react-native';
import type {ModelSource} from 'react-native-fast-tflite';

export const ANDROID_FACE_EMBEDDING_RESOURCE = 'mobilefacenet.tflite';
export const FACE_EMBEDDING_CACHE_FILE = 'mobilefacenet.tflite';

type FaceEmbeddingModelFileSystem = {
  CachesDirectoryPath: string;
  exists: (filepath: string) => Promise<boolean>;
  copyFileRes: (filepath: string, destPath: string) => Promise<void>;
};

type ResolveFaceEmbeddingModelSourceOptions = {
  platformOS?: string;
  bundledModel: number;
  fs?: FaceEmbeddingModelFileSystem;
};

const trimTrailingPathSeparator = (path: string) => path.replace(/[\\/]+$/, '');

export const getFaceEmbeddingCachePath = (cacheDirectoryPath: string) =>
  `${trimTrailingPathSeparator(
    cacheDirectoryPath,
  )}/${FACE_EMBEDDING_CACHE_FILE}`;

export const toFileUrl = (path: string) =>
  path.startsWith('file://') ? path : `file://${path}`;

export const resolveFaceEmbeddingModelSource = async ({
  bundledModel,
}: ResolveFaceEmbeddingModelSourceOptions): Promise<ModelSource> => {
  if (Platform.OS === 'android') {
    return {url: `file:///android_asset/${ANDROID_FACE_EMBEDDING_RESOURCE}`};
  }
  return bundledModel;
};
