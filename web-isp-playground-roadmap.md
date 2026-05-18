# openISP Playground: Web ISP Tuning Roadmap

## 1. Project Name

Recommended name: **openISP Playground**

Positioning:

> A browser-based ISP playground for learning, tuning, and visualizing RAW-to-RGB image processing pipelines.

This name is recommended because the web version should feel easy to open, easy to share, and easy to understand. It is less formal than `openISP Studio`, which is better reserved for a future desktop/professional tool.

Alternative names:

| Name | Direction |
| --- | --- |
| openISP Playground | Web demo, learning, interactive tuning |
| openISP Lab | Research and experiment focused |
| RawLab | Broader RAW image processing experiments |
| ISP Explorer | Visual pipeline exploration |
| BayerLab | Bayer-domain learning focus |

Recommended choice: **openISP Playground**.

## 2. Product Goal

Build a web application that lets users upload or select a sample RAW/Bayer image, adjust ISP parameters, inspect pipeline stages, and export the final result or preset.

The first goal is not to replace professional ISP tuning software. The first goal is:

1. Make the ISP pipeline visible.
2. Make parameter effects easy to compare.
3. Make the project easy to try from a browser.
4. Reuse the existing openISP knowledge and algorithms where practical.

## 3. Target Users

| User | Need |
| --- | --- |
| ISP beginners | See how RAW becomes RGB step by step |
| Students and interview candidates | Learn pipeline concepts visually |
| Algorithm engineers | Quickly compare basic module parameters |
| Open-source contributors | Add stages, datasets, presets, metrics, and demos |
| Teachers or bloggers | Share a link instead of asking readers to install software |

## 4. Web-First Rationale

The web version is recommended as the public-facing open-source entry point because:

- Users can try it without installing anything.
- It is easy to deploy with GitHub Pages, Vercel, Netlify, or Cloudflare Pages.
- UI iteration is faster than native desktop development.
- Interactive image comparison is natural with Canvas/WebGL.
- The same UI can later be wrapped by Tauri for desktop.
- The project becomes easier to demonstrate in README, docs, and articles.

Main limitations:

- Browser file access is more restricted than desktop.
- Large RAW files may be slow in pure TypeScript.
- Full DNG decoding is hard in early versions.
- Heavy algorithms may need Web Workers, WASM, or WebGPU later.

## 5. Recommended Technical Stack

### MVP Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Framework | React + TypeScript | Mature, easy state management, strong ecosystem |
| Build tool | Vite | Fast dev server and simple static deployment |
| Styling | CSS Modules or plain CSS | Simple and dependency-light |
| Image rendering | Canvas 2D | Enough for first preview and pixel operations |
| State management | Zustand or React state | Avoid heavy architecture early |
| File parsing | Browser File API | Supports local upload without backend |
| Compute | TypeScript + Web Worker | Keeps UI responsive |
| Presets | JSON | Easy to save, load, diff, and share |
| Tests | Vitest | Fits Vite and TypeScript |
| Deployment | GitHub Pages first | Works well for open-source projects |

Recommended MVP choice:

```text
Vite + React + TypeScript + Canvas 2D + Web Worker + JSON presets
```

### Later Stack

| Need | Candidate |
| --- | --- |
| Faster pixel processing | WASM from Rust or C++ |
| GPU preview and processing | WebGPU |
| Large image tiling | OffscreenCanvas + Web Worker |
| DNG parsing | WASM LibRaw or server-side optional demo |
| Desktop packaging | Tauri reusing the same web UI |
| Advanced charts | lightweight histogram component or custom Canvas |

## 6. Core Product Shape

The first screen should be the tool itself, not a landing page.

Recommended layout:

```text
+--------------------------------------------------------------------------------+
| Top Bar: Open Sample | Upload Bayer | Run | Export Image | Export Preset        |
+----------------------+-------------------------------------------+-------------+
| Pipeline             | Image Viewer                              | Parameters  |
| - Load RAW           |                                           | BLC         |
| - BLC                |   final / stage / before-after view       | AWB         |
| - AWB                |                                           | Gamma       |
| - Demosaic           |                                           | Saturation  |
| - CCM                |                                           | Contrast    |
| - Gamma              |                                           |             |
+----------------------+-------------------------------------------+-------------+
| Bottom Panel: Histogram | Metadata | Stage Outputs | Logs                       |
+--------------------------------------------------------------------------------+
```

Important UI principles:

- Use sliders for numeric parameters.
- Use toggles for enabling or disabling stages.
- Use tabs for final image, stage image, histogram, and metadata.
- Use before/after split view as a primary comparison mode.
- Keep the interface dense and tool-like.
- Avoid marketing-style hero sections in the app itself.

