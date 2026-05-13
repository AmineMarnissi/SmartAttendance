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

export type ViewBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type BoundsCandidate = {
  name: string;
  bounds: FaceBounds;
  frameSize: Size;
};

const projectBounds = (
  bounds: FaceBounds,
  frameSize: Size,
  viewSize: Size,
  mirror: boolean,
): ViewBounds => {
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

const getVisibleArea = (
  rect: ReturnType<typeof projectBounds>,
  viewSize: Size,
) => {
  const visibleLeft = Math.max(0, rect.left);
  const visibleTop = Math.max(0, rect.top);
  const visibleRight = Math.min(viewSize.width, rect.left + rect.width);
  const visibleBottom = Math.min(viewSize.height, rect.top + rect.height);
  return (
    Math.max(0, visibleRight - visibleLeft) *
    Math.max(0, visibleBottom - visibleTop)
  );
};

const getCandidateScore = (
  rect: ReturnType<typeof projectBounds>,
  viewSize: Size,
) => {
  const visibleArea = getVisibleArea(rect, viewSize);
  const rectArea = Math.max(1, rect.width * rect.height);
  const visibleRatio = visibleArea / rectArea;
  const areaRatio = rectArea / Math.max(1, viewSize.width * viewSize.height);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const centerDistance =
    Math.abs(centerX - viewSize.width / 2) / viewSize.width +
    Math.abs(centerY - viewSize.height / 2) / viewSize.height;
  const idealAreaRatio = 0.16;
  const areaPenalty = Math.abs(areaRatio - idealAreaRatio) * 60000;

  return visibleRatio * 100000 - centerDistance * 10000 - areaPenalty;
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
    viewSize.width <= 10 ||
    viewSize.height <= 10
  ) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
  }

  const candidates: BoundsCandidate[] = [{name: 'direct', bounds, frameSize}];
  const boundsOverflowFrame =
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.x + bounds.width > frameSize.width ||
    bounds.y + bounds.height > frameSize.height;
  const frameIsLandscape = frameSize.width > frameSize.height;
  const viewIsPortrait = viewSize.height > viewSize.width;
  const frameIsPortrait = frameSize.height > frameSize.width;
  const viewIsLandscape = viewSize.width > viewSize.height;

  if (boundsOverflowFrame) {
    candidates.push({
      name: 'swapFrame',
      bounds,
      frameSize: {width: frameSize.height, height: frameSize.width},
    });
  }

  if ((frameIsLandscape && viewIsPortrait) || (frameIsPortrait && viewIsLandscape)) {
    candidates.push(
      {
        name: 'rotate90',
        bounds: {
          x: bounds.y,
          y: frameSize.width - (bounds.x + bounds.width),
          width: bounds.height,
          height: bounds.width,
        },
        frameSize: {width: frameSize.height, height: frameSize.width},
      },
      {
        name: 'rotate270',
        bounds: {
          x: frameSize.height - (bounds.y + bounds.height),
          y: bounds.x,
          width: bounds.height,
          height: bounds.width,
        },
        frameSize: {width: frameSize.height, height: frameSize.width},
      },
    );
  }

  const projected = candidates
    .map(candidate => {
      const rect = projectBounds(candidate.bounds, candidate.frameSize, viewSize, mirror);
      let score = getCandidateScore(rect, viewSize);
      
      // Bonus for direct candidate to prevent jittery flipping
      if (candidate.name === 'direct') {
        score += 5000;
      }
      
      return {rect, score};
    })
    .sort((a, b) => b.score - a.score)[0].rect;

  return {
    left: projected.left,
    top: projected.top,
    width: projected.width,
    height: projected.height,
  };
};

export const adjustFaceOverlayBounds = (
  bounds: ViewBounds,
  viewSize: Size,
): ViewBounds => {
  // Use more natural scales to align better with the actual face.
  // Previous values (0.46, 0.54) were too small, making the bbox look misaligned.
  const widthScale = 0.85;
  const heightScale = 0.85;
  const verticalBias = 0.04;
  const nextWidth = bounds.width * widthScale;
  const nextHeight = bounds.height * heightScale;
  const nextLeft = bounds.left + (bounds.width - nextWidth) / 2;
  const nextTop =
    bounds.top + (bounds.height - nextHeight) / 2 - bounds.height * verticalBias;

  return {
    left: Math.max(0, Math.min(nextLeft, viewSize.width - nextWidth)),
    top: Math.max(0, Math.min(nextTop, viewSize.height - nextHeight)),
    width: nextWidth,
    height: nextHeight,
  };
};

export const getFaceBoundsProjectionDebug = (
  bounds: FaceBounds | null | undefined,
  frameSize: Size,
  viewSize: Size,
  mirror = false,
) => {
  if (
    bounds == null ||
    frameSize.width <= 0 ||
    frameSize.height <= 0 ||
    viewSize.width <= 10 ||
    viewSize.height <= 10
  ) {
    return [];
  }

  const candidates: BoundsCandidate[] = [{name: 'direct', bounds, frameSize}];
  const boundsOverflowFrame =
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.x + bounds.width > frameSize.width ||
    bounds.y + bounds.height > frameSize.height;
  const frameIsLandscape = frameSize.width > frameSize.height;
  const viewIsPortrait = viewSize.height > viewSize.width;
  const frameIsPortrait = frameSize.height > frameSize.width;
  const viewIsLandscape = viewSize.width > viewSize.height;

  if (boundsOverflowFrame) {
    candidates.push({
      name: 'swapFrame',
      bounds,
      frameSize: {width: frameSize.height, height: frameSize.width},
    });
  }

  if (
    (frameIsLandscape && viewIsPortrait) ||
    (frameIsPortrait && viewIsLandscape)
  ) {
    candidates.push(
      {
        name: 'rotate90',
        bounds: {
          x: bounds.y,
          y: frameSize.width - (bounds.x + bounds.width),
          width: bounds.height,
          height: bounds.width,
        },
        frameSize: {width: frameSize.height, height: frameSize.width},
      },
      {
        name: 'rotate270',
        bounds: {
          x: frameSize.height - (bounds.y + bounds.height),
          y: bounds.x,
          width: bounds.height,
          height: bounds.width,
        },
        frameSize: {width: frameSize.height, height: frameSize.width},
      },
    );
  }

  return candidates
    .map(candidate => {
      const rect = projectBounds(
        candidate.bounds,
        candidate.frameSize,
        viewSize,
        mirror,
      );

      return {
        name: candidate.name,
        candidateBounds: candidate.bounds,
        candidateFrameSize: candidate.frameSize,
        rect,
        visibleArea: getVisibleArea(rect, viewSize),
        score: getCandidateScore(rect, viewSize),
      };
    })
    .sort((a, b) => b.score - a.score);
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
