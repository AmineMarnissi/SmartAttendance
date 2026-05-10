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

  it('does not capture the full face embedder object inside the worklet', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const frameProcessorBody =
      source.match(
        /const frameProcessor = useFrameProcessor\([\s\S]*?\n\s{2}\);/,
      )?.[0] ?? '';

    expect(source).toContain('const boxedModel = embedder.boxedModel;');
    expect(frameProcessorBody).toContain('const tflite = boxedModel?.unbox();');
    expect(frameProcessorBody).not.toContain('embedder.boxedModel');
    expect(frameProcessorBody).toContain(
      '[boxedModel, detectFaces, resize, updateLiveFaceOnJS]',
    );
  });
});
