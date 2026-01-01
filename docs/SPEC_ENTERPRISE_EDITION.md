# SPEC: 企业版（定制渠道）技术规格说明

> **状态**: 已实施
> **版本**: 1.3.1
> **目标**: 为企业客户提供“免激活、预配置、可管控”的定制化 Wansan Studio 安装包。

## 1. 核心定义

企业版（在代码中称为 `Special Channel`）是 Wansan Studio 的一种特殊发行模式。其核心特征如下：

| 特性 | 标准版 (Standard) | 企业版 (Enterprise) |
| :--- | :--- | :--- |
| **激活逻辑** | 手动输入 Beta 码 | **自动激活**（基于渠道标识） |
| **AI 配置** | 用户自备 Key (BYOK) | **全托管**（构建时内置，不可修改） |
| **有效期** | 永久 (Beta 阶段) | **远程可控** (支持设置过期时间) |
| **UI 特征** | 显示 "PRO ACTIVE" | 显示具体的渠道名 (如 "DeepSeek Corp") |

---

## 2. 授权验证架构 (Authentication)

### 2.1 身份识别逻辑
企业版包在构建时通过环境变量 `VITE_SPECIAL_CHANNEL`（文本值）注入渠道名称。主进程 `AuthService` 在启动时识别该变量：
*   **非空字符串**：识别为企业版，默认设置 `isActivated = true`。
*   **空字符串**：识别为标准版，进入 Beta 码验证流。

### 2.2 离线优先与远程同步
系统采用 **"Local-First, Remote-Sync"** 策略：
1.  **启动**：主进程立即读取环境变量，将 UI 设为已激活状态（无延迟）。
2.  **异步同步**：主进程请求 `https://api.wansan.app/v1/config?channel=xxx`。
    *   **在线状态**：若服务端返回 `special_expiry` 字段，则覆盖本地的过期时间。
    *   **离线状态**：信任本地硬编码的 `DEFAULT_EXPIRY` (2026-12-31)。
3.  **判定**：如果当前系统时间 > `special_expiry`，则 `isActivated` 变为 `false`，UI 显示“已过期”。

---

## 3. 托管 AI 配置 (Managed AI Config)

为了让企业用户“开箱即用”且保护公司 API 资产，企业版支持全量内置 AI 配置。

### 3.1 注入参数
在 CI/CD 构建阶段注入以下变量：
*   `VITE_BUILTIN_BASE_URL`: API 代理地址或官方地址。
*   `VITE_BUILTIN_MODELS`: 允许使用的模型列表。
*   `VITE_BUILTIN_API_KEY`: **加密混淆后的 API Key** (AES-256-GCM)。

### 3.2 安全隔离 (Isolation)
1.  **内存解密**：主进程 `AIService` 在初始化时使用内置盐值（Salt）解密 Key，Key 仅存在于主进程内存中。
2.  **前端屏蔽**：当渲染进程通过 IPC 请求配置时，主进程返回的 `apiKey` 字段被脱敏为 `********************`。
3.  **UI 锁死**：前端 `SettingsDialog` 检测到企业版状态后，自动禁用所有 AI 配置输入框，并显示“企业托管模式”徽章。

---

## 4. CI/CD 构建流程 (Build System)

通过 GitHub Actions (`.github/workflows/build-special.yml`) 实现一键出包：

1.  **输入**：Channel Name, Expiry Date, AI Endpoint, Secret API Key。
2.  **混淆**：使用 `scripts/obfuscate-tool.js` 对 Key 进行 AES 加密。
3.  **打包**：将环境变量注入 `tsup` (Main) 和 `Vite` (Renderer)。
4.  **产物**：生成带有特定渠道前缀的安装包（.dmg / .exe）。

---

## 5. 本地状态持久化

为了平衡安全性与公测阶段的用户体验：

1.  **企业版 (Enterprise)**：
    *   **排除持久化**：`isActivated`, `isSpecialChannel` 等敏感字段已从前端持久化列表中排除。
    *   **主进程管控**：激活状态的“真理来源”始终是主进程的环境变量或 `AuthService` 计算结果。
    *   **安全存储**：License Key (如果未来使用) 存储在系统级安全存储中。

2.  **标准版 (Standard)**：
    *   **前端持久化**：公测阶段，`isActivated` 状态允许在 `localStorage` 中持久化，以免除用户每次打开应用都需要输入 Beta 码的麻烦。
    *   **验证逻辑**：前端直接比对本地缓存的 `validBetaCodes` 列表（该列表通过 RemoteConfig 更新）。

---

## 6. 未来 Roadmap (V2.0)

*   **离线许可证文件**：引入服务端签名的证书文件（JWT），支持完全离线的签名验签。
*   **硬件绑定**：企业版可指定绑定的 Device ID 范围。
*   **远程吊销**：建立黑名单机制，实时吊销被泄露的渠道标识。
