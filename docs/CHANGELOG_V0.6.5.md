# CHANGELOG V0.6.5 (2026-01-19)

## 🚀 核心更新 (Core Features)
- **智能过滤器自动修复增强**: 优化了 `fixSQL` 逻辑，优先保护带占位符的模板 SQL，并在修复后自动回填参数，确保分析连续性。
- **AI 引擎配置预检**: 在触发“智能建模”前增加 API 配置验证，避免因配置缺失导致的空弹窗，并提供快速设置引导。
- **UI 状态持久化**: 新增 `sidebarMode` 和 `activeView` 的本地持久化，确保应用重启后能恢复之前的视图上下文。

## 🎨 UI & 交互优化 (UI/UX Refinements)
- **AI 模型校验反馈**: 优化设置页面模型选择框，增加模型缺失或供应商不匹配时的红色警示及中文提示。
- **Monaco 编辑器主题定制**: 为 `CodeEditor` 定义了 `wansan-light/dark` 主题，应用更柔和的当前行高亮色，并精简了边栏显示。
- **指标编辑器布局优化**: 将“AI Magic”按钮移至标签区域，解决了在小窗口下与滚动条重叠的问题。
- **清爽模式适配**: 在指标编辑器等小型弹出层中自动禁用 `minimap` 和 `stickyScroll`。

## 🔧 稳定性 & 修复 (Stability & Fixes)
- **修复 ReferenceError**: 彻底解决 DashboardHeader 中因解构逻辑导致的 `canvasConfig` 未定义崩溃问题。
- **Lint 零错误达成**: 修复了 React Hooks 调用规则违规、未使用变量及多处正则转义误报。
- **事件系统修正**: 修复了“设置”按钮点击无效的问题，确保全局事件派发目标一致。
- **Markdown 渲染优化**: 将 `@ts-ignore` 替换为规范的 `@ts-expect-error` 并补全描述，提升类型安全性。

## 📦 开发者相关 (Dev Context)
- 引入 `mapFileToSchema` 统一处理 Schema 转换与 Masking 逻辑。
- 优化 `useChatStore` 性能，通过 `memo` 减少重型图表组件的重复渲染。
