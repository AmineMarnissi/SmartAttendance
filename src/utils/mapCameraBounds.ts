export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreviewSize = {
  width: number;
  height: number;
};

export const mapCameraBoundsToPreview = (
  bounds: Bounds,
  frameSize: PreviewSize | null | undefined,
  previewSize: PreviewSize,
): Bounds => {
  if (!frameSize || frameSize.width <= 0 || frameSize.height <= 0) {
    return bounds;
  }

  const scale = Math.max(
    previewSize.width / frameSize.width,
    previewSize.height / frameSize.height,
  );
  const renderedWidth = frameSize.width * scale;
  const renderedHeight = frameSize.height * scale;
  const offsetX = (renderedWidth - previewSize.width) / 2;
  const offsetY = (renderedHeight - previewSize.height) / 2;

  return {
    x: bounds.x * scale - offsetX,
    y: bounds.y * scale - offsetY,
    width: bounds.width * scale,
    height: bounds.height * scale,
  };
};

export const clampBoundsToPreview = (
  bounds: Bounds,
  previewSize: PreviewSize,
): Bounds => {
  const x = Math.max(0, Math.min(bounds.x, previewSize.width));
  const y = Math.max(0, Math.min(bounds.y, previewSize.height));
  const width = Math.max(0, Math.min(bounds.width, previewSize.width - x));
  const height = Math.max(0, Math.min(bounds.height, previewSize.height - y));

  return {x, y, width, height};
};

export const mirrorPreviewBounds = (
  bounds: Bounds,
  previewSize: PreviewSize,
): Bounds => ({
  ...bounds,
  x: Math.max(0, previewSize.width - bounds.x - bounds.width),
});
