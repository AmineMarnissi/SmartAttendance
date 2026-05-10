import {
  ANDROID_FACE_EMBEDDING_RESOURCE,
  FACE_EMBEDDING_CACHE_FILE,
  resolveFaceEmbeddingModelSource,
  toFileUrl,
} from '../src/services/faceRecognition/faceEmbeddingModelSource';

describe('face embedding model source', () => {
  it('copies the Android raw resource into cache and returns a file URL', async () => {
    const fs = {
      CachesDirectoryPath: '/data/user/0/com.smartattendance/cache/',
      exists: jest.fn().mockResolvedValue(false),
      copyFileRes: jest.fn().mockResolvedValue(undefined),
    };

    const source = await resolveFaceEmbeddingModelSource({
      platformOS: 'android',
      bundledModel: 42,
      fs,
    });

    const expectedPath =
      '/data/user/0/com.smartattendance/cache/mobilefacenet.tflite';
    expect(fs.exists).toHaveBeenCalledWith(expectedPath);
    expect(fs.copyFileRes).toHaveBeenCalledWith(
      ANDROID_FACE_EMBEDDING_RESOURCE,
      expectedPath,
    );
    expect(source).toEqual({url: `file://${expectedPath}`});
  });

  it('reuses the cached Android model file when it already exists', async () => {
    const fs = {
      CachesDirectoryPath: '/cache',
      exists: jest.fn().mockResolvedValue(true),
      copyFileRes: jest.fn(),
    };

    await resolveFaceEmbeddingModelSource({
      platformOS: 'android',
      bundledModel: 42,
      fs,
    });

    expect(fs.copyFileRes).not.toHaveBeenCalled();
  });

  it('uses the bundled model require result outside Android', async () => {
    await expect(
      resolveFaceEmbeddingModelSource({
        platformOS: 'ios',
        bundledModel: 42,
      }),
    ).resolves.toBe(42);
  });

  it('normalizes cache paths and file URLs', () => {
    expect(FACE_EMBEDDING_CACHE_FILE).toBe('mobilefacenet.tflite');
    expect(toFileUrl('/cache/mobilefacenet.tflite')).toBe(
      'file:///cache/mobilefacenet.tflite',
    );
    expect(toFileUrl('file:///cache/mobilefacenet.tflite')).toBe(
      'file:///cache/mobilefacenet.tflite',
    );
  });
});
