import type {
  BayerPattern,
  PipelineConfig,
  PipelineResult,
  PipelineStageOutput,
  RawImage,
  RgbImage,
} from "./types";

type Channel = "r" | "g" | "b";
type EdgeMap = Float32Array;

export function runPipeline(raw: RawImage, config: PipelineConfig): PipelineResult {
  const stages: PipelineStageOutput[] = [];

  let bayer = config.dpc.enabled ? applyDeadPixelCorrection(raw, raw.data, config.dpc.threshold) : raw.data.slice();
  pushBayerStage(stages, "dpc", "Dead Pixel Correction", raw, bayer);

  bayer = config.blc.enabled ? applyBlackLevel(raw, bayer, config.blc.blackLevel) : bayer.slice();
  pushBayerStage(stages, "blc", "Black Level Correction", raw, bayer);

  bayer = config.aaf.enabled ? applyAntiAliasingFilter(raw, bayer) : bayer.slice();
  pushBayerStage(stages, "aaf", "Anti-Aliasing Filter", raw, bayer);

  bayer = config.awb.enabled ? applyWhiteBalance(raw, bayer, config.awb) : bayer.slice();
  pushBayerStage(stages, "awb", "Auto White Balance", raw, bayer);

  bayer = config.bnf.enabled ? applyBilateralNoiseFilter(raw, bayer, config.bnf.strength) : bayer.slice();
  pushBayerStage(stages, "bnf", "Bilateral Noise Filter", raw, bayer);

  bayer = config.cnf.enabled
    ? applyChromaNoiseFilter(raw, bayer, config.cnf.threshold, config.cnf.strength)
    : bayer.slice();
  pushBayerStage(stages, "cnf", "Chroma Noise Filter", raw, bayer);

  let rgb = config.cfa.enabled ? demosaic(raw, bayer, config.cfa.mode) : bayerToGrayscalePreview(raw, bayer);
  pushRgbStage(stages, "cfa", "CFA Interpolation", rgb);

  rgb = config.ccm.enabled ? applyColorCorrection(rgb, config.ccm.matrix) : cloneRgb(rgb);
  pushRgbStage(stages, "ccm", "Color Correction Matrix", rgb);

  rgb = config.gac.enabled ? applyGamma(rgb, config.gac.gamma) : cloneRgb(rgb);
  pushRgbStage(stages, "gac", "Gamma Correction", rgb);

  rgb = config.csc.enabled ? applyColorSpaceConversion(rgb) : cloneRgb(rgb);
  pushRgbStage(stages, "csc", "Color Space Conversion", rgb);

  rgb = config.hsc.enabled ? applyHueSaturation(rgb, config.hsc.hue, config.hsc.saturation) : cloneRgb(rgb);
  pushRgbStage(stages, "hsc", "Hue Saturation Control", rgb);

  let edgeMap: EdgeMap | undefined;
  if (config.eeh.enabled) {
    const enhanced = applyEdgeEnhancement(rgb, config.eeh.strength, config.eeh.threshold);
    rgb = enhanced.image;
    edgeMap = enhanced.edgeMap;
  } else {
    edgeMap = computeEdgeMap(rgb);
    rgb = cloneRgb(rgb);
  }
  pushRgbStage(stages, "eeh", "Edge Enhancement", rgb);

  rgb = config.fcs.enabled ? applyFalseColorSuppression(rgb, edgeMap, config.fcs.strength, config.fcs.threshold) : cloneRgb(rgb);
  pushRgbStage(stages, "fcs", "False Color Suppression", rgb);

  rgb = config.bcc.enabled ? applyBrightnessContrast(rgb, config.bcc.brightness, config.bcc.contrast) : cloneRgb(rgb);
  pushRgbStage(stages, "bcc", "Brightness Contrast Control", rgb);

  rgb = config.nlm.enabled ? applyNonLocalMeansPreview(rgb, config.nlm.strength) : cloneRgb(rgb);
  pushRgbStage(stages, "nlm", "Non-Local Means Denoising", rgb);

  return { final: rgb, stages };
}

function pushBayerStage(
  stages: PipelineStageOutput[],
  id: string,
  label: string,
  raw: RawImage,
  data: Uint16Array,
) {
  stages.push({
    id,
    label,
    domain: "bayer",
    preview: bayerToGrayscalePreview(raw, data),
  });
}

