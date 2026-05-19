import { describe, expect, it } from "vitest";
import { runPipeline } from "./pipeline";
import { defaultConfig } from "./presets";
import { createSyntheticBayerSample } from "../samples/syntheticBayer";

describe("runPipeline", () => {
  it("returns a nonblank RGB preview", () => {
    const raw = createSyntheticBayerSample(8, 8);
    const result = runPipeline(raw, defaultConfig);

    expect(result.final.width).toBe(8);
    expect(result.final.height).toBe(8);
    expect(result.final.data.length).toBe(8 * 8 * 4);
    expect(Math.max(...result.final.data)).toBeGreaterThan(0);
  });

  it("exposes preview stages", () => {
    const raw = createSyntheticBayerSample(8, 8);
    const result = runPipeline(raw, defaultConfig);

    expect(result.stages.map((stage) => stage.id)).toEqual([
      "dpc",
      "blc",
      "aaf",
      "awb",
      "bnf",
      "cnf",
      "cfa",
      "ccm",
      "gac",
      "csc",
      "hsc",
      "eeh",
      "fcs",
      "bcc",
      "nlm",
    ]);
  });

  it("applies a color correction matrix before gamma", () => {
    const raw = createSyntheticBayerSample(8, 8);
    const withoutCcm = runPipeline(raw, {
      ...defaultConfig,
      ccm: { ...defaultConfig.ccm, enabled: false },
    });
    const withCcm = runPipeline(raw, {
      ...defaultConfig,
      ccm: {
        enabled: true,
        matrix: [
          [1.8, 0, 0],
          [0, 0.6, 0],
          [0, 0, 0.6],
        ],
      },
    });

    expect(Array.from(withCcm.final.data)).not.toEqual(Array.from(withoutCcm.final.data));
  });

  it("keeps every openISP module path executable when enabled", () => {
    const raw = createSyntheticBayerSample(8, 8);
    const result = runPipeline(raw, {
      ...defaultConfig,
      aaf: { enabled: true },
      bnf: { enabled: true, strength: 0.5 },
      cnf: { enabled: true, threshold: 120, strength: 0.5 },
      cfa: { enabled: true, mode: "malvar" },
      hsc: { enabled: true, hue: 12, saturation: 1.1 },
      eeh: { enabled: true, strength: 0.4, threshold: 6 },
      fcs: { enabled: true, strength: 0.5, threshold: 8 },
      bcc: { enabled: true, brightness: 8, contrast: 0.1 },
      nlm: { enabled: true, strength: 0.3 },
    });

    expect(result.final.data.length).toBe(8 * 8 * 4);
    expect(Math.max(...result.final.data)).toBeGreaterThan(0);
  });
});
