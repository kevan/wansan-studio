# SPEC: License Gating Strategy (TRIAL vs PRO)

## 1. Overview
Wansan Studio employs a Freemium model. This document defines the functional boundaries between the **TRIAL MODE** (Free) and **PRO ACTIVE** (Licensed) tiers, ensuring a balance between user onboarding and commercial value.

**Core Philosophy**: 
- **TRIAL**: A playground for small-scale, personal data exploration.
- **PRO**: A production-grade decision support system for multi-project knowledge management.

---

## 2. Current Implementation Audit
The following gates are already implemented in v1.3:
- **File Count**: TRIAL limited to 1 file per project.
- **File Size**: TRIAL limited to 50MB (PRO 200MB+).
- **Export**: PDF and Markdown export restricted to PRO.
- **Tools**: SQL Lab restricted to PRO.
- **Data Wizard**: Multi-sheet ingestion restricted to PRO.

---

## 3. Tier Differentiation Matrix

### 3.1 Data Capacity (Scale)
| Feature | TRIAL MODE | PRO ACTIVE |
| :--- | :--- | :--- |
| **Project Bundles** | Max 2 Projects | Unlimited |
| **Rows per Table** | Limit to 50,000 rows | Unlimited (Disk limited) |
| **Files per Project** | Max 2 Tables | Unlimited |

### 3.2 AI Intelligence (Depth)
| Feature | TRIAL MODE | PRO ACTIVE |
| :--- | :--- | :--- |
| **Business Memory** | Global Memory only | **Project-Level Memory** |
| **Append Data** | 🚫 Locked | **Full Support** |
| **Auto-Link** | Basic Semantic Match | **Deep Context Analysis** |
| **SQL Auto-Fix** | Not available | **AI-Powered SQL Repair** |

### 3.3 Workflow & Output (Value)
| Feature | TRIAL MODE | PRO ACTIVE |
| :--- | :--- | :--- |
| **Export Formats** | UI View only | **PDF / Markdown / Web Report** |
| **Data Update** | Full Re-ingest | **Hot Data Replacement** |
| **Visuals** | Standard Charts | **Pro Charts & Themes** |

---

## 4. Technical Implementation Pattern

### 4.1 Frontend: `useProGate`
All restricted UI actions should be wrapped in the `useProGate` hook to provide a consistent "Upgrade to Pro" dialog.

```typescript
const { checkGate } = useProGate();

const handleProAction = () => {
  checkGate("Feature Name", () => {
    // Actual logic
  });
};
```

### 4.2 Metadata Marking
Restricted features should be visually identified with a consistent "Pro" icon (e.g., `Crown` or `Lock` from lucide-react).

### 4.3 Backend: Main Process Guard
For high-resource actions (like large data ingestion), the Main Process should verify the license state via `ProjectManager` before execution to prevent bypass via UI console.

---

## 5. Implementation Roadmap

### Phase 1: Capacity Hardening
- [ ] Implement row count check during ingestion (Drop rows > 50k in TRIAL).
- [ ] Implement project count check in `ProjectManager`.

### Phase 2: Feature Locking
- [ ] Restrict Project-Level Business Memory to 2 entries for TRIAL users.
- [ ] Move "Append" button behind `useProGate`.
- [ ] Restrict "Smart Metrics" (Calculated Columns) to PRO.

### Phase 3: Visual Polish
- [ ] Add "Pro" badges to Sidebar menu items and Modal headers.
- [ ] Implement a "Feature Comparison" view in the Settings > License tab.