function pushRgbStage(stages: PipelineStageOutput[], id: string, label: string, preview: RgbImage) {
  stages.push({
    id,
    label,
    domain: "rgb",
    preview,
  });
}

function applyDeadPixelCorrection(raw: RawImage, data: Uint16Array, threshold: number): Uint16Array {
  const out = data.slice();
  const maxValue = maxRawValue(raw);

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const center = sampleRaw(data, raw, x, y);
      const neighbors = [
        sampleRawReflect(data, raw, x - 2, y - 2),
        sampleRawReflect(data, raw, x, y - 2),
        sampleRawReflect(data, raw, x + 2, y - 2),
        sampleRawReflect(data, raw, x - 2, y),
        sampleRawReflect(data, raw, x + 2, y),
        sampleRawReflect(data, raw, x - 2, y + 2),
        sampleRawReflect(data, raw, x, y + 2),
        sampleRawReflect(data, raw, x + 2, y + 2),
      ];

      if (neighbors.every((value) => Math.abs(value - center) > threshold)) {
        const replacement = (neighbors[1] + neighbors[3] + neighbors[4] + neighbors[6]) / 4;
        out[y * raw.width + x] = clamp16(replacement, maxValue);
      }
    }
  }

  return out;
}

function applyBlackLevel(raw: RawImage, data: Uint16Array, blackLevel: number): Uint16Array {
  const out = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = Math.max(0, data[i] - blackLevel);
  }
  return out;
}

function applyAntiAliasingFilter(raw: RawImage, data: Uint16Array): Uint16Array {
  const out = new Uint16Array(data.length);
  const maxValue = maxRawValue(raw);
  const taps = [
    [-2, -2, 1],
    [0, -2, 1],
    [2, -2, 1],
    [-2, 0, 1],
    [0, 0, 8],
    [2, 0, 1],
    [-2, 2, 1],
    [0, 2, 1],
    [2, 2, 1],
  ] as const;

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      let sum = 0;
      for (const [dx, dy, weight] of taps) {
        sum += sampleRawReflect(data, raw, x + dx, y + dy) * weight;
      }
      out[y * raw.width + x] = clamp16(sum / 16, maxValue);
    }
  }

  return out;
}

function applyWhiteBalance(
  raw: RawImage,
  data: Uint16Array,
  gains: PipelineConfig["awb"],
): Uint16Array {
  const maxValue = maxRawValue(raw);
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

function applyBilateralNoiseFilter(raw: RawImage, data: Uint16Array, strength: number): Uint16Array {
  const out = new Uint16Array(data.length);
  const maxValue = maxRawValue(raw);
  const rangeSigma = Math.max(12, maxValue * (0.015 + strength * 0.04));

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const center = sampleRaw(data, raw, x, y);
      let weighted = center;
      let totalWeight = 1;

      for (let dy = -2; dy <= 2; dy += 2) {
        for (let dx = -2; dx <= 2; dx += 2) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const value = sampleRawReflect(data, raw, x + dx, y + dy);
          const diff = value - center;
          const rangeWeight = Math.exp(-(diff * diff) / (2 * rangeSigma * rangeSigma));
          const distanceWeight = Math.hypot(dx, dy) > 2 ? 0.55 : 0.8;
          const weight = rangeWeight * distanceWeight * strength;
          weighted += value * weight;
          totalWeight += weight;
        }
      }

      out[y * raw.width + x] = clamp16(weighted / totalWeight, maxValue);
    }
  }

  return out;
}

function applyChromaNoiseFilter(
  raw: RawImage,
  data: Uint16Array,
  threshold: number,
  strength: number,
): Uint16Array {
  const out = data.slice();
  const maxValue = maxRawValue(raw);

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const channel = getBayerChannel(x, y, raw.pattern);
      if (channel === "g") {
        continue;
      }

      const center = sampleRaw(data, raw, x, y);
      const greenAverage = averageBayerChannel(data, raw, x, y, "g", 2);
      if (center > greenAverage + threshold) {
        out[y * raw.width + x] = clamp16(lerp(center, greenAverage, strength), maxValue);
      }
    }
  }

  return out;
}

function demosaic(raw: RawImage, data: Uint16Array, mode: PipelineConfig["cfa"]["mode"]): RgbImage {
  return mode === "malvar" ? demosaicMalvar(raw, data) : demosaicBilinear(raw, data);
}

