# 🎨 Wansan (万三) - UI/UX Interaction Design Specification

> **Design Philosophy**:
> 1.  **Zero Latency**: 操作必须跟手，动画必须流畅。
> 2.  **Data First**: 内容（报表/图表）是主角，UI 控件是配角。
> 3.  **Trust**: 每一步都要让用户感到安全、可控。

---

## 1. 全局布局 (Global Layout)

采用经典的 **"Sidebar + Canvas"** 双栏布局，但在细节上做极致减法。

### 1.1 The Sidebar (左侧栏 - 260px, Fixed)
*   **背景色**: `bg-zinc-50` (Light Mode) / `bg-zinc-900` (Dark Mode)。
*   **顶部**: **Logo 区** ("Wansan" + 貔貅/聚宝盆 Icon) + **[+ 新建分析]** 按钮 (Primary Button)。
*   **中段**: **History List (会话历史)**。
    *   按时间分组：Today, Yesterday, Last 7 Days。
    *   Item 样式：选中时高亮 (`bg-white` + `shadow-sm`)，Hover 时显示 `Delete` 图标。
*   **底部**: **User & Settings**。
    *   User Profile (Avatar + Name)。
    *   Usage Quota (Progress Bar: "3/5 Free Queries").
    *   Settings Icon (Gear).

### 1.2 The Main Canvas (主画布 - Flex-1)
*   **背景色**: `bg-white` (Light) / `bg-black` (Dark)。
*   **结构**: 上下结构。
    *   **Header**: 面包屑导航 (Home / Q1 Sales Analysis) + [Export PDF] 按钮。
    *   **Scroll Area**: 核心内容区，包含“上传卡片”、“对话流”、“报表卡片”。
    *   **Input Bar**: 固定在底部的对话输入框。

---

## 2. 核心交互流程 (Core User Journeys)

### Journey A: The "Drop & Trust" (文件导入与确认)

这是用户的第一印象，必须极其顺滑。

#### Step 1: The Empty State (空态)
*   屏幕中央显示一个巨大的、带有虚线边框的 **Drop Zone**。
*   **文案**: "Drag Excel/CSV files here to unlock insights."
*   **微交互**: 拖拽文件进入窗口时，虚线框变成实线蓝色 (`border-blue-500`)，背景轻微变色。

#### Step 2: The Parsing (解析中)
*   文件松手后，Drop Zone 消失。
*   出现一个 **Processing Card**：
    *   Icon: Excel 图标在跳动。
    *   Text: "Cleaning merged cells... (1,240 rows)" —— *显示具体行数能减少等待焦虑*。
    *   Progress: 真实的进度条（基于文件流读取进度）。

#### Step 3: The Trust Check (Schema 确认 - 关键交互!)
*   解析完成后，弹出一个 **Schema Confirmation Modal** (或侧滑抽屉)。
*   **UI 结构 (TanStack Table)**:
    *   Header: "我们检测到以下字段，请确认语义："
    *   Table Rows:
        *   `Column Name`: **"下单时间"**
        *   `Preview`: "2023-10-01"
        *   `Semantic Type` (Dropdown): **[ 📅 Date ]** (AI 自动选中，用户可改为 Text/ID)。
*   **Action**: 底部一个巨大的绿色按钮 **[ Confirm & Start Analysis ]**。

---

### Journey B: The "Magic Chat" (对话与生成)

#### Step 1: Input (输入)
*   底部输入框 (`Cmd+K` 激活)。
*   **Autocomplete**: 用户输入 "@" 或 "按"，弹出一个 **Tag Menu**，列出所有确认过的字段名（如 `[销售额]`, `[省份]`）。用户选择后，Tag 变为高亮胶囊。
*   **Send**: `Enter` 发送。

#### Step 2: Thinking (生成中)
*   界面滚动到底部。
*   出现一个新的 **Report Card (骨架屏)**。
*   **Status Text**:
    *   "Thinking..." (调用 GPT)
    *   "Writing SQL..." (获得 JSON)
    *   "Crunching numbers..." (DuckDB 执行)
    *   "Drawing chart..." (渲染)

#### Step 3: Result Card (报表卡片)
每个回答不是一段文字，而是一个独立的 **Interactive Card**。

*   **Card Header**:
    *   Title: "各省份销售额排名 (Top 10)" (AI 生成)。
    *   Toolbar: [Copy SQL] [Edit Chart Type] [Download CSV]。
*   **Card Body**:
    *   **Summary**: 一句加粗的洞察 ("江苏省贡献了 30% 的销售额，遥遥领先")。
    *   **Chart**: ECharts 柱状图，支持鼠标 Hover 显示 Tooltip。
*   **Card Footer**: "Based on 12,000 rows. Generated in 0.4s."

---

### Journey C: The "Self-Correction" (如果出错了)

永远不要直接报错说 "Error"。

*   **UI**: 卡片显示为浅红色背景。
*   **Icon**: 一个修好的扳手。
*   **Text**:
    *   "The first attempt failed (Ambiguous column 'Date')."
    *   "**Auto-correcting...** I'm trying again by casting the column to Date type."
*   **Result**: 如果第二次成功了，显示成功卡片，并在角落打个 ✅ 标记 ("Auto-fixed")。

---

## 3. 视觉规范 (Visual System)

### 3.1 Typography (字体)
*   **Font Family**: `Inter`, `system-ui`, `-apple-system`.
*   **Monospace** (for SQL/Code): `JetBrains Mono`, `Fira Code`.

### 3.2 Color Palette (ShadcnUI - Zinc)
*   **Primary**: Black (`#18181B`) —— 用于按钮、高亮。
*   **Secondary**: Zinc-100 (`#F4F4F5`) —— 用于背景、卡片。
*   **Accent**: Indigo-600 (`#4F46E5`) —— 用于图表主色、Loading 态。
*   **Semantic**:
    *   Green: Emerald-600 (Success, Money).
    *   Red: Rose-600 (Error, Decline).

### 3.3 Components (基于 ShadcnUI)
*   **Button**: 圆角 `rounded-md`，高度 `h-9` (Compact)。
*   **Card**: 边框 `border-zinc-200`，阴影 `shadow-sm`。
*   **Table**: 紧凑型，表头 `bg-zinc-50`，字体 `text-sm`。

---

## 4. 动画设计 (Motion)

*   **Page Transition**: 无（SPA 瞬间切换）。
*   **Card Entry**: `y: 20px` -> `y: 0`, `opacity: 0` -> `1` (Spring Physics).
*   **Chart Reveal**: 柱状图从底部升起，折线图从左向右绘制。

---

## 5. 总结

这就不仅仅是一个“工具”了，这是一种**体验**。
用户会感觉自己在和一个**专业的、懂数据的、且守口如瓶的私人助理**合作。
