# openISP Playground

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A browser-based ISP (Image Signal Processor) playground for learning, tuning, and visualizing RAW-to-RGB image processing pipelines. Runs entirely in the browser — no backend, no installation.

[中文文档](README.zh-CN.md)

## Pipeline

```
Bayer RAW → DPC → BLC → AAF → AWB → BNF → CNF → CFA → CCM → GAC → CSC → HSC → EEH → FCS → BCC → NLM → RGB Output
```

Each stage outputs a preview image, selectable from the UI for inspection. Parameters are adjustable in real time via sliders and numeric inputs, with changes reflected immediately on Canvas 2D.

### Stages

| Stage | Domain | Description |
|-------|--------|-------------|
| DPC (Dead Pixel Correction) | Bayer | Detects and corrects isolated defective pixels using 3×3 neighborhood comparison |
| BLC (Black Level Correction) | Bayer | Subtracts the optical black offset from each pixel to set the true zero reference |
| AAF (Anti-Aliasing Filter) | Bayer | Applies a 5×5 low-pass filter to suppress aliasing artifacts before interpolation |
| AWB (Auto White Balance) | Bayer | Applies independent R/G/B channel gains to compensate for illuminant color temperature |
| BNF (Bilateral Noise Filter) | Bayer | Edge-preserving spatial denoising using range-weighted bilateral kernels |
| CNF (Chroma Noise Filter) | Bayer | Suppresses chroma noise in R/B channels by clamping deviations from green averages |
| CFA (CFA Interpolation) | Bayer → RGB | Reconstructs full per-pixel RGB via bilinear or Malvar-He-Cutler demosaicing |
| CCM (Color Correction Matrix) | RGB | Transforms sensor RGB into a target color space via a 3×3 matrix multiply |
| GAC (Gamma Correction) | RGB | Applies power-law encoding (V<sub>out</sub> = V<sub>in</sub><sup>1/γ</sup>) for display-ready output |
| CSC (Color Space Conversion) | RGB | Converts between RGB and YUV color spaces for downstream processing |
| HSC (Hue Saturation Control) | RGB | Rotates hue angle and scales saturation in the YUV domain |
| EEH (Edge Enhancement) | RGB | Laplacian-based edge sharpening with adjustable strength and threshold |
| FCS (False Color Suppression) | RGB | Attenuates chroma on detected edges to reduce color fringing artifacts |
| BCC (Brightness Contrast Control) | RGB | Global brightness offset and contrast scaling around mid-gray |
| NLM (Non-Local Means Denoising) | RGB | Patch-similarity-based denoising using 3×3 search window with luma weighting |

## Features

- **15-stage ISP pipeline** with fully tunable parameters
- **Dual demosaicing modes** — bilinear (fast) and Malvar-He-Cutler (high quality)
- **Import JPEG/PNG images** and simulate them as Bayer RAW inputs
- **Zoom & drag** — scale the preview up to 1000% and pan with pointer drag
- **Bilingual UI** — English and Chinese with instant switching
- **Stage preview caching** — avoids redundant computation when parameters haven't changed
- **JSON export** — serialize the full configuration as a shareable preset
- **Built-in synthetic test image** (256×192, 12-bit RGGB) with color patches, gradients, and frequency patterns

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌────────────┐
│  Parameters  │───▶│  runPipeline()   │───▶│  Stages[]  │
│  (React)     │    │  (pure function) │    │  → Canvas  │
└─────────────┘    └──────────────────┘    └────────────┘
```

Pipeline execution is a pure TypeScript function that takes a `RawImage` and `PipelineConfig`, and returns a `PipelineResult` containing the final RGB image plus intermediate stage previews. Bayer-stage previews are cached to avoid redundant computation. Processing runs synchronously on the main thread and is fast enough for moderate-resolution images.

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

type RgbImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

type PipelineConfig = {
  dpc:  { enabled: boolean; threshold: number };
  blc:  { enabled: boolean; blackLevel: number };
  aaf:  { enabled: boolean };
  awb:  { enabled: boolean; rGain: number; gGain: number; bGain: number };
  bnf:  { enabled: boolean; strength: number };
  cnf:  { enabled: boolean; threshold: number; strength: number };
  cfa:  { enabled: boolean; mode: "bilinear" | "malvar" };
  ccm:  { enabled: boolean; matrix: [[number,number,number],[number,number,number],[number,number,number]] };
  gac:  { enabled: boolean; gamma: number };
  csc:  { enabled: boolean };
  hsc:  { enabled: boolean; hue: number; saturation: number };
  eeh:  { enabled: boolean; strength: number; threshold: number };
  fcs:  { enabled: boolean; strength: number; threshold: number };
  bcc:  { enabled: boolean; brightness: number; contrast: number };
  nlm:  { enabled: boolean; strength: number };
};
```

## Preset Format

Configurations are serializable as JSON for export and sharing:

```json
{
  "name": "default-web-preview",
  "input": {
    "width": 256,
    "height": 192,
    "bitDepth": 12,
    "bayerPattern": "RGGB"
  },
  "stages": {
    "dpc":  { "enabled": true,  "threshold": 420 },
    "blc":  { "enabled": true,  "blackLevel": 64 },
    "aaf":  { "enabled": false },
    "awb":  { "enabled": true,  "rGain": 1.55, "gGain": 1.0, "bGain": 1.35 },
    "bnf":  { "enabled": false, "strength": 0.35 },
    "cnf":  { "enabled": false, "threshold": 180, "strength": 0.45 },
    "cfa":  { "enabled": true,  "mode": "bilinear" },
    "ccm":  { "enabled": true,  "matrix": [[1.12,-0.06,-0.06],[-0.04,1.08,-0.04],[-0.02,-0.08,1.1]] },
    "gac":  { "enabled": true,  "gamma": 2.2 },
    "csc":  { "enabled": true },
    "hsc":  { "enabled": false, "hue": 0, "saturation": 1 },
    "eeh":  { "enabled": false, "strength": 0.45, "threshold": 10 },
    "fcs":  { "enabled": false, "strength": 0.5, "threshold": 18 },
    "bcc":  { "enabled": false, "brightness": 0, "contrast": 0 },
    "nlm":  { "enabled": false, "strength": 0.25 }
  }
}
```

Exported from the UI via the **Export Preset** button, or programmatically via `buildPresetJson()`.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript 5.9 |
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
│   ├── app/
│   │   ├── App.tsx              # Application shell, layout, i18n, state management
│   │   └── app.css              # Responsive layout and component styles
│   ├── components/
│   │   └── ImageCanvas.tsx      # Canvas 2D renderer with zoom and pointer-drag pan
│   ├── isp/
│   │   ├── pipeline.ts          # 15-stage pipeline executor and algorithms
│   │   ├── types.ts             # Shared type definitions
│   │   ├── presets.ts           # Default configuration and JSON serialization
│   │   └── pipeline.test.ts     # Pipeline correctness tests
│   └── samples/
│       └── syntheticBayer.ts    # Procedural RGGB test image with color patches and patterns
├── third_party/openISP/         # Reference C++ implementation (git submodule)
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

## License

MIT © 2026 万一

This project includes algorithm references from [cruxopen/openISP](https://github.com/cruxopen/openISP). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution details.
