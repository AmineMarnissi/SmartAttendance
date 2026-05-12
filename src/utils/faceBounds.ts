export type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

export const mapFaceBoundsToView = (
  bounds: FaceBounds | null | undefined,
  frameSize: Size,
  viewSize: Size,
  mirror = false,
) => {
  'worklet';

  if (
    bounds == null ||
    frameSize.width <= 0 ||
    frameSize.height <= 0 ||
    viewSize.width <= 0 ||
    viewSize.height <= 0
  ) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
  }

  const scale = Math.max(
    viewSize.width / frameSize.width,
    viewSize.height / frameSize.height,
  );
  const scaledFrameWidth = frameSize.width * scale;
  const scaledFrameHeight = frameSize.height * scale;
  const offsetX = (viewSize.width - scaledFrameWidth) / 2;
  const offsetY = (viewSize.height - scaledFrameHeight) / 2;
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  const left = mirror
    ? viewSize.width - ((bounds.x + bounds.width) * scale + offsetX)
    : bounds.x * scale + offsetX;
  const top = bounds.y * scale + offsetY;

  return {
    left,
    top,
    width,
    height,
  };
};

export const isFaceCentered = (
  bounds: FaceBounds | null | undefined,
  frameSize: Size,
  maxOffsetXRatio = 0.18,
  maxOffsetYRatio = 0.2,
) => {
  'worklet';

  if (bounds == null || frameSize.width <= 0 || frameSize.height <= 0) {
    return false;
  }

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const offsetX = Math.abs(centerX - frameSize.width / 2) / frameSize.width;
  const offsetY = Math.abs(centerY - frameSize.height / 2) / frameSize.height;

  return offsetX <= maxOffsetXRatio && offsetY <= maxOffsetYRatio;
};
