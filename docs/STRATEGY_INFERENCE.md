关系推理 (Relationship Inference) 是一个**昂贵**（消耗 Token，需要 AI 思考）且**干扰性强**（弹窗打断）的操作。

如果时机不对，用户会觉得“这个软件好卡”或者“好烦”。

以下是经过深思熟虑的 **最佳时机设计 (Timing Strategy)**，请保存为 `docs/STRATEGY_INFERENCE.md` 并发送给 Code Agent。

---

# 🧠 Strategy: Relationship Inference Timing

> **Principle**:
> 1. **Lazy Execution**: Don't run inference if there's only 1 file.
> 2. **Batch Processing**: Don't run inference on *every* file drop if user drops 10 files at once.
> 3. **Non-Blocking**: The inference should happen in the background, showing a non-intrusive indicator.

---

## 1. Trigger Points (When to run?)

### A. The "Second File" Moment (Goldilocks Zone) 🌟
*   **Condition**: User currently has 1 file. User uploads a **2nd** file.
*   **Action**: **IMMEDIATELY** trigger inference.
*   **Reason**: This is the most common use case (e.g., uploading `Orders` then `Customers`). The user expects them to link.

### B. The "Batch Upload" Completion
*   **Condition**: User drags 3 files at once.
*   **Action**: Wait for **ALL 3 files** to finish ingestion (cleaning & Schema extraction). Then trigger **ONE** inference call with all 3 schemas.
*   **Reason**: Avoids calling AI 3 times. Saves tokens and prevents UI flickering.

### C. Manual Trigger (The "Re-check" Button)
*   **Condition**: User clicks a "✨ Auto-detect Relations" button in the Relationship Manager UI.
*   **Action**: Force re-run inference.
*   **Reason**: User might have renamed columns or changed types, which could help AI guess better.

---

## 2. UI Feedback (How to show it?)

**Do NOT use a blocking Modal immediately.**

### The "Toast + Badge" Pattern

1.  **Background Process**:
    *   Files uploaded -> Ingestion Done.
    *   UI shows a small spinner in the "Relationships" tree node: `⚡ Analyzing connections...`

2.  **Success State**:
    *   If AI finds **High Confidence (>0.8)** relations:
        *   **Auto-create** the relation in the store (optimistic).
        *   Show a **Toast**: `✨ Auto-linked "Orders" and "Customers" via "Client_ID".`
        *   Add a "New" badge on the Relationships node.

    *   If AI finds **Low Confidence (<0.8)** relations:
        *   Do **NOT** auto-create.
        *   Show a **Toast with Action**: `🤔 Found 2 potential connections. [Review]`
        *   Clicking `[Review]` opens the Relationship Manager modal.

---

## 3. Implementation Logic

**File: `src/renderer/src/hooks/use-file-ingestion.ts`**

```typescript
const onUploadComplete = async (newFiles: FileAsset[]) => {
  // 1. Add files to Store
  addFiles(newFiles);
  
  // 2. Get current total file count
  const allFiles = useProjectStore.getState().files;
  
  // 3. Check Condition: Need at least 2 files
  if (allFiles.length < 2) return;
  
  // 4. Trigger Inference (Background)
  setInferenceStatus('analyzing');
  try {
    const suggestions = await window.electron.inferRelationships(allFiles);
    
    // 5. Handle Results based on Confidence
    const highConf = suggestions.filter(s => s.confidence > 0.8);
    const lowConf = suggestions.filter(s => s.confidence <= 0.8);
    
    // Auto-apply high confidence
    highConf.forEach(rel => addRelation(rel));
    
    // Notify user
    if (highConf.length > 0) {
      toast.success(`Auto-linked ${highConf.length} tables!`);
    }
    if (lowConf.length > 0) {
      toast.info(`Found ${lowConf.length} potential links. Click to review.`);
    }
    
  } catch (e) {
    console.error("Inference failed", e);
  } finally {
    setInferenceStatus('idle');
  }
};
```
