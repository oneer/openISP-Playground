# openISP Playground

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

基于浏览器的 ISP（图像信号处理器）交互式工具，用于学习、调节和可视化 RAW 到 RGB 的图像处理流水线。完全在浏览器中运行 — 无需后端，无需安装。

[English](README.md)

## 处理流水线

```
Bayer RAW → BLC（黑电平校正）→ AWB（白平衡）→ 去马赛克 → CCM（色彩矩阵）→ Gamma → RGB 输出
```

每个阶段都会生成预览图像，可在 UI 中选择查看。参数通过滑块和数值输入实时调节，处理结果通过 Canvas 2D 即时呈现。

### 各阶段说明

| 阶段 | 数据域 | 说明 |
|------|--------|------|
| BLC（黑电平校正） | Bayer | 减去每个像素的光学黑电平偏移，设定真实的零值基准 |
| AWB（白平衡） | Bayer | 对 R/G/B 各通道应用独立增益，补偿光源色温差异 |
| 去马赛克 | Bayer → RGB | 使用 3×3 邻域双线性插值，从 Bayer CFA 重建每个像素的完整 RGB |
| CCM（色彩校正矩阵） | RGB | 通过 3×3 矩阵乘法将传感器 RGB 转换到目标色彩空间 |
| Gamma | RGB | 应用幂律编码（V<sub>out</sub> = V<sub>in</sub><sup>1/γ</sup>），生成适合显示的图像 |

## 架构

```
┌─────────────┐    ┌──────────────────┐    ┌────────────┐
│  参数面板    │───▶│  runPipeline()   │───▶│  Stages[]  │
│  (React)    │    │  (纯函数)         │    │  → Canvas  │
└─────────────┘    └──────────────────┘    └────────────┘
```

流水线执行是一个纯 TypeScript 函数，接收 `RawImage` 和 `PipelineConfig`，返回包含最终 RGB 图像及中间阶段预览的 `PipelineResult`。目前处理在主线程同步执行，128×96 的内置样本图像可在瞬间完成处理。

### 核心类型

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

## 预设格式

配置可导出为 JSON，方便保存和分享：

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

可通过 UI 中的 **导出预设** 按钮导出，或通过 `buildPresetJson()` 接口编程生成。

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript 5 |
| 打包 | Vite 7 |
| 渲染 | Canvas 2D |
| 图标 | Lucide React |
| 测试 | Vitest |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（监听 0.0.0.0）
npm run dev

# 生产构建
npm run build

# 运行测试
npm run test
```

## 项目结构

```
openISP Playground/
├── apps/playground/src/
│   ├── app/App.tsx            # 应用主体、布局、国际化
│   ├── components/
│   │   └── ImageCanvas.tsx    # Canvas 2D 图像渲染组件
│   ├── isp/
│   │   ├── pipeline.ts        # 流水线执行器及各阶段算法
│   │   ├── types.ts           # 共享类型定义
│   │   └── presets.ts         # 默认配置和序列化
│   └── samples/
│       └── syntheticBayer.ts  # 程序化 RGGB 测试图像生成器
├── third_party/openISP/       # 参考实现（Git 子模块）
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

## 许可证

MIT © 2026 万一

本项目算法参考自 [cruxopen/openISP](https://github.com/cruxopen/openISP)。上游归属声明详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
