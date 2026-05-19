# openISP Playground

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

基于浏览器的 ISP（图像信号处理器）交互式工具，用于学习、调节和可视化 RAW 到 RGB 的图像处理流水线。完全在浏览器中运行 — 无需后端，无需安装。

[English](README.md)

## 处理流水线

```
Bayer RAW → DPC → BLC → AAF → AWB → BNF → CNF → CFA → CCM → GAC → CSC → HSC → EEH → FCS → BCC → NLM → RGB 输出
```

每个阶段都会生成预览图像，可在 UI 中选择查看。参数通过滑块和数值输入实时调节，处理结果通过 Canvas 2D 即时呈现。

### 各阶段说明

| 阶段 | 数据域 | 说明 |
|------|--------|------|
| DPC（坏点校正） | Bayer | 通过 3×3 邻域比较检测并修正孤立坏点像素 |
| BLC（黑电平校正） | Bayer | 减去每个像素的光学黑电平偏移，设定真实的零值基准 |
| AAF（抗混叠滤波） | Bayer | 使用 5×5 低通滤波器抑制插值前的混叠伪影 |
| AWB（白平衡） | Bayer | 对 R/G/B 各通道应用独立增益，补偿光源色温差异 |
| BNF（双边降噪） | Bayer | 基于双边核的范围加权空间去噪，保持边缘 |
| CNF（色噪过滤） | Bayer | 通过限制 R/B 通道与绿色均值的偏差来抑制色度噪声 |
| CFA（去马赛克） | Bayer → RGB | 使用双线性或 Malvar-He-Cutler 算法重建每个像素的完整 RGB |
| CCM（色彩校正矩阵） | RGB | 通过 3×3 矩阵乘法将传感器 RGB 转换到目标色彩空间 |
| GAC（Gamma 校正） | RGB | 应用幂律编码（V<sub>out</sub> = V<sub>in</sub><sup>1/γ</sup>），生成适合显示的图像 |
| CSC（色彩空间转换） | RGB | 在 RGB 与 YUV 色彩空间之间转换，为后续处理做准备 |
| HSC（色相饱和度控制） | RGB | 在 YUV 域中旋转色相角度并缩放饱和度 |
| EEH（边缘增强） | RGB | 基于拉普拉斯算子的边缘锐化，可调节强度与阈值 |
| FCS（伪彩抑制） | RGB | 在检测到的边缘区域衰减色度，减少色彩伪影 |
| BCC（亮度对比度控制） | RGB | 以中灰为基准的全局亮度偏移与对比度缩放 |
| NLM（非局部均值降噪） | RGB | 基于 3×3 搜索窗口的块相似度去噪，使用亮度加权 |

## 功能特性

- **15 阶段 ISP 流水线**，所有参数均可调节
- **双去马赛克模式** — 双线性（快速）与 Malvar-He-Cutler（高质量）
- **导入 JPEG/PNG 图像**，将其模拟为 Bayer RAW 输入
- **缩放与拖拽** — 预览可放大至 1000%，支持指针拖拽平移
- **双语界面** — 中英文即时切换
- **预览缓存** — 参数未变化时避免重复计算
- **JSON 导出** — 将完整配置序列化为可分享的预设文件
- **内置合成测试图像**（256×192，12-bit RGGB），包含色块、渐变和频率图案

## 架构

```
┌─────────────┐    ┌──────────────────┐    ┌────────────┐
│  参数面板    │───▶│  runPipeline()   │───▶│  Stages[]  │
│  (React)    │    │  (纯函数)         │    │  → Canvas  │
└─────────────┘    └──────────────────┘    └────────────┘
```

流水线执行是一个纯 TypeScript 函数，接收 `RawImage` 和 `PipelineConfig`，返回包含最终 RGB 图像及中间阶段预览的 `PipelineResult`。Bayer 阶段的预览会被缓存以避免重复计算。处理在主线程同步执行，对于中等分辨率图像速度足够快。

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

## 预设格式

配置可导出为 JSON，方便保存和分享：

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

可通过 UI 中的 **导出预设** 按钮导出，或通过 `buildPresetJson()` 接口编程生成。

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript 5.9 |
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
│   ├── app/
│   │   ├── App.tsx              # 应用主体、布局、国际化、状态管理
│   │   └── app.css              # 响应式布局与组件样式
│   ├── components/
│   │   └── ImageCanvas.tsx      # Canvas 2D 渲染器，支持缩放与拖拽平移
│   ├── isp/
│   │   ├── pipeline.ts          # 15 阶段流水线执行器及各阶段算法
│   │   ├── types.ts             # 共享类型定义
│   │   ├── presets.ts           # 默认配置和 JSON 序列化
│   │   └── pipeline.test.ts     # 流水线正确性测试
│   └── samples/
│       └── syntheticBayer.ts    # 程序化 RGGB 测试图像，包含色块和多频图案
├── third_party/openISP/         # C++ 参考实现（Git 子模块）
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

## 许可证

MIT © 2026 万一

本项目算法参考自 [cruxopen/openISP](https://github.com/cruxopen/openISP)。上游归属声明详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
