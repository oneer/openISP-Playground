# openISP Playground

基于浏览器的 ISP（图像信号处理器）交互式演示，用于学习、调节和可视化 RAW 到 RGB 的图像处理流水线。无需安装 — 打开网页即可探索。

[English](README.md)

## 概述

openISP Playground 使用 Canvas 2D 在浏览器中直接运行 ISP 处理流水线。通过滑块调节参数、查看中间处理阶段，并实时观察输出变化。处理流水线的算法参考了 [cruxopen/openISP](https://github.com/cruxopen/openISP) 并移植为 TypeScript 实现。

### 处理流水线

**Bayer 输入 → 黑电平校正 → 白平衡 → 去马赛克 → 色彩矩阵 → Gamma → RGB 预览**

| 阶段 | 说明 |
|------|------|
| BLC（黑电平校正） | 减去传感器黑电平偏移 |
| AWB（自动白平衡） | 对各通道应用 RGB 增益 |
| 去马赛克（双线性） | 从 Bayer CFA 重建全彩 RGB |
| CCM（色彩校正矩阵） | 应用 3×3 色彩变换 |
| Gamma | 应用幂律 Gamma 编码 |

### 功能

- 交互式参数滑块，实时预览
- 流水线阶段查看（Bayer、去马赛克、色彩矩阵、最终 RGB）
- 独立开关各个处理阶段
- 导出预设为 JSON
- 中英文双语界面
- 缩放控件，支持像素级查看
- 内置合成 RGGB 样本图像（128×96，12-bit）

## 技术栈

| 层级 | 选择 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite |
| 样式 | 纯 CSS |
| 渲染 | Canvas 2D |
| 测试 | Vitest |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm run test
```

开发服务器默认在 `http://localhost:5173` 启动。

## 项目结构

```
apps/playground/
  src/
    app/          应用主体和布局
    components/   图像画布组件
    isp/          处理流水线、类型定义、预设
    samples/      合成 Bayer 样本生成器
third_party/      openISP 子模块（参考实现）
```

## 许可证

MIT © 2026 万一

上游归属声明请参阅 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
