import { Download, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ImageCanvas } from "../components/ImageCanvas";
import { runPipeline } from "../isp/pipeline";
import { buildPresetJson, defaultConfig } from "../isp/presets";
import type { PipelineConfig } from "../isp/types";
import { createSyntheticBayerSample } from "../samples/syntheticBayer";

type NumericPath = "blc.blackLevel" | "awb.rGain" | "awb.gGain" | "awb.bGain" | "gamma.gamma";
type TogglePath = "blc.enabled" | "awb.enabled" | "gamma.enabled";

const stageLabels = ["BLC", "AWB", "Demosaic", "Gamma"];

export function App() {
  const [config, setConfig] = useState<PipelineConfig>(defaultConfig);
  const [selectedStageId, setSelectedStageId] = useState("final");
  const raw = useMemo(() => createSyntheticBayerSample(), []);
  const result = useMemo(() => runPipeline(raw, config), [raw, config]);
  const selectedStage = result.stages.find((stage) => stage.id === selectedStageId) ?? result.stages.at(-1)!;

  function updateNumber(path: NumericPath, value: number) {
    setConfig((current) => {
      const next = structuredClone(current);
      const [group, key] = path.split(".") as [keyof PipelineConfig, string];
      (next[group] as Record<string, number>)[key] = value;
      return next;
    });
  }

  function updateToggle(path: TogglePath, value: boolean) {
    setConfig((current) => {
      const next = structuredClone(current);
      const [group, key] = path.split(".") as [keyof PipelineConfig, string];
      (next[group] as Record<string, boolean>)[key] = value;
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

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <h1>openISP Playground</h1>
          <p>Synthetic RGGB sample · 128 x 96 · 12-bit</p>
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => setConfig(defaultConfig)} title="Reset parameters">
            <RotateCcw size={18} />
            Reset
          </button>
          <button type="button" onClick={exportPreset} title="Export preset JSON">
            <Download size={18} />
            Export Preset
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="pipeline-panel" aria-label="Pipeline stages">
          <h2>Pipeline</h2>
          <ol>
            {stageLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ol>
          <div className="stage-picker">
            <label htmlFor="stage-select">Preview</label>
            <select
              id="stage-select"
              value={selectedStage.id}
              onChange={(event) => setSelectedStageId(event.target.value)}
            >
              {result.stages.map((stage) => (
                <option value={stage.id} key={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <section className="viewer-panel" aria-label="Image preview">
          <div className="viewer-header">
            <h2>{selectedStage.label}</h2>
            <span>{selectedStage.domain.toUpperCase()}</span>
          </div>
          <div className="canvas-frame">
            <ImageCanvas image={selectedStage.preview} />
          </div>
        </section>

        <aside className="parameter-panel" aria-label="ISP parameters">
          <h2>Parameters</h2>
          <ControlGroup
            title="Black Level"
            enabled={config.blc.enabled}
            onToggle={(value) => updateToggle("blc.enabled", value)}
          >
            <Slider
              label="Level"
              min={0}
              max={512}
              step={1}
              value={config.blc.blackLevel}
              onChange={(value) => updateNumber("blc.blackLevel", value)}
            />
          </ControlGroup>

          <ControlGroup
            title="White Balance"
            enabled={config.awb.enabled}
            onToggle={(value) => updateToggle("awb.enabled", value)}
          >
            <Slider label="R" min={0.5} max={3} step={0.05} value={config.awb.rGain} onChange={(value) => updateNumber("awb.rGain", value)} />
            <Slider label="G" min={0.5} max={3} step={0.05} value={config.awb.gGain} onChange={(value) => updateNumber("awb.gGain", value)} />
            <Slider label="B" min={0.5} max={3} step={0.05} value={config.awb.bGain} onChange={(value) => updateNumber("awb.bGain", value)} />
          </ControlGroup>

          <ControlGroup
            title="Gamma"
            enabled={config.gamma.enabled}
            onToggle={(value) => updateToggle("gamma.enabled", value)}
          >
            <Slider
              label="Curve"
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
  children: React.ReactNode;
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