## 7. MVP Scope

### Input Support

Start with controlled input formats:

1. Built-in sample image from `raw/test.RAW`.
2. Uploaded Bayer data with known width, height, bit depth, and Bayer pattern.
3. Optional uploaded Bayer PNG for easier browser demos.

Avoid full DNG support in MVP.

### Pipeline Stages

Minimum useful browser pipeline:

```text
Bayer input
  -> black level correction
  -> white balance gains
  -> simple demosaic
  -> color correction matrix
  -> gamma
  -> brightness/contrast/saturation
  -> RGB preview
```

Recommended MVP stages:

| Stage | MVP Status | Reason |
| --- | --- | --- |
| BLC | Must have | Easy and visually important |
| AWB gain | Must have | Good interactive tuning example |
| CFA/demosaic | Must have | Required to preview RGB |
| CCM | Should have | Important color concept |
| Gamma | Must have | Easy visual effect |
| Brightness/contrast | Must have | Useful for quick tuning |
| Saturation | Should have | Easy for users to understand |
| DPC | Later | Less obvious in demo without bad-pixel samples |
| LSC | Later | Needs calibration-like data |
| Denoise | Later | More compute-heavy |
| Sharpen | Later | Useful but can wait |
| CSC/YUV modules | Later | Better after RGB flow is stable |

### Output Support

MVP outputs:

- Final RGB image preview.
- Stage preview.
- Download final image as PNG.
- Export preset as JSON.
- Import preset from JSON.

## 8. Implementation Architecture

Recommended frontend architecture:

```text
apps/playground/
  src/
    app/
      App.tsx
      app.css
    components/
      TopBar.tsx
      PipelinePanel.tsx
      ImageViewer.tsx
      ParameterPanel.tsx
      HistogramPanel.tsx
    isp/
      pipeline.ts
      stages/
        blc.ts
        awb.ts
        demosaic.ts
        ccm.ts
        gamma.ts
        tone.ts
      types.ts
      presets.ts
    workers/
      pipeline.worker.ts
    io/
      raw.ts
      image.ts
    samples/
      sampleManifest.ts
    tests/
      pipeline.test.ts
```

Suggested data types:

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

type PipelineStageOutput = {
  id: string;
  label: string;
  domain: "bayer" | "rgb";
  preview: RgbImage;
};
```

## 9. Processing Model

Do not run heavy pixel loops directly in React components.

Recommended flow:

```text
React UI
  -> update preset/state
  -> send RawImage + PipelineConfig to Web Worker
  -> worker runs pipeline
  -> worker returns final RGB + selected stage previews
  -> UI renders Canvas previews
