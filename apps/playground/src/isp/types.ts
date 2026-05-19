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

export type ColorMatrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export type PipelineConfig = {
  dpc: {
    enabled: boolean;
    threshold: number;
  };
  blc: {
    enabled: boolean;
    blackLevel: number;
  };
  aaf: {
    enabled: boolean;
  };
  awb: {
    enabled: boolean;
    rGain: number;
    gGain: number;
    bGain: number;
  };
  bnf: {
    enabled: boolean;
    strength: number;
  };
  cnf: {
    enabled: boolean;
    threshold: number;
    strength: number;
  };
  cfa: {
    enabled: boolean;
    mode: "bilinear" | "malvar";
  };
  ccm: {
    enabled: boolean;
    matrix: ColorMatrix3x3;
  };
  gac: {
    enabled: boolean;
    gamma: number;
  };
  csc: {
    enabled: boolean;
  };
  hsc: {
    enabled: boolean;
    hue: number;
    saturation: number;
  };
  eeh: {
    enabled: boolean;
    strength: number;
    threshold: number;
  };
  fcs: {
    enabled: boolean;
    strength: number;
    threshold: number;
  };
  bcc: {
    enabled: boolean;
    brightness: number;
    contrast: number;
  };
  nlm: {
    enabled: boolean;
    strength: number;
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
