# 🛠️ Spec: Lightweight SQL Editor

> **Goal**: Replace `monaco-editor` (~5MB+) with `react-simple-code-editor` (~50KB) for the SQL Lab.
> **Rationale**: We only need syntax highlighting, not full IDE features.

## 1. Dependencies
*   **Remove**: `@monaco-editor/react`, `monaco-editor`.
*   **Add**: `react-simple-code-editor`, `prismjs`.

## 2. Component Update (`sql-editor-modal.tsx`)

Replace the Monaco component with `Editor`.

```tsx
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism.css'; // Or a custom light theme

// ...

<Editor
  value={code}
  onValueChange={setCode}
  highlight={code => highlight(code, languages.sql, 'sql')}
  padding={16}
  style={{
    fontFamily: '"Fira Code", "Fira Mono", monospace',
    fontSize: 14,
    backgroundColor: '#f9f9f9', // Light gray bg
    minHeight: '100%',
  }}
  className="min-h-full"
/>
```

## 3. Styling
Since `react-simple-code-editor` is just a textarea, we need to ensure the container has:
*   `overflow: auto` (for scrolling long SQL).
*   `border` & `rounded` (for visuals).

## 4. Implementation Steps

1.  **Uninstall**: Remove Monaco.
2.  **Install**: `npm install react-simple-code-editor prismjs`.
3.  **Refactor**: Modify `src/renderer/src/components/report/sql-editor-modal.tsx`.
4.  **Verify**: Ensure SQL keywords (SELECT, FROM) are colored.
