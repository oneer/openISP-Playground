# openISP Playground

A browser-based ISP (Image Signal Processor) playground for learning, tuning, and visualizing RAW-to-RGB image processing pipelines. No installation required — open the page and start exploring.

[中文文档](README.zh-CN.md)

## Overview

openISP Playground renders an ISP pipeline directly in the browser using Canvas 2D. Adjust parameters with sliders, inspect intermediate stages, and see the results update in real time. The pipeline is a TypeScript port of algorithms from [cruxopen/openISP](https://github.com/cruxopen/openISP).

### Pipeline stages

**Bayer input → BLC → AWB → Demosaic → CCM → Gamma → RGB preview**

| Stage | Description |
|-------|-------------|
| BLC (Black Level Correction) | Subtracts the sensor black level offset |
| AWB (Auto White Balance) | Applies per-channel RGB gains |
| Demosaic (Bilinear) | Reconstructs full-color RGB from Bayer CFA |
| CCM (Color Correction Matrix) | Applies a 3×3 color transform |
| Gamma | Applies power-law gamma encoding |

### Features

- Interactive parameter sliders with real-time preview
- Pipeline stage inspection (Bayer, Demosaic, CCM, Final RGB)
- Enable/disable individual stages
- Export presets as JSON
- Bilingual UI (English / Chinese)
- Zoom controls for pixel-level inspection
- Built-in synthetic RGGB sample (128×96, 12-bit)

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Plain CSS |
| Rendering | Canvas 2D |
| Testing | Vitest |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

The dev server starts at `http://localhost:5173` by default.

## Project Structure

```
apps/playground/
  src/
    app/          App shell and layout
    components/   ImageCanvas
    isp/          Pipeline, types, presets
    samples/      Synthetic Bayer sample generator
third_party/      openISP submodule (reference)
```

## License

MIT © 2026 万一

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for upstream attribution.
