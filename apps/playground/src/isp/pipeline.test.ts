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

    expect(result.stages.map((stage) => stage.id)).toEqual(["bayer", "demosaic", "final"]);
  });
});
