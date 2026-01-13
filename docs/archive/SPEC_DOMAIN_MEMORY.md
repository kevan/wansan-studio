# SPEC: Project-Level Domain Memory (v1.3+)

## 1. Background & Goal
Currently, `DomainRules` (Business Knowledge) are stored globally in `SettingsStore`. This limits the capability to support multi-project scenarios where each project (e.g., "Retail" vs "Finance") requires distinct business logic.

**Goal**: Decentralize Domain Rules from Global Settings to Project Scope, allowing each project to maintain its own Knowledge Base while optionally inheriting global defaults.

---

## 2. Architecture

### 2.1 Data Model
*   **Global Rules**: Stored in `SettingsStore` (localStorage). Represents user-level preferences (e.g., "Always reply in Chinese").
*   **Project Rules**: Stored in `ProjectData` (`.wansan/wansan.json`). Represents project-specific logic (e.g., "Fiscal year starts in April").

### 2.2 Prompt Construction
The AI System Prompt will be constructed by merging both sources:
`Final Rules = Global Rules + Project Rules`

---

## 3. Implementation Steps

### Phase 1: Data Layer (Shared & Store)
1.  **Type Definition**: Update `ProjectData` in `@shared/types/project.ts` to include `domainRules: DomainRule[]`.
2.  **Store Logic**: Update `useProjectStore` to support CRUD operations for `domainRules` (add, remove, update, reorder).
    *   *Note*: Re-use the logic from `useSettingsStore`.

### Phase 2: UI Layer (Renderer)
1.  **Refactor**: Extract the core logic and UI of `DomainKnowledgeTab` into a reusable `RuleEditor` component.
2.  **Integration**:
    *   **Settings Dialog**: Use `RuleEditor` bound to `useSettingsStore` (Global Rules).
    *   **Project Settings / Schema Editor**: Add a new entry (e.g., a "Knowledge" tab or button) that uses `RuleEditor` bound to `useProjectStore` (Project Rules).

### Phase 3: AI Bridge (Main Process)
1.  **IPC Update**: Ensure `projectRules` are passed from Renderer to Main Process during Chat/Analysis requests.
2.  **Prompt Engineering**: Update `src/main/engine/prompts.ts` (or equivalent) to ingest and format the merged rules list.

---

## 4. Migration & Compatibility
*   **Backward Compatibility**: Existing global rules remain effective.
*   **Default Behavior**: New projects start with empty Project Rules.
*   **UI Hint**: The UI should clearly distinguish between "Global Rules (Applied to All)" and "Project Rules (This Project Only)".

---

## 5. Task List
- [ ] Update `ProjectData` type.
- [ ] Implement `domainRules` actions in `useProjectStore`.
- [ ] Extract `RuleEditor` component.
- [ ] Integrate `RuleEditor` into a Project-level UI location (e.g., Settings Modal > Project Rules tab).
- [ ] Update AI Service to consume project rules.