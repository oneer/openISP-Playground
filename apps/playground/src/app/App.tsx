import { Download, Languages, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ImageCanvas } from "../components/ImageCanvas";
import { runPipeline } from "../isp/pipeline";
import { buildPresetJson, defaultConfig } from "../isp/presets";
import type { PipelineConfig } from "../isp/types";
import { createSyntheticBayerSample } from "../samples/syntheticBayer";

type NumericPath = "blc.blackLevel" | "awb.rGain" | "awb.gGain" | "awb.bGain" | "gamma.gamma";
type TogglePath = "blc.enabled" | "awb.enabled" | "gamma.enabled";
type Language = "en" | "zh";

const pipelineStageLabels = {
  en: ["BLC", "AWB", "Demosaic", "Gamma"],
  zh: ["黑电平", "白平衡", "去马赛克", "Gamma"],
} satisfies Record<Language, string[]>;

const stageNameById: Record<Language, Record<string, string>> = {
  en: {
    bayer: "Bayer Preview",
    demosaic: "Demosaic",
    final: "Final RGB",
  },
  zh: {
    bayer: "Bayer 预览",
    demosaic: "去马赛克",
    final: "最终 RGB",
  },
};

const copy = {
  en: {
    sample: "Synthetic RGGB sample / 128 x 96 / 12-bit",
    reset: "Reset",
    resetTitle: "Reset parameters",
    exportPreset: "Export Preset",
    exportTitle: "Export preset JSON",
    pipeline: "Pipeline",
    preview: "Preview",
    parameters: "Parameters",
    blackLevel: "Black Level",
    level: "Level",
    whiteBalance: "White Balance",
    gamma: "Gamma",
    curve: "Curve",
    language: "Language",
    zoom: "Zoom",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetZoom: "Reset zoom",
  },
  zh: {
    sample: "合成 RGGB 样本 / 128 x 96 / 12-bit",
    reset: "重置",
    resetTitle: "重置参数",
    exportPreset: "导出预设",
    exportTitle: "导出 JSON 预设",
    pipeline: "处理流水线",
    preview: "预览阶段",
    parameters: "参数调节",
    blackLevel: "黑电平",
    level: "电平",
    whiteBalance: "白平衡",
    gamma: "Gamma",
    curve: "曲线",
    language: "语言",
    zoom: "缩放",
    zoomIn: "放大",
    zoomOut: "缩小",
    resetZoom: "重置缩放",
  },
} satisfies Record<Language, Record<string, string>>;

const minZoomScale = 1;
const defaultZoomScale = 5;
const maxZoomScale = 10;

export function App() {
  const [config, setConfig] = useState<PipelineConfig>(defaultConfig);
  const [selectedStageId, setSelectedStageId] = useState("final");
  const [language, setLanguage] = useState<Language>("zh");
  const [zoomScale, setZoomScale] = useState(defaultZoomScale);
  const raw = useMemo(() => createSyntheticBayerSample(), []);
  const result = useMemo(() => runPipeline(raw, config), [raw, config]);
  const selectedStage = result.stages.find((stage) => stage.id === selectedStageId) ?? result.stages.at(-1)!;
  const t = copy[language];
  const stageNames = stageNameById[language];

  function updateNumber(path: NumericPath, value: number) {
    setConfig((current) => {
      const next = structuredClone(current);
      if (path === "blc.blackLevel") {
        next.blc.blackLevel = value;
      } else if (path === "awb.rGain") {
        next.awb.rGain = value;
      } else if (path === "awb.gGain") {
        next.awb.gGain = value;
      } else if (path === "awb.bGain") {
        next.awb.bGain = value;
      } else {
        next.gamma.gamma = value;
      }
      return next;
    });
  }

  function updateToggle(path: TogglePath, value: boolean) {
    setConfig((current) => {
      const next = structuredClone(current);
      if (path === "blc.enabled") {
        next.blc.enabled = value;
      } else if (path === "awb.enabled") {
        next.awb.enabled = value;
      } else {
        next.gamma.enabled = value;
      }
      return next;
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

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-block">
          <h1>openISP Playground</h1>
          <p>{t.sample}</p>
        </div>
        <div className="top-actions">
          <div className="language-switch" aria-label={t.language}>
            <Languages size={17} />
            <button
              type="button"
              className={language === "en" ? "is-active" : ""}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={language === "zh" ? "is-active" : ""}
              onClick={() => setLanguage("zh")}
            >
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
            {pipelineStageLabels[language].map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ol>
          <div className="stage-picker">
            <label htmlFor="stage-select">{t.preview}</label>
            <select
              id="stage-select"
              value={selectedStage.id}
              onChange={(event) => setSelectedStageId(event.target.value)}
            >
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
                <button
                  type="button"
                  onClick={() => updateZoom(-1)}
                  disabled={zoomScale <= minZoomScale}
                  title={t.zoomOut}
                  aria-label={t.zoomOut}
                >
                  <ZoomOut size={16} />
                </button>
                <output>{Math.round(zoomScale * 100)}%</output>
                <button
                  type="button"
                  onClick={() => updateZoom(1)}
                  disabled={zoomScale >= maxZoomScale}
                  title={t.zoomIn}
                  aria-label={t.zoomIn}
                >
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
          <ControlGroup
            title={t.blackLevel}
            enabled={config.blc.enabled}
            onToggle={(value) => updateToggle("blc.enabled", value)}
          >
            <Slider
              label={t.level}
              min={0}
              max={512}
              step={1}
              value={config.blc.blackLevel}
              onChange={(value) => updateNumber("blc.blackLevel", value)}
            />
          </ControlGroup>

          <ControlGroup
            title={t.whiteBalance}
            enabled={config.awb.enabled}
            onToggle={(value) => updateToggle("awb.enabled", value)}
          >
            <Slider
              label="R"
              min={0.5}
              max={3}
              step={0.05}
              value={config.awb.rGain}
              onChange={(value) => updateNumber("awb.rGain", value)}
            />
            <Slider
              label="G"
              min={0.5}
              max={3}
              step={0.05}
              value={config.awb.gGain}
              onChange={(value) => updateNumber("awb.gGain", value)}
            />
            <Slider
              label="B"
              min={0.5}
              max={3}
              step={0.05}
              value={config.awb.bGain}
              onChange={(value) => updateNumber("awb.bGain", value)}
            />
          </ControlGroup>

          <ControlGroup
            title={t.gamma}
            enabled={config.gamma.enabled}
            onToggle={(value) => updateToggle("gamma.enabled", value)}
          >
            <Slider
              label={t.curve}
              min={0.6}
              max={3}
              step={0.05}
              value={config.gamma.gamma}
              onChange={(value) => updateNumber("gamma.gamma", value)}
            />
          </ControlGroup>
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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value.toFixed(step < 1 ? 2 : 0)}</output>
    </label>
  );
}
