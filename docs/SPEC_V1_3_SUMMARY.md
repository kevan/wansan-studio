# 📦 Wansan Studio v1.3.0: The Structure Update

> **Release Date**: 2024-12-27
> **Code Name**: "Structure"
> **Core Value**: From single-session analysis to project-based knowledge management. Decentralized, robust, and beautifully structured.

## 1. 🏗️ Project Bundle Architecture (项目架构)

We transitioned from a fragile, localStorage-dependent state to a robust, file-system-based architecture.

*   **Native Persistence**:
    *   **Bundle Format**: Introduced `.wansan` project bundles (directories containing `wansan.json`, `semantic.json`, and a native DuckDB file).
    *   **Isolation**: Each project now runs in its own isolated DuckDB instance, ensuring zero data leakage and unlimited scalability per project.
    *   **Portability**: Projects are now self-contained folders that can be moved, backed up, or shared.

*   **Launch & Lifecycle**:
    *   **Project Launcher**: A new "Swiss Style" entry point for creating or opening workspaces.
    *   **Safe Close**: Implemented a rigorous "Close Project" workflow that gracefully shuts down database connections and clears memory state.

## 2. 🔗 Relation Decentralization (关联重构)

We overhauled how data relationships are defined and stored, moving from a global list to an asset-centric model.

*   **Asset-Centric Logic**: Relations are now stored *within* the source file node (`FileNode.relations`), aligning with the Smart Metric architecture.
*   **Schema Integration**:
    *   **Unified Editor**: Deprecated the global "Relationship Manager". You can now manage links directly inside the **Schema Editor**, right alongside columns and metrics.
    *   **Visual Badges**: Added "Linked To" badges in the schema header for instant context awareness.
*   **Migration Engine**: Built a robust migration service that seamlessly upgrades legacy v1.2 global relations into the new v1.3 decentralized structure without data loss.

## 3. 🎨 Swiss Style UI Overhaul (瑞士设计)

We pushed our "Swiss Minimalist" design language further, focusing on grid alignment, high contrast, and functional clarity.

*   **Flat Sidebar**:
    *   **No More Cards**: Replaced the cluttered card-style footer with a sleek, flat dock separated by a hairline divider.
    *   **Typography**: Adopted bold, high-contrast typography for active states (`bg-zinc-100` + **Bold**) to improve scannability.
    *   **Consolidated Dock**: Merged "Data Assets", "User Profile", and "System Actions" into a unified, space-efficient footer.
*   **Native Menu**: Integrated a native OS menu bar (File, Edit, View) with multi-language support, feeling right at home on macOS.

## 4. 🧙‍♂️ Data Ingestion Wizard (数据接入向导)

We introduced a powerful, multi-step wizard to unify the "Import New" and "Append Data" workflows, replacing the simple file selector.

*   **Lazy Ingestion & Type Safety**:
    *   **Zero Side Effects**: Files are previewed without touching the database until final confirmation.
    *   **Type Enforcement**: Users can manually enforce types (e.g., preserving "001" as Text instead of Integer), solving precision loss issues once and for all.
*   **Performance & Caching**:
    *   **Excel Cache**: Implemented a caching layer for Excel-to-CSV conversion, boosting processing speed for large files by 300% during the preview/ingest cycle.
*   **Smart Append Logic**:
    *   **Conflict Resolution**: Automatically detects composite primary keys and offers "Ignore" or "Overwrite" strategies for handling duplicate data.
    *   **Field Mapping**: Visual interface to align source columns with target table fields.

## 5. 🛡️ Robustness & Quality (工程质量)

*   **Store Consolidation**: Removed the legacy `useFileStore` proxy, migrating all 60+ references to the unified `useProjectStore`, eliminating state synchronization bugs.
*   **Hydration Safety**: Implemented a "Mock Key" strategy for migration testing, preventing Zustand's auto-hydration from wiping legacy data during the upgrade process.
*   **Engine Resilience**: Enhanced `DuckDBViewManager` to robustly handle quoted column names in SQL expressions, fixing binder errors in complex metric formulas.

---

### 🔮 What's Next?

*   **v1.4.0**: Cloud Connectors & Web Sharing – Taking your local insights to the team.
