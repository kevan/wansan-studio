# SPEC: Data Integration Wizard (v1.3)

## 1. 概述与目标
为统一“导入新数据”和“追加数据”的用户体验，万三 Studio v1.3 引入了统一的、多步骤的**数据集成向导 (Data Integration Wizard)**。该向导取代了早期的简单文件选择逻辑，提供了更强大、更灵活的数据集成能力，并确保了数据类型的完整性。

**核心改进**:
- **延迟建表 (Lazy Ingestion)**: 预览阶段不产生数据库副作用，仅在最终确认后带类型入库，彻底解决“001 变 1”的精度丢失问题。
- **性能优化 (Excel Cache)**: Excel 转换 CSV 后进行路径缓存，避免在预览、预检、入库阶段重复转换，处理大文件效率提升 300%+。
- **智能冲突处理**: 支持复合主键检测，提供“忽略”或“覆盖”策略。
- **空气感 UI**: 采用柔和阴影、大圆角及细腻边框，提供通透的交互体验。

---

## 2. 向导触发点
1.  **全局导入 (Full Flow)**: 侧边栏“导入数据”按钮。
2.  **追加数据 (Append Flow)**: `SchemaEditor` 表操作栏中的“追加数据”按钮。
3.  **数据修正 (Merge Flow)**: 文件节点右键菜单中的“修正数据”按钮。

---

## 3. 向导步骤 (Final Flow)

### 第 1 步: 选择资源 (Select Files)
- **多文件支持**: 支持一次选择多个 Excel/CSV/JSON 文件。
- **工作表提取**: 自动扫描 Excel 中的所有 Sheet。
- **灵活选择**:
  - **新建导入**: 支持多选，可一次性勾选多个 Sheet 并行导入。
  - **追加数据 / 数据修正**: 强制单选，仅允许选择一个 Sheet 进行操作。
- **智能预命名**: 使用 `sanitizeTableName` 规则自动生成合法的 SQL 表名（`t_文件名_Sheet名`），并实时校验重名。

### 第 2 步: 预览与配置 (Review & Configure)
- **多任务导航**: 顶部显示任务切换器（如 "配置资源 1 / 3"）。
- **数据预览**: 展示前 100 行真实数据（日期格式已通过 `serialization` 优化）。
- **类型覆盖**: 允许手动指定字段类型（Text, Integer, Decimal, Date, DateTime, Boolean）。
- **字段映射 (仅追加/修正模式)**:
  - 左侧显示目标表字段。
  - **追加模式**: 目标表主键状态 (🔑) 只读。
  - **修正模式**: 允许用户点击目标表字段旁的 🔑 图标，手动切换该字段是否作为“匹配键 (Match Key)”。
  - 下拉菜单允许用户将源文件字段手动对齐到目标字段。

### 第 3 步: 最终确认 (Finalize)
- **步骤合并**: 原 "Target Decision" 与 "Summary" 合并为单一步骤，提升效率。
- **新建模式**: 
  - 列表化展示所有任务，支持行内批量修改“目标表名”。
  - 实时校验重名冲突（包括与现有表名冲突及本次导入任务间的重名）。
- **追加模式**: 
  - **冲突预检**: 基于 DuckDB 直接 JOIN 文件（无副作用），计算重复行数。
  - **策略选择**: 用户决定冲突行是“忽略”还是“使用新数据覆盖”。
- **修正模式**:
  - **匹配逻辑预览**: 清晰展示 "Match by [Keys] -> Update [Columns]" 的逻辑摘要。
  - **影响预估**: 预估将更新多少行数据（Match Count）。
  - **强制校验**: 必须至少选择一个匹配键 (Match Key) 和一个更新字段 (Update Column) 才能进入此步骤。
- **替换模式**:
  - **Schema Diff**: 显示 Schema 变更（新增/删除/保留的列）。
- **执行行为**: 按钮根据模式明确标识为“立即导入”、“立即追加”、“立即修正”或“立即替换”。

---

## 4. 技术实现细节

### 4.1 数据完整性 (Type Enforcement)
在 `handleFinish` 阶段，后端调用 `createTableFromSource`。SQL 构造示例：
```sql
CREATE TABLE t_final AS 
SELECT * FROM read_csv_auto('source.csv', types={'id': 'VARCHAR', 'price': 'DOUBLE'}, auto_detect=true)
```
通过 `types` 参数强制 DuckDB 尊重用户的选择，防止自动推断错误。

### 4.2 修正逻辑 (Merge Implementation)
修正模式本质是 `UPDATE ... FROM ...` 操作。
1. **创建临时源表**: 将上传的文件加载为临时表 `temp_source` (带类型)。
2. **执行更新**:
   ```sql
   UPDATE target_table
   SET 
     col_a = temp_source.col_a,
     col_b = temp_source.col_b
   FROM temp_source
   WHERE target_table.key_id = temp_source.key_id;
   ```
3. **清理**: 删除 `temp_source`。

### 4.3 资源管理与清理
- **隔离存储**: 临时文件统一存放于 `temp/wansan-studio/` 目录下。
- **闭环清理**: 
  - 任务成功：入库后立即删除临时 CSV。
  - 任务取消：点击取消按钮时批量删除所有产生的临时资源。
  - 开机兜底：应用启动时自动清空 `wansan-studio` 临时目录。

### 4.3 状态同步
- **isProjectLoaded**: 引入非持久化的瞬态标志位。在项目完全打开并连接到 `source.duckdb` 之前，前端挂起所有业务组件渲染，防止误连 `:memory:` 内存库。

---

## 5. UI 规范
- **容器**: `rounded-[2rem]`, `shadow-2xl`, `bg-white`。
- **边框**: `border-zinc-100` 或 `zinc-200`。
- **交互**: 
  - 禁用点击遮罩层关闭（Dialog）。
  - 按钮使用 `rounded-xl` 或 `rounded-2xl`。
  - 类型标签使用 `COLUMN_TYPE_CONFIG` 统一渲染。