```

Why use a Web Worker early:

- Keeps sliders and UI responsive.
- Makes future WASM integration easier.
- Separates UI code from image-processing code.
- Encourages a clean pipeline API.

## 10. Preset Format

Use JSON first:

```json
{
  "name": "default-web-preview",
  "input": {
    "width": 1920,
    "height": 1080,
    "bitDepth": 12,
    "bayerPattern": "RGGB"
  },
  "stages": {
    "blc": {
      "enabled": true,
      "blackLevel": 64
    },
    "awb": {
      "enabled": true,
      "rGain": 1.8,
      "gGain": 1.0,
      "bGain": 1.5
    },
    "ccm": {
      "enabled": true,
      "matrix": [
        [1.4, -0.2, -0.2],
        [-0.1, 1.2, -0.1],
        [0.0, -0.3, 1.3]
      ]
    },
    "gamma": {
      "enabled": true,
      "gamma": 2.2
    },
    "tone": {
      "enabled": true,
      "brightness": 0,
      "contrast": 1.0,
      "saturation": 1.0
    }
  }
}
```

## 11. Roadmap

### Phase 0: Web Project Preparation

Goal: prepare the repo for a web app without disrupting the existing Python project.

Tasks:

1. Create `apps/playground`.
2. Scaffold Vite + React + TypeScript.
3. Add basic app shell layout.
4. Add sample image manifest.
5. Add CI or local commands for lint/test/build.

Verify:

- `npm install` works.
- `npm run dev` starts the app.
- `npm run build` produces a static build.

### Phase 1: Minimal Image Viewer

Goal: show an image in the browser reliably.

Tasks:

1. Add top bar and image viewer.
2. Load a built-in sample.
3. Convert a small Bayer sample to grayscale preview.
4. Render preview through Canvas.
5. Add zoom-to-fit and actual-size view.

Verify:

- The app opens and displays a nonblank image.
- The Canvas size is stable on desktop and mobile widths.

### Phase 2: First ISP Pipeline

Goal: produce an RGB image from Bayer input.

Tasks:

1. Implement BLC.
2. Implement AWB gains.
3. Implement simple bilinear demosaic.
4. Implement gamma correction.
5. Return final RGB image from pipeline.
6. Add a Web Worker around the pipeline.

Verify:

- Changing black level affects shadows.
- Changing WB gains affects color balance.
- Gamma changes brightness response.
- UI remains responsive while processing.

### Phase 3: Interactive Tuning UI

Goal: make parameter tuning feel immediate and understandable.

Tasks:

1. Add parameter panel with sliders.
2. Add stage enable/disable toggles.
3. Add rerun-on-change with debounce.
4. Add before/after split view.
5. Add stage output selector.
6. Add reset-to-default button.

Verify:

- A user can adjust a slider and see the output update.
- Before/after view clearly shows the parameter effect.
- Disabled stages are skipped consistently.

### Phase 4: Presets and Export

Goal: make experiments shareable.

Tasks:

1. Export current preset as JSON.
2. Import preset JSON.
3. Download final image as PNG.
4. Add browser local storage for recent presets.
5. Add sample presets.

Verify:

- Exported preset can be imported and reproduce the same output.
- Downloaded PNG matches the preview.

### Phase 5: Better Analysis Panels

Goal: make the tool useful for learning and debugging.

Tasks:

1. Add RGB histogram.
2. Add image metadata panel.
3. Add pixel inspector on hover.
4. Add stage timing logs.
5. Add simple clipping warning overlay.

Verify:

- Histogram updates after each pipeline run.
- Pixel inspector reports stable RGB values.
- Stage timing helps identify slow modules.

### Phase 6: More ISP Modules

Goal: expand beyond the minimal visible pipeline.

Recommended order:

1. CCM.
2. Brightness/contrast/saturation.
3. Sharpen.
4. DPC.
5. LSC.
6. Denoise.
7. YUV conversion and YUV-domain modules.

Verify:

- Each new module has one sample preset.
- Each new module has at least one focused unit test.
- Each new module can be enabled or disabled from the pipeline panel.

### Phase 7: Performance Upgrade

Goal: handle larger images smoothly.

Tasks:

1. Profile the TypeScript implementation.
2. Add tiling for large images.
3. Use OffscreenCanvas where supported.
4. Move hotspots to WASM only after profiling.
5. Consider WebGPU for preview-scale processing.

Verify:

- Common sample images process within acceptable time.
- UI remains responsive during processing.
- Output is consistent across TypeScript and WASM paths.

### Phase 8: Public Release

Goal: make the project easy to discover and contribute to.

Tasks:

1. Deploy static site.
2. Add README screenshots or GIF.
3. Add a short tutorial.
4. Add contribution guide for new ISP stages.
5. Add sample data policy.
6. Add issue templates for bugs, modules, and datasets.

Verify:

- A new user can open the hosted site and run the demo without local setup.
- A contributor can add a small stage by following one document.

## 12. Testing Strategy

Recommended tests:

| Test Type | Target |
| --- | --- |
| Unit tests | BLC, AWB, demosaic, gamma, preset parser |
| Golden tests | Small fixed Bayer input produces expected output |
| UI smoke tests | App loads, sample renders, sliders update state |
| Build test | Static deployment build succeeds |
| Visual checks | Canvas is nonblank after sample load |

Start with small synthetic images, such as 4x4 or 8x8 Bayer arrays. They make demosaic and color math easier to verify.

## 13. Deployment Plan

Recommended first deployment: **GitHub Pages**.

Why:

- Good fit for open-source demos.
- No backend required.
- Easy to connect with GitHub Actions later.

Build output:

```text
apps/playground/dist
```

Later deployment options:

- Vercel for preview deployments.
- Netlify for simple static hosting.
- Cloudflare Pages for fast static delivery.

## 14. MVP Acceptance Criteria

The web MVP is successful when:

1. A user can open the web app and load a sample image.
2. The app displays a nonblank final RGB preview.
3. The user can adjust at least BLC, AWB, and gamma.
4. The user can inspect at least one intermediate stage.
5. The user can export a preset JSON.
6. `npm run build` produces a deployable static site.

## 15. Immediate Next Steps

Recommended implementation order:

1. Create `apps/playground` with Vite + React + TypeScript.
2. Add the tool-like three-panel layout.
3. Add a small synthetic Bayer sample directly in TypeScript.
4. Implement BLC, AWB, demosaic, and gamma.
5. Render the final RGB result on Canvas.
6. Move pipeline execution into a Web Worker.
7. Add sliders and stage toggles.
8. Add preset import/export.

