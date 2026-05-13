import {
  FACE_EMBEDDING_CACHE_FILE,
  resolveFaceEmbeddingModelSource,
  toFileUrl,
} from '../src/services/faceRecognition/faceEmbeddingModelSource';

describe('face embedding model source', () => {
  it('uses the bundled model require result on Android', async () => {
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

    expect(fs.exists).not.toHaveBeenCalled();
    expect(fs.copyFileRes).not.toHaveBeenCalled();
    expect(source).toBe(42);
  });

  it('does not require an Android cache copy', async () => {
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

    expect(fs.exists).not.toHaveBeenCalled();
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
