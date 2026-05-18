export type BayerPattern = "RGGB" | "BGGR" | "GRBG" | "GBRG";

export type RawImage = {
  width: number;
  height: number;
  bitDepth: 8 | 10 | 12 | 14 | 16;
  pattern: BayerPattern;
  data: Uint16Array;
};

export type RgbImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type PipelineConfig = {
  blc: {
    enabled: boolean;
    blackLevel: number;
  };
  awb: {
    enabled: boolean;
    rGain: number;
    gGain: number;
    bGain: number;
  };
  gamma: {
    enabled: boolean;
    gamma: number;
  };
};

export type PipelineStageOutput = {
  id: string;
  label: string;
  domain: "bayer" | "rgb";
  preview: RgbImage;
};

export type PipelineResult = {
  final: RgbImage;
  stages: PipelineStageOutput[];
};
