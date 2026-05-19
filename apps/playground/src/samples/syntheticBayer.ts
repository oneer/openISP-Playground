import type { RawImage } from "../isp/types";

type Rgb = [number, number, number];

export function createSyntheticBayerSample(width = 256, height = 192): RawImage {
  const data = new Uint16Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = sampleSceneRgb(x, y, width, height);
      const channelValue = getRggbValue(x, y, r, g, b);
      data[y * width + x] = Math.max(0, Math.min(4095, Math.round((channelValue / 255) * 4095)));
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

function sampleSceneRgb(x: number, y: number, width: number, height: number): Rgb {
  const nx = x / Math.max(1, width - 1);
  const ny = y / Math.max(1, height - 1);
  const vignette = 1 - Math.hypot(nx - 0.5, ny - 0.5) * 0.28;
  let rgb: Rgb = [
    34 + nx * 168,
    42 + ny * 150,
    68 + (1 - nx) * 142,
  ];

  if (ny < 0.24) {
    rgb = colorCheckerPatch(nx);
  } else if (ny < 0.42) {
    const gray = Math.round(24 + nx * 218);
    rgb = [gray, gray, gray];
  } else if (ny < 0.64) {
    const stripe = Math.sin(nx * Math.PI * 42) > 0 ? 212 : 42;
    const edge = nx > 0.52 ? 235 : 35;
    rgb = [edge, stripe, 255 - stripe];
  } else {
    const radius = Math.hypot(nx - 0.5, ny - 0.78);
    const ring = Math.sin(radius * 96) * 22;
    rgb = [
      74 + nx * 126 + ring,
      64 + (1 - Math.abs(nx - 0.5) * 2) * 154,
      92 + (1 - ny) * 120 - ring,
    ];
  }

  const fineLine = (x % 17 === 0 || y % 19 === 0) && ny > 0.42 ? 26 : 0;
  return [
    clampByte(rgb[0] * vignette - fineLine),
    clampByte(rgb[1] * vignette - fineLine),
    clampByte(rgb[2] * vignette - fineLine),
  ];
}

function colorCheckerPatch(nx: number): Rgb {
  const patches: Rgb[] = [
    [115, 82, 68],
    [194, 150, 130],
    [98, 122, 157],
    [87, 108, 67],
    [133, 128, 177],
    [103, 189, 170],
    [214, 126, 44],
    [80, 91, 166],
    [193, 90, 99],
    [94, 60, 108],
    [157, 188, 64],
    [224, 163, 46],
  ];
  return patches[Math.min(patches.length - 1, Math.floor(nx * patches.length))];
}

function getRggbValue(x: number, y: number, r: number, g: number, b: number): number {
  if (y % 2 === 0) {
    return x % 2 === 0 ? r : g;
  }
  return x % 2 === 0 ? g : b;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
