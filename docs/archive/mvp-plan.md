# 🚀 项目立项书：Wansan Studio (万三)

> **Slogan**: **"数据聚宝，日进斗金。"** > **英文 Slogan**: **"Wansan - Turn Data into Wealth, Privately."**

## 1. 项目愿景与定位

- **产品名称**：万三 (Wansan)
- **产品定位**：**本地优先 (Local-First)** 的智能商业报表桌面端软件。
- **核心隐喻**：它是老板的数字化“聚宝盆”——扔进去杂乱的数据（Excel/CSV），变出来高价值的商业洞察（Chart/PDF）。
- **核心价值**：
  1.  **守财 (Privacy)**：数据不出域 (Local-First)，利用本地算力，绝不上传原始数据行。
  2.  **聚财 (Insight)**：自然语言交互，一键生成老板爱看的报表。
  3.  **生财 (Efficiency)**：由繁入简，极速决策。

---

## 2. 功能范围 (MVP Scope)

### ✅ 核心工作流 (Core Workflow)

1.  **数据接入 (Local Ingestion)**：
    - 支持拖拽上传 `.xlsx`, `.csv`。
    - **智能清洗**：本地运行 Node.js 脚本自动处理合并单元格 (Unmerge)、空行清洗。
    - **零延迟**：利用本地 I/O，秒开 100MB+ 大文件。
2.  **模型确认 (The Trust Layer)**：
    - **Schema 解析**：本地提取列名。
    - **字段映射 UI**：弹出交互式卡片，用户确认/修改 AI 猜测的字段语义（使用 TanStack Table 实现）。
3.  **隐私安全 AI (Privacy-First AI)**：
    - **脱敏请求**：仅将 _Table Schema (列名)_ 发送给 LLM，严禁发送具体数据行。
    - **审计日志**：提供 "Network Log" 面板，让用户亲眼看到发送了什么。
4.  **智能生成与展示**：
    - 自然语言 -> DuckDB SQL (本地执行)。
    - 自然语言 -> ECharts 配置。
    - 自然语言 -> 业务摘要。
5.  **导出与分享**：
    - **本地导出**：生成像素级完美的 PDF (Electron `printToPDF`)。
    - **云端分享 (增值)**：一键生成加密的网页链接（仅上传聚合后的结果数据）。

---

## 3. 技术架构 (Architecture)

**架构模式**：**Electron + React + Native DuckDB** (重客户端，轻服务端)。

### 🛠 开发栈 (The Stack)

- **App Shell**: **Electron** (主进程)
  - 负责窗口管理、本地文件读写、原生 DuckDB 调用。
- **Frontend (Renderer)**:
  - Framework: **React 18 + Vite** (SPA 模式)
  - UI Library: **Tailwind CSS + ShadcnUI**
  - State Management: **TanStack Query (React Query) v5** —— 管理 AI 请求、SQL 执行状态。
  - Data Logic: **TanStack Table (React Table) v8** —— 处理复杂的字段映射和结果展示。
  - Router: **TanStack Router** (可选，若做多页面)。
- **Data Engine**: **DuckDB (Node.js Bindings)**
  - 直接在 Electron 主进程运行 C++ 绑定的 DuckDB，性能远超 WASM。
- **LLM**: **OpenAI GPT-4o-mini** (需联网)。
- **Update & License**: `electron-updater` + Lemon Squeezy API。

### ⚙️ 关键流程设计 (IPC 通信)

1.  **文件读取**：
    - Renderer 发送文件路径 -> Main 进程。
    - Main 进程调用 `xlsx` 清洗数据 -> 存入 DuckDB 内存表。
    - Main 进程返回 Schema -> Renderer。
2.  **SQL 执行**：
    - Renderer 发送自然语言 -> GPT -> 获得 SQL。
    - Renderer 发送 SQL -> Main 进程。
    - Main 进程 `db.all(sql)` -> 返回 Result Array -> Renderer 展示图表。

---

## 4. 开发计划 (预计 30-40 天)

### 📅 Phase 1: 本地计算引擎 (The Engine)

- 搭建 Electron + Vite + TypeScript 脚手架。
- 集成 `duckdb` 原生模块，跑通 `SELECT * FROM read_csv(...)`。
- 实现 Excel 合并单元格清洗逻辑。

### 📅 Phase 2: 前端交互与 TanStack 集成 (The UI)

- 配置 **TanStack Query**，封装 IPC 通信 hook (`useRunSQL`, `useParseFile`)。
- 基于 **TanStack Table** 开发“字段映射确认组件”。
- 集成 ECharts，实现图表动态渲染。

### 📅 Phase 3: AI 桥接与隐私审计 (The Brain)

- 实现 OpenAI 流式调用。
- 开发“审计日志”面板 (Audit Log)，展示脱敏后的请求包。
- 调试 Prompt，强制 AI 输出 JSON 格式。

### 📅 Phase 4: 打包与商业化 (The Product)

- 实现 PDF 导出功能。
- 集成 License Key 验证 (Lemon Squeezy)。
- 使用 `electron-builder` 打包 Windows (.exe) 和 Mac (.dmg) 安装包。

### 📅 Phase 5: 云端增值服务 (Cloud Add-on)

- 开发 Cloudflare Worker 接收分享请求。
- 客户端集成 "Publish" 按钮，上传聚合后的 JSON 数据。

---

## 5. 商业模式 (Monetization)

- **Solo License (买断制)**：**$49 / 终身**
  - 包含所有本地功能，PDF 导出。
  - BYOK (Bring Your Own Key) 模式或内置有限额度。
- **Team Subscription (订阅制)**：**$9 / 月**
  - 包含 Solo 功能。
  - **云端分享功能** (一键生成网页报表)。
  - 密码保护与访问统计。

---

## 6. 风险管理

| 风险点                | 应对策略                                                                       |
| :-------------------- | :----------------------------------------------------------------------------- |
| **Electron 体积大**   | 接受 100MB+ 体积，桌面端用户不敏感；使用 vite 插件剔除无用代码。               |
| **代码签名成本**      | 需购买 Apple 开发者账号 ($99/年) 和 Windows 证书；这是发布桌面软件的必要门票。 |
| **数据隐私信任**      | 强调 "Local-First"，开源部分核心代码或提供网络抓包教程自证清白。               |
| **TanStack 学习曲线** | 优先复制 ShadcnUI 的 Table 模版，避免过度封装。                                |
