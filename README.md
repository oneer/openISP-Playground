# openISP Playground

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A browser-based ISP (Image Signal Processor) playground for learning, tuning, and visualizing RAW-to-RGB image processing pipelines. Runs entirely in the browser — no backend, no installation.

[中文文档](README.zh-CN.md)

## Pipeline

```
Bayer RAW → BLC → AWB → Demosaic → CCM → Gamma → RGB Output
```

Each stage outputs a preview image, selectable from the UI for inspection. Parameters are adjustable in real time via sliders and numeric inputs, with changes reflected immediately on Canvas 2D.

### Stages

| Stage | Domain | Description |
|-------|--------|-------------|
| BLC (Black Level Correction) | Bayer | Subtracts the optical black offset from each pixel to set the true zero reference |
| AWB (White Balance) | Bayer | Applies independent R/G/B channel gains to compensate for illuminant color temperature |
| Demosaic | Bayer → RGB | Reconstructs full per-pixel RGB from a Bayer CFA using bilinear interpolation over the 3×3 neighborhood |
| CCM (Color Correction Matrix) | RGB | Transforms sensor RGB into a target color space via a 3×3 matrix multiply |
| Gamma | RGB | Applies power-law encoding (V<sub>out</sub> = V<sub>in</sub><sup>1/γ</sup>) for display-ready output |

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌────────────┐
│  Parameters  │───▶│  runPipeline()   │───▶│  Stages[]  │
│  (React)     │    │  (pure function) │    │  → Canvas  │
└─────────────┘    └──────────────────┘    └────────────┘
```

Pipeline execution is a pure TypeScript function that takes a `RawImage` and `PipelineConfig`, and returns a `PipelineResult` containing the final RGB image plus intermediate stage previews. No Web Worker yet — processing runs synchronously on the main thread and is fast enough for the built-in 128×96 sample.

### Core Types

```ts
type BayerPattern = "RGGB" | "BGGR" | "GRBG" | "GBRG";

type RawImage = {
  width: number;
  height: number;
  bitDepth: 8 | 10 | 12 | 14 | 16;
  pattern: BayerPattern;
  data: Uint16Array;
};

type PipelineConfig = {
  blc:   { enabled: boolean; blackLevel: number };
  awb:   { enabled: boolean; rGain: number; gGain: number; bGain: number };
  demosaic: { enabled: boolean };
  ccm:   { enabled: boolean; matrix: [[number,number,number],[number,number,number],[number,number,number]] };
  gamma: { enabled: boolean; gamma: number };
};
```

## Preset Format

Configurations are serializable as JSON for export and sharing:

```json
{
  "name": "default-web-preview",
  "input": {
    "width": 128,
    "height": 96,
    "bitDepth": 12,
    "bayerPattern": "RGGB"
  },
  "stages": {
    "blc":   { "enabled": true, "blackLevel": 64 },
    "awb":   { "enabled": true, "rGain": 1.55, "gGain": 1.0, "bGain": 1.35 },
    "ccm":   { "enabled": true, "matrix": [[1.12,-0.06,-0.06],[-0.04,1.08,-0.04],[-0.02,-0.08,1.1]] },
    "gamma": { "enabled": true, "gamma": 2.2 }
  }
}
```

Exported from the UI via the **Export Preset** button, or programmatically via `buildPresetJson()`.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript 5 |
| Bundler | Vite 7 |
| Rendering | Canvas 2D |
| Icons | Lucide React |
| Testing | Vitest |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (listens on 0.0.0.0)
npm run dev

# Production build
npm run build

# Run tests
npm run test
```

## Project Structure

```
openISP Playground/
├── apps/playground/src/
│   ├── app/App.tsx            # Application shell, layout, i18n
│   ├── components/
│   │   └── ImageCanvas.tsx    # Canvas 2D image renderer
│   ├── isp/
│   │   ├── pipeline.ts        # Pipeline executor and stage algorithms
│   │   ├── types.ts           # Shared type definitions
│   │   └── presets.ts         # Default configuration and serialization
│   └── samples/
│       └── syntheticBayer.ts  # Programmatic RGGB test image generator
├── third_party/openISP/       # Reference implementation (git submodule)
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

## License

MIT © 2026 万一

This project includes algorithm references from [cruxopen/openISP](https://github.com/cruxopen/openISP). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution details.
