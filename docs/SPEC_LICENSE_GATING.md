# Wansan Studio: License Tier Guide (TRIAL vs PRO)

This document outlines the functional differences and restrictions between the **TRIAL MODE** (Free) and **PRO ACTIVE** (Licensed) tiers as implemented in v1.3.0.

---

## 1. Data Capacity (容量限制)

These limits ensure that TRIAL mode remains a playground for small-scale exploration, while production-grade datasets require a PRO license.

| Feature | TRIAL MODE | PRO ACTIVE | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **Project Bundles** | **Max 2 Projects** | Unlimited | Tracked via `recentProjectPaths`. Intercepted at project creation. |
| **Tables per Project** | **Max 3 Tables** | Unlimited | Combined count of files/sheets. Validated during wizard selection. |
| **Rows per Table** | **50,000 Rows** | Unlimited | Hard truncation during ingestion/importing. |
| **File Size** | **No Limit** | **No Limit** | Size restriction removed in favor of row-based capping. |

---

## 2. Analysis Intelligence (智能深度)

Advanced AI features designed for deep business context and automated maintenance are reserved for PRO users.

| Feature | TRIAL MODE | PRO ACTIVE | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **Business Memory** | Global Memory only | **Project-Level Memory** | Project-specific instructions are strictly Pro-only. |
| **Smart Append** | 🚫 Locked | **Full Support** | The "Append" action in Schema Editor triggers Pro Gate. |
| **Smart Metrics** | 🚫 Locked | **Full Support** | Adding calculated columns requires a Pro license. |

---

## 3. Workflow & Professional Tools (专业工作流)

Professional output formats and power-user tools are restricted to ensure commercial sustainability.

| Feature | TRIAL MODE | PRO ACTIVE | Implementation Detail |
| :--- | :--- | :--- | :--- |
| **Report Export** | UI View only | **PDF / Markdown** | Export buttons are hidden/intercepted for Trial users. |
| **SQL Lab** | 🚫 Locked | **Full IDE** | Professional SQL Editor is accessible to Pro users only. |

---

## 4. Technical Guardrails

### 4.1 Frontend: `useProGate`
The unified `useProGate` hook is the primary mechanism for feature interception. It provides a consistent "Upgrade to Pro" dialog across the application.

### 4.2 Backend: Ingestion Truncation
Data truncation (50k rows) is performed at the engine level (`DuckDB SQL`) to ensure that performance and resource usage remain consistent with the tier.

---

## 5. Visual Indicators
Restricted features are identified in the UI by:
- **Crown/Lock Icons**: Visual cues near restricted buttons.
- **Trial Badges**: Displayed in the Sidebar footer and Settings menu.
- **Upgrade Prompts**: Contextual call-to-actions when limits are reached.
