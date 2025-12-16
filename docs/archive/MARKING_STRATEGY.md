### 📂 Wansan Studio: 战略与架构对齐文档 (Strategy & Architecture Alignment Doc)

**To:** Lead Architect / Dev Team
**From:** CMO & Product Strategy
**Date:** 2024-10-26
**Subject:** 品牌重塑、核心价值主张与落地页技术规格

---

### 1. 愿景综述 (Executive Summary)

**Wansan Studio (万三)** 的市场定位已从“另一个 AI BI 工具”升级为 **“反云端 (Anti-Cloud) 的隐私堡垒”**。

我们不与 Tableau 比功能，也不与 ChatGPT 比算力。我们的核心护城河是 **架构级的隐私保护 (Architectural Privacy)**。
*   **核心叙事**: "云端喧嚣时代的静默异类。"
*   **商业模式**: 买断制 (Lifetime License) + BYOK (Bring Your Own Key)。

---

### 2. 品牌识别系统 (Brand Identity)

本部分规定了产品的 UI/UX 设计语言，请开发团队在前端实现时严格遵守。

#### 2.1 视觉核心 (Visual Core)
*   **Logo**: **全黑曜石三角 (The Obsidian Monolith)**。
    *   *隐喻*: 坚固、封闭、黑盒。
    *   *形态*: 黑色锐利几何体，内部透出微弱绿光（代表核心算力）。
*   **配色方案 (Color Palette)**:
    *   🌑 **Obsidian Black (主色)**: `#0F1115` (用于背景，营造沉浸感)
    *   🌑 **Secondary Dark (辅色)**: `#171D20` (用于卡片/容器)
    *   🟢 **Wansan Green (强调色)**: `#19B768` (用于 CTA 按钮、数据流、高亮文本)
    *   ⚪ **Text White**: `#FFFFFF` (主标题)
    *   🔘 **Tech Gray**: `#8899A6` (副文本/说明)

#### 2.2 交互隐喻 (UI Metaphor)
*   **"The Fortress" (堡垒)**: UI 应尽量减少“云端同步中”的 Loading 状态，强调“本地即时响应”。
*   **"The Ghost" (幽灵)**: 在数据传输的 Loading 动画中，**严禁**显示文件飞向云端的动画。应设计为“虚线框/结构图”飞出，实体文件图标保留在本地。

---

### 3. 核心机制与架构隐喻 (Core Mechanism)

这是我们向用户解释 "How it Works" 的统一口径，需反映在产品逻辑和文案中。

*   **Slogan**: **"逻辑穿墙而过，数据深锁本地。"** (Logic passes through, data stays locked locally.)
*   **技术解释**:
    1.  **Local Land**: 用户的 Excel/CSV 文件被加载到本地 **DuckDB** 实例。
    2.  **The Filter**: 系统仅提取 `Schema` (Column Names, Types) 生成 Prompt。
    3.  **Cloud Sky**: OpenAI 返回 SQL Query。
    4.  **Execution**: SQL 在本地 DuckDB 执行，生成图表。

**对架构师的需求**:
*   请确保在“网络请求日志”中，用户能清晰看到只有 Schema 被发送（以备极客用户审计）。
*   考虑增加一个 "Privacy Audit Mode" (隐私审计模式) 开关，打开后显示发送给 LLM 的原始 Prompt，增加信任感。

---

### 4. 商业模式与鉴权 (Business & Auth)

基于 **"Pay Once, Own Forever"** 的策略，后端需求变更如下：

*   **去账号化 (No User Accounts)**: 不需要复杂的云端用户管理系统。
*   **License Key 验证**:
    *   我们需要一个轻量级的 License 验证服务（验证是否购买）。
    *   验证通过后，软件应在本地离线运行（或定期联网校验）。
*   **BYOK 存储**:
    *   用户的 OpenAI API Key 必须 **加密存储在本地** (Local Storage / Keychain)，严禁上传至我方服务器。

---

### 5. 落地页技术规格 (Landing Page Spec)

前端开发需基于提供的 HTML 原型进行构建，重点关注以下板块：

| 板块 (Section) | 核心内容 | 技术/设计要点 |
| :--- | :--- | :--- |
| **Hero** | Slogan: "云端喧嚣时代的静默异类" | 背景需有微弱的呼吸感光效 (Green Glow)；强调 "Local-First" 徽章。 |
| **How it Works** | 漫画图解: "实体撞墙，虚线穿墙" | 需支持 SVG 动画或高保真图片；文案需与图解紧密配合。 |
| **Pricing** | 买断制卡片 + BYOK 说明 | 强调 "Lifetime Deal"；明确标示 "Bring Your Own Key" 的含义。 |
| **CTA** | 购买按钮 / 下载 Demo | 按钮需有 Neon Green 辉光效果，增强点击欲望。 |

---

### 6. 下一步行动计划 (Action Items)

1.  **前端 (Frontend)**:
    *   实现 Landing Page (参考 `wansan_landing_page.html`)。
    *   替换 App Icon 为新的“黑曜石三角”方案。
2.  **核心开发 (Core Dev)**:
    *   确认 DuckDB 的 Schema 提取逻辑稳定。
    *   实现 BYOK 的本地安全存储模块。
3.  **设计 (Design)**:
    *   (如需) 基于生成的漫画概念图，绘制高精度的矢量插画。

---

**End of Document**
