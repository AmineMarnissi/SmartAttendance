import fs from 'fs';
import path from 'path';

describe('FaceCaptureScreen frame processor safety', () => {
  const sourcePath = path.join(
    __dirname,
    '..',
    'src',
    'screens',
    'enrollment',
    'FaceCaptureScreen.tsx',
  );

  it('uses the loaded TFLite model directly in the worklet without Nitro boxing', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const frameProcessorBody =
      source.match(
        /const frameProcessor = useFrameProcessor\([\s\S]*?\n\s{2}\);/,
      )?.[0] ?? '';

    expect(source).toContain(
      "const model = embedder.state === 'loaded' ? embedder.model : undefined;",
    );
    expect(source).not.toContain('react-native-nitro-modules');
    expect(source).not.toContain('boxedModel');
    expect(frameProcessorBody).toContain('const tflite = model;');
    expect(frameProcessorBody).toContain(
      '[detectFaces, model, resize, updateLiveFaceOnJS]',
    );
  });
});
