import type { PipelineConfig } from "./types";

export const defaultConfig: PipelineConfig = {
  dpc: {
    enabled: true,
    threshold: 420,
  },
  blc: {
    enabled: true,
    blackLevel: 64,
  },
  aaf: {
    enabled: false,
  },
  awb: {
    enabled: true,
    rGain: 1.55,
    gGain: 1,
    bGain: 1.35,
  },
  bnf: {
    enabled: false,
    strength: 0.35,
  },
  cnf: {
    enabled: false,
    threshold: 180,
    strength: 0.45,
  },
  cfa: {
    enabled: true,
    mode: "bilinear",
  },
  ccm: {
    enabled: true,
    matrix: [
      [1.12, -0.06, -0.06],
      [-0.04, 1.08, -0.04],
      [-0.02, -0.08, 1.1],
    ],
  },
  gac: {
    enabled: true,
    gamma: 2.2,
  },
  csc: {
    enabled: true,
  },
  hsc: {
    enabled: false,
    hue: 0,
    saturation: 1,
  },
  eeh: {
    enabled: false,
    strength: 0.45,
    threshold: 10,
  },
  fcs: {
    enabled: false,
    strength: 0.5,
    threshold: 18,
  },
  bcc: {
    enabled: false,
    brightness: 0,
    contrast: 0,
  },
  nlm: {
    enabled: false,
    strength: 0.25,
  },
};

export function buildPresetJson(config: PipelineConfig): string {
  return JSON.stringify(
    {
      name: "default-web-preview",
      input: {
        width: 128,
        height: 96,
        bitDepth: 12,
        bayerPattern: "RGGB",
      },
      stages: config,
    },
    null,
    2,
  );
}