function demosaicBilinear(raw: RawImage, data: Uint16Array): RgbImage {
  const maxValue = maxRawValue(raw);
  const out = new Uint8ClampedArray(raw.width * raw.height * 4);

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const channel = getBayerChannel(x, y, raw.pattern);
      const r = channel === "r" ? sampleRaw(data, raw, x, y) : averageBayerChannel(data, raw, x, y, "r", 1);
      const g = channel === "g" ? sampleRaw(data, raw, x, y) : averageBayerChannel(data, raw, x, y, "g", 1);
      const b = channel === "b" ? sampleRaw(data, raw, x, y) : averageBayerChannel(data, raw, x, y, "b", 1);
      writeRgb(out, raw.width, x, y, toByte(r, maxValue), toByte(g, maxValue), toByte(b, maxValue));
    }
  }

  return {
    width: raw.width,
    height: raw.height,
    data: out,
  };
}

function demosaicMalvar(raw: RawImage, data: Uint16Array): RgbImage {
  const maxValue = maxRawValue(raw);
  const out = new Uint8ClampedArray(raw.width * raw.height * 4);

  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const center = sampleRaw(data, raw, x, y);
      const channel = getBayerChannel(x, y, raw.pattern);
      let r = center;
      let g = center;
      let b = center;

      if (channel === "r") {
        r = center;
        g = malvarGreenAtRedOrBlue(data, raw, x, y);
        b = malvarDiagonal(data, raw, x, y, "b");
      } else if (channel === "b") {
        r = malvarDiagonal(data, raw, x, y, "r");
        g = malvarGreenAtRedOrBlue(data, raw, x, y);
        b = center;
      } else {
        g = center;
        r = malvarAtGreen(data, raw, x, y, "r");
        b = malvarAtGreen(data, raw, x, y, "b");
      }

      writeRgb(out, raw.width, x, y, toByte(r, maxValue), toByte(g, maxValue), toByte(b, maxValue));
    }
  }

  return {
    width: raw.width,
    height: raw.height,
    data: out,
  };
}

function malvarGreenAtRedOrBlue(data: Uint16Array, raw: RawImage, x: number, y: number): number {
  return (
    4 * sampleRawReflect(data, raw, x, y) -
    sampleRawReflect(data, raw, x, y - 2) -
    sampleRawReflect(data, raw, x - 2, y) -
    sampleRawReflect(data, raw, x + 2, y) -
    sampleRawReflect(data, raw, x, y + 2) +
    2 *
      (sampleRawReflect(data, raw, x, y - 1) +
        sampleRawReflect(data, raw, x - 1, y) +
        sampleRawReflect(data, raw, x + 1, y) +
        sampleRawReflect(data, raw, x, y + 1))
  ) / 8;
}

function malvarDiagonal(data: Uint16Array, raw: RawImage, x: number, y: number, channel: Channel): number {
  const fallback = averageBayerChannel(data, raw, x, y, channel, 1);
  const value =
    (6 * sampleRawReflect(data, raw, x, y) -
      1.5 *
        (sampleRawReflect(data, raw, x, y - 2) +
          sampleRawReflect(data, raw, x - 2, y) +
          sampleRawReflect(data, raw, x + 2, y) +
          sampleRawReflect(data, raw, x, y + 2)) +
      2 *
        (sampleRawReflect(data, raw, x - 1, y - 1) +
          sampleRawReflect(data, raw, x + 1, y - 1) +
          sampleRawReflect(data, raw, x - 1, y + 1) +
          sampleRawReflect(data, raw, x + 1, y + 1))) /
    8;
  return Number.isFinite(value) ? value : fallback;
}

function malvarAtGreen(data: Uint16Array, raw: RawImage, x: number, y: number, channel: Channel): number {
  const horizontal = [sampleRawReflect(data, raw, x - 1, y), sampleRawReflect(data, raw, x + 1, y)];
  const vertical = [sampleRawReflect(data, raw, x, y - 1), sampleRawReflect(data, raw, x, y + 1)];
  const horizontalMatches = getBayerChannel(reflectIndex(x - 1, raw.width), y, raw.pattern) === channel;
  const pair = horizontalMatches ? horizontal : vertical;
  const correction =
    (sampleRawReflect(data, raw, x, y) * 4 -
      sampleRawReflect(data, raw, x - 2, y) -
      sampleRawReflect(data, raw, x + 2, y) -
      sampleRawReflect(data, raw, x, y - 2) -
      sampleRawReflect(data, raw, x, y + 2)) /
    8;
  return (pair[0] + pair[1]) / 2 + correction * 0.25;
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

function applyColorCorrection(image: RgbImage, matrix: PipelineConfig["ccm"]["matrix"]): RgbImage {
  const out = new Uint8ClampedArray(image.data.length);

  for (let i = 0; i < image.data.length; i += 4) {
    const r = image.data[i];
    const g = image.data[i + 1];
    const b = image.data[i + 2];

    out[i] = clampByte(r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2]);
    out[i + 1] = clampByte(r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2]);
    out[i + 2] = clampByte(r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2]);
    out[i + 3] = image.data[i + 3];
  }

  return { ...image, data: out };
}

