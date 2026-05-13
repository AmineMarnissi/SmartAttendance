import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import type {ModelSource} from 'react-native-fast-tflite';

export const ANDROID_FACE_EMBEDDING_RESOURCE =
  'src_assets_models_mobilefacenet.tflite';
export const FACE_EMBEDDING_CACHE_FILE = 'mobilefacenet.tflite';

type FaceEmbeddingModelFileSystem = {
  CachesDirectoryPath: string;
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
  platformOS = Platform.OS,
  bundledModel,
  fs = RNFS,
}: ResolveFaceEmbeddingModelSourceOptions): Promise<ModelSource> => {
  if (platformOS === 'android') {
    const cachedModelPath = getFaceEmbeddingCachePath(fs.CachesDirectoryPath);

    await fs.copyFileRes(ANDROID_FACE_EMBEDDING_RESOURCE, cachedModelPath);

    return {url: toFileUrl(cachedModelPath)};
  }

  return bundledModel;
};
