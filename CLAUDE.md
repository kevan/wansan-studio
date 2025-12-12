# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Wansan Studio (万三) 是一款本地优先的智能商业报表桌面端软件，使用 Electron + React + TypeScript 技术栈开发。项目核心理念是"数据聚宝，日进斗金"，专注于保护数据隐私的同时提供强大的商业智能分析能力。

## 开发命令

```bash
# 开发模式 - 同时启动 Vite 和 Electron
npm run dev

# 构建应用
npm run build

# 打包应用
npm run dist

# 代码质量检查
npm run lint          # ESLint 检查
npm run lint:fix      # 自动修复 ESLint 问题
npm run format        # Prettier 格式化
npm run type-check    # TypeScript 类型检查

# 测试
npm test              # 运行所有测试
npx vitest run src/renderer/stores/useSettingsStore.test.ts  # 运行特定测试
```

## 架构概览

### 进程架构
- **主进程** (`src/main/`)：Electron 主进程，负责窗口管理、数据库服务、AI 引擎
- **渲染进程** (`src/renderer/`)：React 应用，用户界面和交互逻辑
- **预加载脚本** (`src/preload/`)：IPC 通信桥梁，确保安全的数据传输

### 核心模块
1. **数据库服务** (`src/main/database/`)：DuckDB 集成，处理数据导入和查询
2. **AI 引擎** (`src/main/engine/`)：OpenAI GPT-4o-mini 集成，自然语言到 SQL 转换
3. **数据处理** (`src/renderer/components/data/`): 文件上传、数据预览、表格处理
4. **可视化** (`src/renderer/components/report/`)：ECharts 图表渲染和报表生成
5. **状态管理** (`src/renderer/stores/`)：Zustand 管理本地状态，TanStack Query 管理服务器状态

### 数据流
```
文件上传 → DuckDB 处理 → 模式推断 → AI 分析 → 可视化展示
用户输入 → AI 服务 → SQL 生成 → DuckDB 执行 → 结果展示
```

### 技术栈
- **前端框架**: React 18 + Vite + TypeScript
- **UI 组件**: Tailwind CSS + Radix UI + ShadcnUI
- **数据处理**: TanStack Table v8 + DuckDB
- **状态管理**: Zustand + TanStack Query v5
- **可视化**: ECharts + React Grid Layout
- **构建工具**: Vite (渲染进程) + tsup (主进程)

### 路径别名
- `@/*` → `src/renderer/*`
- `@shared/*` → `src/shared/*`
- `@types/*` → `src/types/*`

### 国际化
支持中英文切换，语言文件位于 `src/renderer/locales/` 目录

## 开发注意事项

1. **本地优先原则**: 所有数据处理应在本地完成，保护用户数据隐私
2. **类型安全**: 严格使用 TypeScript，共享类型定义在 `src/shared/types.ts`
3. **IPC 通信**: 所有主进程通信必须通过预加载脚本暴露的 API
4. **状态管理**: 本地状态使用 Zustand，远程数据使用 TanStack Query
5. **错误处理**: 完善的错误边界和用户友好的错误提示
6. **性能优化**: 使用 React.memo、useMemo 等优化渲染性能
7. **测试覆盖**: 关键业务逻辑需要编写测试用例