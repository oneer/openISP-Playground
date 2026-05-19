import { Download, ImagePlus, Languages, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { ImageCanvas } from "../components/ImageCanvas";
import { runPipeline } from "../isp/pipeline";
import { buildPresetJson, defaultConfig } from "../isp/presets";
import type { PipelineConfig, RawImage } from "../isp/types";
import { createSyntheticBayerSample } from "../samples/syntheticBayer";

type NumericPath =
  | "dpc.threshold"
  | "blc.blackLevel"
  | "awb.rGain"
  | "awb.gGain"
  | "awb.bGain"
  | "bnf.strength"
  | "cnf.threshold"
  | "cnf.strength"
  | "gac.gamma"
  | "hsc.hue"
  | "hsc.saturation"
  | "eeh.strength"
  | "eeh.threshold"
  | "fcs.strength"
  | "fcs.threshold"
  | "bcc.brightness"
  | "bcc.contrast"
  | "nlm.strength";
type TogglePath =
  | "dpc.enabled"
  | "blc.enabled"
  | "aaf.enabled"
  | "awb.enabled"
  | "bnf.enabled"
  | "cnf.enabled"
  | "cfa.enabled"
  | "ccm.enabled"
  | "gac.enabled"
  | "csc.enabled"
  | "hsc.enabled"
  | "eeh.enabled"
  | "fcs.enabled"
  | "bcc.enabled"
  | "nlm.enabled";
type Language = "en" | "zh";

const pipelineStageIds = [
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
];

const pipelineStageLabels = {
  en: ["DPC", "BLC", "AAF", "AWB", "BNF", "CNF", "CFA", "CCM", "GAC", "CSC", "HSC", "EEH", "FCS", "BCC", "NLM"],
  zh: [
    "坏点校正 DPC",
    "黑电平 BLC",
    "抗混叠 AAF",
    "白平衡 AWB",
    "双边降噪 BNF",
    "色噪过滤 CNF",
    "去马赛克 CFA",
    "色彩矩阵 CCM",
    "Gamma GAC",
    "色彩空间 CSC",
    "色相饱和度 HSC",
    "边缘增强 EEH",
    "伪彩抑制 FCS",
    "亮度对比度 BCC",
    "非局部均值 NLM",
  ],
} satisfies Record<Language, string[]>;

const stageNameById: Record<Language, Record<string, string>> = {
  en: {
    dpc: "Dead Pixel Correction",
    blc: "Black Level Correction",
    aaf: "Anti-Aliasing Filter",
    awb: "Auto White Balance",
    bnf: "Bilateral Noise Filter",
    cnf: "Chroma Noise Filter",
    cfa: "CFA Interpolation",
    ccm: "Color Matrix",
    gac: "Gamma Correction",
    csc: "Color Space Conversion",
    hsc: "Hue Saturation Control",
    eeh: "Edge Enhancement",
    fcs: "False Color Suppression",
    bcc: "Brightness Contrast",
    nlm: "Non-Local Means",
  },
  zh: {
    dpc: "坏点校正 DPC",
    blc: "黑电平校正 BLC",
    aaf: "抗混叠滤波 AAF",
    awb: "自动白平衡 AWB",
    bnf: "双边降噪 BNF",
    cnf: "色噪过滤 CNF",
    cfa: "去马赛克 CFA",
    ccm: "色彩矩阵 CCM",
    gac: "Gamma 校正 GAC",
    csc: "色彩空间转换 CSC",
    hsc: "色相饱和度 HSC",
    eeh: "边缘增强 EEH",
    fcs: "伪彩抑制 FCS",
    bcc: "亮度对比度 BCC",
    nlm: "非局部均值降噪 NLM",
  },
};

const copy = {
  en: {
    sample: "Synthetic RGGB sample / 256 x 192 / 12-bit",
    importImage: "Import Image",
    importTitle: "Import JPEG or PNG as simulated RGGB RAW",
    reset: "Reset",
    resetTitle: "Reset parameters",
    exportPreset: "Export Preset",
    exportTitle: "Export preset JSON",
    pipeline: "Pipeline",
    preview: "Preview",
    parameters: "Parameters",
    deadPixel: "Dead Pixel Correction",
    threshold: "Threshold",
    blackLevel: "Black Level",
    level: "Level",
    antiAliasing: "Anti-Aliasing Filter",
    whiteBalance: "White Balance",
    bilateralNoise: "Bilateral Noise Filter",
    strength: "Strength",
    chromaNoise: "Chroma Noise Filter",
    cfa: "CFA Interpolation",
    mode: "Mode",
    bilinear: "Bilinear",
    malvar: "Malvar",
    ccm: "Color Matrix",
    gac: "Gamma",
    curve: "Curve",
    csc: "Color Space Conversion",
    hsc: "Hue Saturation",
    hue: "Hue",
    saturation: "Saturation",
    edge: "Edge Enhancement",
    falseColor: "False Color Suppression",
    bcc: "Brightness Contrast",
    brightness: "Brightness",
    contrast: "Contrast",
    nlm: "Non-Local Means",
    language: "Language",
    zoom: "Zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetZoom: "Reset zoom",
  },
  zh: {
    sample: "合成 RGGB 样本 / 256 x 192 / 12-bit",
    importImage: "导入图片",
    importTitle: "导入 JPEG 或 PNG 并模拟为 RGGB RAW",
    reset: "重置",
    resetTitle: "重置参数",
    exportPreset: "导出预设",
    exportTitle: "导出 JSON 预设",
    pipeline: "处理流水线",
    preview: "预览阶段",
    parameters: "参数调节",
    deadPixel: "坏点校正",
    threshold: "阈值",
    blackLevel: "黑电平",
    level: "电平",
    antiAliasing: "抗混叠滤波",
    whiteBalance: "白平衡",
    bilateralNoise: "双边降噪",
    strength: "强度",
    chromaNoise: "色噪过滤",
    cfa: "去马赛克",
    mode: "模式",
    bilinear: "双线性",
    malvar: "Malvar",
    ccm: "色彩矩阵",
    gac: "Gamma",
    curve: "曲线",
    csc: "色彩空间转换",
    hsc: "色相饱和度",
    hue: "色相",
    saturation: "饱和度",
    edge: "边缘增强",
    falseColor: "伪彩抑制",
    bcc: "亮度对比度",
    brightness: "亮度",
    contrast: "对比度",
    nlm: "非局部均值",
    language: "语言",
    zoom: "缩放",
    zoomIn: "放大",
    zoomOut: "缩小",
    resetZoom: "重置缩放",
  },
} satisfies Record<Language, Record<string, string>>;

const minZoomScale = 1;
const defaultZoomScale = 2.5;
const maxZoomScale = 10;

export function App() {
  const [config, setConfig] = useState<PipelineConfig>(defaultConfig);
  const [selectedStageId, setSelectedStageId] = useState("nlm");
  const [language, setLanguage] = useState<Language>("zh");
  const [zoomScale, setZoomScale] = useState(defaultZoomScale);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const defaultRaw = useMemo(() => createSyntheticBayerSample(), []);
  const [raw, setRaw] = useState(defaultRaw);
  const [sourceLabel, setSourceLabel] = useState("");
  const result = useMemo(() => runPipeline(raw, config), [raw, config]);
  const selectedStage = result.stages.find((stage) => stage.id === selectedStageId) ?? result.stages.at(-1)!;
  const t = copy[language];
  const stageNames = stageNameById[language];
  const sourceSummary = sourceLabel || t.sample;

  function updateNumber(path: NumericPath, value: number) {
    setConfig((current) => {
      const next = structuredClone(current);
      const [section, key] = path.split(".") as [keyof PipelineConfig, string];
      (next[section] as unknown as Record<string, number>)[key] = value;
      return next;
    });
  }

  function updateToggle(path: TogglePath, value: boolean) {
    setConfig((current) => {
      const next = structuredClone(current);
      const [section] = path.split(".") as [keyof PipelineConfig, "enabled"];
      next[section].enabled = value;
      return next;
    });
  }

  function updateCfaMode(mode: PipelineConfig["cfa"]["mode"]) {
    setConfig((current) => ({
      ...current,
      cfa: {
        ...current.cfa,
        mode,
      },
    }));
  }

  async function importImage(file: File) {
    const importedRaw = await imageFileToRaw(file);
    setRaw(importedRaw);
    setSourceLabel(`${file.name} / ${importedRaw.width} x ${importedRaw.height} / 12-bit`);
    setSelectedStageId("nlm");
    setZoomScale(Math.min(defaultZoomScale, 3));
  }

  function handleImportChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    void importImage(file).catch((error: unknown) => {
      window.alert(error instanceof Error ? error.message : "Unable to load image.");
    });
  }

  function exportPreset() {
    const blob = new Blob([buildPresetJson(config)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "openisp-playground-preset.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateZoom(delta: number) {
    setZoomScale((current) => Math.max(minZoomScale, Math.min(maxZoomScale, current + delta)));
  }

  function updateCcmValue(row: number, column: number, value: number) {
    setConfig((current) => {
      const next = structuredClone(current);
      next.ccm.matrix[row][column] = value;
      return next;
    });
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-block">
          <h1>openISP Playground</h1>
          <p>{sourceSummary}</p>
        </div>
        <div className="top-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              handleImportChange(event.target.files);
              event.currentTarget.value = "";
            }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} title={t.importTitle}>
            <ImagePlus size={18} />
            {t.importImage}
          </button>
          <div className="language-switch" aria-label={t.language}>
            <Languages size={17} />
            <button type="button" className={language === "en" ? "is-active" : ""} onClick={() => setLanguage("en")}>
              EN
            </button>
            <button type="button" className={language === "zh" ? "is-active" : ""} onClick={() => setLanguage("zh")}>
              中文
            </button>
          </div>
          <button type="button" onClick={() => setConfig(defaultConfig)} title={t.resetTitle}>
            <RotateCcw size={18} />
            {t.reset}
          </button>
          <button type="button" className="primary-action" onClick={exportPreset} title={t.exportTitle}>
            <Download size={18} />
            {t.exportPreset}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="pipeline-panel" aria-label="Pipeline stages">
          <h2>{t.pipeline}</h2>
          <ol>
            {pipelineStageLabels[language].map((label, index) => (
              <li key={pipelineStageIds[index]}>
                <button
                  type="button"
                  className={selectedStage.id === pipelineStageIds[index] ? "is-active" : ""}
                  onClick={() => setSelectedStageId(pipelineStageIds[index])}
                >
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <div className="stage-picker">
            <label htmlFor="stage-select">{t.preview}</label>
            <select id="stage-select" value={selectedStage.id} onChange={(event) => setSelectedStageId(event.target.value)}>
              {result.stages.map((stage) => (
                <option value={stage.id} key={stage.id}>
                  {stageNames[stage.id] ?? stage.label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <section className="viewer-panel" aria-label="Image preview">
          <div className="viewer-header">
            <h2>{stageNames[selectedStage.id] ?? selectedStage.label}</h2>
            <div className="viewer-tools">
              <div className="zoom-controls" aria-label={t.zoom}>
                <button type="button" onClick={() => updateZoom(-1)} disabled={zoomScale <= minZoomScale} title={t.zoomOut} aria-label={t.zoomOut}>
                  <ZoomOut size={16} />
                </button>
                <output>{Math.round(zoomScale * 100)}%</output>
                <button type="button" onClick={() => updateZoom(1)} disabled={zoomScale >= maxZoomScale} title={t.zoomIn} aria-label={t.zoomIn}>
                  <ZoomIn size={16} />
                </button>
                <button type="button" onClick={() => setZoomScale(defaultZoomScale)} title={t.resetZoom}>
                  <Maximize2 size={16} />
                </button>
              </div>
              <span>{selectedStage.domain.toUpperCase()}</span>
            </div>
          </div>
          <div className="canvas-frame">
            <div className="canvas-stage">
              <ImageCanvas image={selectedStage.preview} zoomScale={zoomScale} />
            </div>
          </div>
        </section>

        <aside className="parameter-panel" aria-label="ISP parameters">
          <h2>{t.parameters}</h2>
          <div className="parameter-grid">
            <ControlGroup title={t.deadPixel} enabled={config.dpc.enabled} onToggle={(value) => updateToggle("dpc.enabled", value)}>
              <Slider label={t.threshold} min={0} max={1200} step={10} value={config.dpc.threshold} onChange={(value) => updateNumber("dpc.threshold", value)} />
            </ControlGroup>

            <ControlGroup title={t.blackLevel} enabled={config.blc.enabled} onToggle={(value) => updateToggle("blc.enabled", value)}>
              <Slider label={t.level} min={0} max={512} step={1} value={config.blc.blackLevel} onChange={(value) => updateNumber("blc.blackLevel", value)} />
            </ControlGroup>

            <ControlGroup title={t.antiAliasing} enabled={config.aaf.enabled} onToggle={(value) => updateToggle("aaf.enabled", value)}>
              <p className="control-note">5x5 Bayer domain filter</p>
            </ControlGroup>

            <ControlGroup title={t.whiteBalance} enabled={config.awb.enabled} onToggle={(value) => updateToggle("awb.enabled", value)}>
              <Slider label="R" min={0.5} max={3} step={0.05} value={config.awb.rGain} onChange={(value) => updateNumber("awb.rGain", value)} />
              <Slider label="G" min={0.5} max={3} step={0.05} value={config.awb.gGain} onChange={(value) => updateNumber("awb.gGain", value)} />
              <Slider label="B" min={0.5} max={3} step={0.05} value={config.awb.bGain} onChange={(value) => updateNumber("awb.bGain", value)} />
            </ControlGroup>

            <ControlGroup title={t.bilateralNoise} enabled={config.bnf.enabled} onToggle={(value) => updateToggle("bnf.enabled", value)}>
              <Slider label={t.strength} min={0} max={1} step={0.05} value={config.bnf.strength} onChange={(value) => updateNumber("bnf.strength", value)} />
            </ControlGroup>

            <ControlGroup title={t.chromaNoise} enabled={config.cnf.enabled} onToggle={(value) => updateToggle("cnf.enabled", value)}>
              <Slider label={t.threshold} min={0} max={600} step={10} value={config.cnf.threshold} onChange={(value) => updateNumber("cnf.threshold", value)} />
              <Slider label={t.strength} min={0} max={1} step={0.05} value={config.cnf.strength} onChange={(value) => updateNumber("cnf.strength", value)} />
            </ControlGroup>

            <ControlGroup title={t.cfa} enabled={config.cfa.enabled} onToggle={(value) => updateToggle("cfa.enabled", value)}>
              <label className="select-row">
                <span>{t.mode}</span>
                <select value={config.cfa.mode} onChange={(event) => updateCfaMode(event.target.value as PipelineConfig["cfa"]["mode"])}>
                  <option value="bilinear">{t.bilinear}</option>
                  <option value="malvar">{t.malvar}</option>
                </select>
              </label>
            </ControlGroup>

            <ControlGroup title={t.ccm} enabled={config.ccm.enabled} onToggle={(value) => updateToggle("ccm.enabled", value)}>
              <div className="matrix-grid" aria-label={t.ccm}>
                {config.ccm.matrix.map((row, rowIndex) =>
                  row.map((value, columnIndex) => (
                    <input
                      key={`${rowIndex}-${columnIndex}`}
                      type="number"
                      min={-2}
                      max={2}
                      step={0.01}
                      value={value}
                      onChange={(event) => updateCcmValue(rowIndex, columnIndex, Number(event.target.value))}
                      aria-label={`${t.ccm} ${rowIndex + 1}-${columnIndex + 1}`}
                    />
                  )),
                )}
              </div>
            </ControlGroup>

            <ControlGroup title={t.gac} enabled={config.gac.enabled} onToggle={(value) => updateToggle("gac.enabled", value)}>
              <Slider label={t.curve} min={0.6} max={3} step={0.05} value={config.gac.gamma} onChange={(value) => updateNumber("gac.gamma", value)} />
            </ControlGroup>

            <ControlGroup title={t.csc} enabled={config.csc.enabled} onToggle={(value) => updateToggle("csc.enabled", value)}>
              <p className="control-note">RGB/YUV matrix preview</p>
            </ControlGroup>

            <ControlGroup title={t.hsc} enabled={config.hsc.enabled} onToggle={(value) => updateToggle("hsc.enabled", value)}>
              <Slider label={t.hue} min={-180} max={180} step={1} value={config.hsc.hue} onChange={(value) => updateNumber("hsc.hue", value)} />
              <Slider label={t.saturation} min={0} max={2} step={0.05} value={config.hsc.saturation} onChange={(value) => updateNumber("hsc.saturation", value)} />
            </ControlGroup>

            <ControlGroup title={t.edge} enabled={config.eeh.enabled} onToggle={(value) => updateToggle("eeh.enabled", value)}>
              <Slider label={t.strength} min={0} max={1.5} step={0.05} value={config.eeh.strength} onChange={(value) => updateNumber("eeh.strength", value)} />
              <Slider label={t.threshold} min={0} max={80} step={1} value={config.eeh.threshold} onChange={(value) => updateNumber("eeh.threshold", value)} />
            </ControlGroup>

            <ControlGroup title={t.falseColor} enabled={config.fcs.enabled} onToggle={(value) => updateToggle("fcs.enabled", value)}>
              <Slider label={t.strength} min={0} max={1} step={0.05} value={config.fcs.strength} onChange={(value) => updateNumber("fcs.strength", value)} />
              <Slider label={t.threshold} min={0} max={80} step={1} value={config.fcs.threshold} onChange={(value) => updateNumber("fcs.threshold", value)} />
            </ControlGroup>

            <ControlGroup title={t.bcc} enabled={config.bcc.enabled} onToggle={(value) => updateToggle("bcc.enabled", value)}>
              <Slider label={t.brightness} min={-80} max={80} step={1} value={config.bcc.brightness} onChange={(value) => updateNumber("bcc.brightness", value)} />
              <Slider label={t.contrast} min={-0.8} max={1.2} step={0.05} value={config.bcc.contrast} onChange={(value) => updateNumber("bcc.contrast", value)} />
            </ControlGroup>

            <ControlGroup title={t.nlm} enabled={config.nlm.enabled} onToggle={(value) => updateToggle("nlm.enabled", value)}>
              <Slider label={t.strength} min={0} max={1} step={0.05} value={config.nlm.strength} onChange={(value) => updateNumber("nlm.strength", value)} />
            </ControlGroup>
          </div>
        </aside>
      </section>
    </main>
  );
}

type ControlGroupProps = {
  title: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  children: ReactNode;
};

function ControlGroup({ title, enabled, onToggle, children }: ControlGroupProps) {
  return (
    <section className="control-group">
      <label className="control-toggle">
        <span>{title}</span>
        <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />
      </label>
      <div className="control-body">{children}</div>
    </section>
  );
}

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output>{value.toFixed(step < 1 ? 2 : 0)}</output>
    </label>
  );
}

function imageFileToRaw(file: File): Promise<RawImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(2, Math.round(image.naturalWidth * scale));
      const height = Math.max(2, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        reject(new Error("Canvas 2D is not available."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const data = new Uint16Array(width * height);

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          const value = getRggbPixelValue(x, y, pixels[offset], pixels[offset + 1], pixels[offset + 2]);
          data[y * width + x] = Math.round((value / 255) * 4095);
        }
      }

      resolve({
        width,
        height,
        bitDepth: 12,
        pattern: "RGGB",
        data,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load image."));
    };

    image.src = url;
  });
}

function getRggbPixelValue(x: number, y: number, r: number, g: number, b: number): number {
  if (y % 2 === 0) {
    return x % 2 === 0 ? r : g;
  }
  return x % 2 === 0 ? g : b;
}
