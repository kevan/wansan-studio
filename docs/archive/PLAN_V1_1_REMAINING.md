# 📅 Wansan Studio v1.1.0 (Phase 2): The Polish & Power Update

> **Status**: Session Architecture ✅ Done.
> **Focus**: Closing the loop on Dashboard usability and adding the "Killer Feature" (Web Export).

## 1. 🖼️ Dashboard Polish (看板完善)

目前 Session 只有空壳，我们需要让看板具备生产力。

### Task A: Title as Widget (Priority: High)
**现状**: 导出 PDF 没有标题，且 Header 栏功能混杂。
**方案**:
1.  **Remove**: 从 `DashboardHeader` 移除 Title Input。
2.  **Add**: 实现 `TextWidget` (Markdown 支持)。
3.  **Init**: `createSession` 时默认在 `(0,0)` 插入一个 H1 标题组件。
    **价值**: 解决 WYSIWYG 导出问题，为 Rich Text 铺路。

### Task B: Canvas Interaction Fixes (Priority: Medium)
**现状**: 缩放溢出 (Zoom Overflow) 问题虽然有临时解，但需彻底验证。
**方案**: 确认 `transform-origin: top left` 方案在多页模式下的表现。

---

## 2. ⚡ Productivity Features (生产力增强)

### Task C: Data Replace (Priority: High)
**现状**: 数据更新只能删了重传。
**方案**:
1.  在 Sidebar 的 "Data Assets" 视图增加右键菜单 "Replace Source"。
2.  实现 DuckDB 重新加载逻辑 (Keep Table Name, Swap File)。
3.  前端触发 `Refresh` 事件，重绘所有图表。
    **价值**: 解决“周期性报表”痛点。

---

## 3. ✨ The Killer Feature: AI Web Export

### Task D: "Skeleton Injection" Web Export (Priority: High)
**现状**: 只能导出死板图片。
**方案**:
1.  **Prompt**: 发送 Widget Metadata (无数据) 给 AI，要求生成 HTML 模版。
2.  **Inject**: 本地 Electron 替换 `{{DATA}}` 占位符。
3.  **Output**: 生成单文件 HTML。
    **价值**: 降维打击竞品，极致的隐私保护。
