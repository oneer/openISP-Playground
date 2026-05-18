import type {
  BayerPattern,
  PipelineConfig,
  PipelineResult,
  PipelineStageOutput,
  RawImage,
  RgbImage,
} from "./types";

type Channel = "r" | "g" | "b";

export function runPipeline(raw: RawImage, config: PipelineConfig): PipelineResult {
  const blackCorrected = config.blc.enabled
    ? applyBlackLevel(raw, config.blc.blackLevel)
    : raw.data.slice();

  const stages: PipelineStageOutput[] = [
    {
      id: "bayer",
      label: "Bayer Preview",
      domain: "bayer" as const,
      preview: bayerToGrayscalePreview(raw, blackCorrected),
    },
  ];

  const balanced = config.awb.enabled
    ? applyWhiteBalance(raw, blackCorrected, config.awb)
    : blackCorrected;
  const demosaiced = demosaicBilinear(raw, balanced);
  stages.push({
    id: "demosaic",
    label: "Demosaic",
    domain: "rgb" as const,
    preview: demosaiced,
  });

  const final = config.gamma.enabled ? applyGamma(demosaiced, config.gamma.gamma) : demosaiced;
  stages.push({
    id: "final",
    label: "Final RGB",
    domain: "rgb" as const,
    preview: final,
  });

  return { final, stages };
}

function applyBlackLevel(raw: RawImage, blackLevel: number): Uint16Array {
  const out = new Uint16Array(raw.data.length);
  for (let i = 0; i < raw.data.length; i += 1) {
    out[i] = Math.max(0, raw.data[i] - blackLevel);
  }
  return out;
}

function applyWhiteBalance(
  raw: RawImage,
  data: Uint16Array,
  gains: PipelineConfig["awb"],
): Uint16Array {
  const maxValue = (1 << raw.bitDepth) - 1;
  const out = new Uint16Array(data.length);

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const index = y * raw.width + x;
      const channel = getBayerChannel(x, y, raw.pattern);
      const gain = channel === "r" ? gains.rGain : channel === "b" ? gains.bGain : gains.gGain;
      out[index] = clamp16(data[index] * gain, maxValue);
    }
  }

  return out;
}

function demosaicBilinear(raw: RawImage, data: Uint16Array): RgbImage {
  const maxValue = (1 << raw.bitDepth) - 1;
  const out = new Uint8ClampedArray(raw.width * raw.height * 4);

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const channel = getBayerChannel(x, y, raw.pattern);
      const r = channel === "r" ? sample(data, raw, x, y) : averageChannel(data, raw, x, y, "r");
      const g = channel === "g" ? sample(data, raw, x, y) : averageChannel(data, raw, x, y, "g");
      const b = channel === "b" ? sample(data, raw, x, y) : averageChannel(data, raw, x, y, "b");
      const offset = (y * raw.width + x) * 4;

      out[offset] = toByte(r, maxValue);
      out[offset + 1] = toByte(g, maxValue);
      out[offset + 2] = toByte(b, maxValue);
      out[offset + 3] = 255;
    }
  }

  return {
    width: raw.width,
    height: raw.height,
    data: out,
  };
}

function applyGamma(image: RgbImage, gamma: number): RgbImage {
  const out = new Uint8ClampedArray(image.data.length);
  const exponent = 1 / gamma;

  for (let i = 0; i < image.data.length; i += 4) {
    out[i] = Math.round(Math.pow(image.data[i] / 255, exponent) * 255);
    out[i + 1] = Math.round(Math.pow(image.data[i + 1] / 255, exponent) * 255);
    out[i + 2] = Math.round(Math.pow(image.data[i + 2] / 255, exponent) * 255);
    out[i + 3] = image.data[i + 3];
  }

  return { ...image, data: out };
}

function bayerToGrayscalePreview(raw: RawImage, data: Uint16Array): RgbImage {
  const maxValue = (1 << raw.bitDepth) - 1;
  const out = new Uint8ClampedArray(raw.width * raw.height * 4);

  for (let i = 0; i < data.length; i += 1) {
    const value = toByte(data[i], maxValue);
    const offset = i * 4;
    out[offset] = value;
    out[offset + 1] = value;
    out[offset + 2] = value;
    out[offset + 3] = 255;
  }

  return {
    width: raw.width,
    height: raw.height,
    data: out,
  };
}

function averageChannel(
  data: Uint16Array,
  raw: RawImage,
  x: number,
  y: number,
  channel: Channel,
): number {
  let sum = 0;
  let count = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx >= 0 &&
        ny >= 0 &&
        nx < raw.width &&
        ny < raw.height &&
        getBayerChannel(nx, ny, raw.pattern) === channel
      ) {
        sum += sample(data, raw, nx, ny);
        count += 1;
      }
    }
  }

  return count > 0 ? sum / count : sample(data, raw, x, y);
}

function sample(data: Uint16Array, raw: RawImage, x: number, y: number): number {
  return data[y * raw.width + x];
}

function getBayerChannel(x: number, y: number, pattern: BayerPattern): Channel {
  const row = y % 2;
  const col = x % 2;

  if (pattern === "RGGB") {
    return row === 0 ? (col === 0 ? "r" : "g") : col === 0 ? "g" : "b";
  }
  if (pattern === "BGGR") {
    return row === 0 ? (col === 0 ? "b" : "g") : col === 0 ? "g" : "r";
  }
  if (pattern === "GRBG") {
    return row === 0 ? (col === 0 ? "g" : "r") : col === 0 ? "b" : "g";
  }
  return row === 0 ? (col === 0 ? "g" : "b") : col === 0 ? "r" : "g";
}

function toByte(value: number, maxValue: number): number {
  return Math.max(0, Math.min(255, Math.round((value / maxValue) * 255)));
}

function clamp16(value: number, maxValue: number): number {
  return Math.max(0, Math.min(maxValue, Math.round(value)));
}
