import type { RawImage } from "../isp/types";

export function createSyntheticBayerSample(width = 128, height = 96): RawImage {
  const data = new Uint16Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const normalizedX = x / Math.max(1, width - 1);
      const normalizedY = y / Math.max(1, height - 1);
      const diagonal = (normalizedX + normalizedY) * 0.5;
      const vignette = 1 - Math.hypot(normalizedX - 0.5, normalizedY - 0.5) * 0.55;
      const stripe = Math.sin((x / width) * Math.PI * 8) * 0.07;
      const value = 180 + (diagonal + stripe) * 2800 * vignette;

      data[y * width + x] = Math.max(0, Math.min(4095, Math.round(value)));
    }
  }

  return {
    width,
    height,
    bitDepth: 12,
    pattern: "RGGB",
    data,
  };
}