function applyColorSpaceConversion(image: RgbImage): RgbImage {
  const out = new Uint8ClampedArray(image.data.length);

  for (let i = 0; i < image.data.length; i += 4) {
    const { y, u, v } = rgbToYuv(image.data[i], image.data[i + 1], image.data[i + 2]);
    const { r, g, b } = yuvToRgb(y, u, v);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = image.data[i + 3];
  }

  return { ...image, data: out };
}

function applyHueSaturation(image: RgbImage, hue: number, saturation: number): RgbImage {
  const out = new Uint8ClampedArray(image.data.length);
  const radians = (hue * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);

  for (let i = 0; i < image.data.length; i += 4) {
    const { y, u, v } = rgbToYuv(image.data[i], image.data[i + 1], image.data[i + 2]);
    const centeredU = (u - 128) * saturation;
    const centeredV = (v - 128) * saturation;
    const rotatedU = centeredU * cos + centeredV * sin + 128;
    const rotatedV = centeredV * cos - centeredU * sin + 128;
    const { r, g, b } = yuvToRgb(y, rotatedU, rotatedV);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = image.data[i + 3];
  }

  return { ...image, data: out };
}

function applyEdgeEnhancement(
  image: RgbImage,
  strength: number,
  threshold: number,
): { image: RgbImage; edgeMap: EdgeMap } {
  const edgeMap = computeEdgeMap(image);
  const out = new Uint8ClampedArray(image.data.length);

  for (let i = 0; i < image.data.length; i += 4) {
    const pixel = i / 4;
    const edge = edgeMap[pixel];
    const boost = Math.abs(edge) < threshold ? 0 : edge * strength;
    out[i] = clampByte(image.data[i] + boost);
    out[i + 1] = clampByte(image.data[i + 1] + boost);
    out[i + 2] = clampByte(image.data[i + 2] + boost);
    out[i + 3] = image.data[i + 3];
  }

  return { image: { ...image, data: out }, edgeMap };
}

function applyFalseColorSuppression(
  image: RgbImage,
  edgeMap: EdgeMap,
  strength: number,
  threshold: number,
): RgbImage {
  const out = new Uint8ClampedArray(image.data.length);

  for (let i = 0; i < image.data.length; i += 4) {
    const edge = Math.abs(edgeMap[i / 4]);
    const suppression = edge <= threshold ? 0 : Math.min(strength, (edge - threshold) / 255 + strength * 0.5);
    const { y, u, v } = rgbToYuv(image.data[i], image.data[i + 1], image.data[i + 2]);
    const { r, g, b } = yuvToRgb(y, lerp(u, 128, suppression), lerp(v, 128, suppression));
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = image.data[i + 3];
  }

  return { ...image, data: out };
}

function applyBrightnessContrast(image: RgbImage, brightness: number, contrast: number): RgbImage {
  const out = new Uint8ClampedArray(image.data.length);
  const factor = 1 + contrast;

  for (let i = 0; i < image.data.length; i += 4) {
    out[i] = clampByte((image.data[i] - 127) * factor + 127 + brightness);
    out[i + 1] = clampByte((image.data[i + 1] - 127) * factor + 127 + brightness);
    out[i + 2] = clampByte((image.data[i + 2] - 127) * factor + 127 + brightness);
    out[i + 3] = image.data[i + 3];
  }

  return { ...image, data: out };
}

