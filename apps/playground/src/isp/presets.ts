import type { PipelineConfig } from "./types";

export const defaultConfig: PipelineConfig = {
  blc: {
    enabled: true,
    blackLevel: 64,
  },
  awb: {
    enabled: true,
    rGain: 1.55,
    gGain: 1,
    bGain: 1.35,
  },
  ccm: {
    enabled: true,
    matrix: [
      [1.12, -0.06, -0.06],
      [-0.04, 1.08, -0.04],
      [-0.02, -0.08, 1.1],
    ],
  },
  gamma: {
    enabled: true,
    gamma: 2.2,
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
