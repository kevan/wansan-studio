### 📂 文档一：Project Wansan 落地页开发规格书 (Master Spec)

**项目名称**: Project Wansan (万三)
**版本**: v1.0 Release Candidate
**目标**: 构建一个高转化率、极致极客风的单页落地页。

---

#### 1. 设计系统 (Design System)

*   **色彩主题 (Color Palette)**:
    *   `Background`: `#0F1115` (深黑曜石，接近纯黑但有质感)
    *   `Surface`: `#171D20` (卡片、导航栏背景)
    *   `Primary`: `#19B768` (万三绿，用于 CTA、高亮、数据流)
    *   `Text-Main`: `#FFFFFF`
    *   `Text-Muted`: `#8899A6`
*   **字体 (Typography)**:
    *   `Font-Family`: 'Inter', sans-serif (Google Fonts)
    *   `Headings`: Bold / ExtraBold, tight tracking.
*   **视觉风格 (Visual Style)**:
    *   **Glassmorphism**: 极其微弱的磨砂玻璃效果 (Backdrop blur).
    *   **Glow**: 霓虹绿色的弥散光晕，模拟“能量核心”。
    *   **Borders**: 极细的 `1px` 边框，颜色为 `white/10` 或 `white/5`。

---

#### 2. 页面结构与文案 (Structure & Copy)

**A. 导航栏 (Navbar)**
*   **Left**: Logo (SVG 图标) + 文字 "Wansan"。
*   **Right**: 链接 [原理, 安全, 定价] + 按钮 [Get Early Access]。
*   **Effect**: 固定在顶部，背景半透明模糊。

**B. 首屏 (Hero Section)**
*   **Badge**: 胶囊状标签 "Local-First BI Tool" (带呼吸灯效果)。
*   **H1**: "云端喧嚣时代的<br>静默异类。" (强调“静默异类”带绿色辉光)。
*   **H2**: "当全世界都在索取你的数据，Wansan 选择把自己关进黑盒。一款拒绝上传、拒绝联网、拒绝窥探的本地 BI 工具。"
*   **CTA Buttons**:
    1.  Primary: "一次付费，终身拥有" (附注: 不搞订阅制 · BYOK)。
    2.  Secondary: "观看演示" (带播放图标)。

**C. 核心原理 (How it Works - The Visual)**
*   **Layout**: 居中大卡片。
*   **Visual**: 使用 CSS/SVG 复刻“漫画概念”：
    *   左侧：本地堡垒（实心数据块撞墙）。
    *   中间：绿色光墙（过滤器）。
    *   右侧：云端（虚线空壳 Schema 飞出）。
*   **Caption**: "逻辑穿墙而过，数据深锁本地。"

**D. 价值主张 (Features Grid)**
*   三列布局：
    1.  **Privacy**: "DuckDB Local Engine" - 数据在本地闭环。
    2.  **Speed**: "Zero Latency" - 没有网络延迟，秒级响应。
    3.  **Ownership**: "Export as PDF" - 生成 A4 报告，即刻打印。

**E. 定价 (Pricing - The Lifetime Deal)**
*   **Card Style**: 像一张黑金会员卡。
*   **Header**: "Pay Once. Own Forever."
*   **Price**: "$99" (或早鸟价)。
*   **List**:
    *   ✅ Unlimited Projects
    *   ✅ Full SQL Editor
    *   🔑 **Bring Your Own Key** (Zero Markup on AI)

**F. 页脚 (Footer)**
*   简单的版权信息，"Built for Privacy."

---

### 🤖 文档二：给 Code Agent 的指令 (Prompt)

如果您将此任务委派给 AI 工程师 (Code Agent)，请复制以下指令：

```markdown
# Role
You are a Senior Frontend Developer specializing in Tailwind CSS and conversion-focused Landing Pages.

# Task
Build a single-file `index.html` for "Project Wansan" based on the provided Master Spec.

# Tech Stack
- HTML5
- Tailwind CSS (Use CDN: `https://cdn.tailwindcss.com`)
- Font: Inter (Google Fonts)
- Icons: SVG (Inline)

# Requirements
1. **Visual Fidelity**: Strictly follow the "Obsidian" color palette (#0F1115 bg). Implement subtle green glows (#19B768) behind the Hero text and CTA buttons.
2. **Hero Section**: Implement the H1 and H2 copy exactly as specified. The "Local-First" badge must have a pulsing animation.
3. **The Diagram**: Create a CSS/HTML representation of the "Data Fortress" concept. Use a flexbox layout to show [Local Box] -> [Wall] -> [Cloud]. Use simple geometric shapes (divs with borders) to represent "Solid Data" (Left) vs "Ghost Schema" (Right).
4. **Pricing Section**: Design a premium-looking "Lifetime Deal" card. It should look like a physical black metal card.
5. **Responsiveness**: Ensure the layout stacks correctly on mobile.
6. **Code Quality**: Clean, semantic HTML. No external CSS/JS files (keep it single-file).

# Output
Provide the complete, runnable `index.html` code.
```