function applyNonLocalMeansPreview(image: RgbImage, strength: number): RgbImage {
  const out = new Uint8ClampedArray(image.data.length);
  const rangeSigma = 18 + strength * 58;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const centerLuma = luma(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
      const totals = [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
      let totalWeight = 1;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const sampleOffset = (reflectIndex(y + dy, image.height) * image.width + reflectIndex(x + dx, image.width)) * 4;
          const sampleLuma = luma(image.data[sampleOffset], image.data[sampleOffset + 1], image.data[sampleOffset + 2]);
          const diff = sampleLuma - centerLuma;
          const weight = Math.exp(-(diff * diff) / (2 * rangeSigma * rangeSigma)) * strength;
          totals[0] += image.data[sampleOffset] * weight;
          totals[1] += image.data[sampleOffset + 1] * weight;
          totals[2] += image.data[sampleOffset + 2] * weight;
          totalWeight += weight;
        }
      }

      out[offset] = clampByte(totals[0] / totalWeight);
      out[offset + 1] = clampByte(totals[1] / totalWeight);
      out[offset + 2] = clampByte(totals[2] / totalWeight);
      out[offset + 3] = image.data[offset + 3];
    }
  }

  return { ...image, data: out };
}

function computeEdgeMap(image: RgbImage): EdgeMap {
  const out = new Float32Array(image.width * image.height);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const center = sampleLumaReflect(image, x, y);
      const horizontal = sampleLumaReflect(image, x - 1, y) + sampleLumaReflect(image, x + 1, y);
      const vertical = sampleLumaReflect(image, x, y - 1) + sampleLumaReflect(image, x, y + 1);
      out[y * image.width + x] = center * 4 - horizontal - vertical;
    }
  }

  return out;
}

function bayerToGrayscalePreview(raw: RawImage, data: Uint16Array): RgbImage {
  const maxValue = maxRawValue(raw);
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

function averageBayerChannel(
  data: Uint16Array,
  raw: RawImage,
  x: number,
  y: number,
  channel: Channel,
  radius: 1 | 2,
): number {
  let sum = 0;
  let count = 0;

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = reflectIndex(x + dx, raw.width);
      const ny = reflectIndex(y + dy, raw.height);
      if (getBayerChannel(nx, ny, raw.pattern) === channel) {
        sum += sampleRaw(data, raw, nx, ny);
        count += 1;
      }
    }
  }

  return count > 0 ? sum / count : sampleRaw(data, raw, x, y);
}

function sampleRaw(data: Uint16Array, raw: RawImage, x: number, y: number): number {
  return data[y * raw.width + x];
}

function sampleRawReflect(data: Uint16Array, raw: RawImage, x: number, y: number): number {
  return sampleRaw(data, raw, reflectIndex(x, raw.width), reflectIndex(y, raw.height));
}

function sampleLumaReflect(image: RgbImage, x: number, y: number): number {
  const offset = (reflectIndex(y, image.height) * image.width + reflectIndex(x, image.width)) * 4;
  return luma(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
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

function rgbToYuv(r: number, g: number, b: number): { y: number; u: number; v: number } {
  return {
    y: 0.299 * r + 0.587 * g + 0.114 * b,
    u: -0.168736 * r - 0.331264 * g + 0.5 * b + 128,
    v: 0.5 * r - 0.418688 * g - 0.081312 * b + 128,
  };
}

function yuvToRgb(y: number, u: number, v: number): { r: number; g: number; b: number } {
  const centeredU = u - 128;
  const centeredV = v - 128;
  return {
    r: clampByte(y + 1.402 * centeredV),
    g: clampByte(y - 0.344136 * centeredU - 0.714136 * centeredV),
    b: clampByte(y + 1.772 * centeredU),
  };
}

function writeRgb(out: Uint8ClampedArray, width: number, x: number, y: number, r: number, g: number, b: number) {
  const offset = (y * width + x) * 4;
  out[offset] = r;
  out[offset + 1] = g;
  out[offset + 2] = b;
  out[offset + 3] = 255;
}

function cloneRgb(image: RgbImage): RgbImage {
  return { ...image, data: new Uint8ClampedArray(image.data) };
}

function maxRawValue(raw: RawImage): number {
  return (1 << raw.bitDepth) - 1;
}

function toByte(value: number, maxValue: number): number {
  return Math.max(0, Math.min(255, Math.round((value / maxValue) * 255)));
}

function clamp16(value: number, maxValue: number): number {
  return Math.max(0, Math.min(maxValue, Math.round(value)));
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function reflectIndex(index: number, length: number): number {
  if (length <= 1) {
    return 0;
  }
  if (index < 0) {
    return -index;
  }
  if (index >= length) {
    return length - (index - length) - 2;
  }
  return index;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * Math.max(0, Math.min(1, amount));
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
