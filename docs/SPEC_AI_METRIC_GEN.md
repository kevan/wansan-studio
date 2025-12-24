# SPEC: AI Smart Metric Generator

## 1. Goal
Allow users to generate SQL expressions for calculated columns using natural language directly within the editor.

## 2. Interaction Design
* **Input**: The user types a description (e.g., "Calculate gross profit margin") into the `CodeEditor`.
* **Trigger**: A "Magic Wand" button inside/near the editor.
* **Action**:
    1.  Frontend captures the current editor content.
    2.  Sends content + list of available columns (Native & Joined) to AI.
    3.  Replaces the editor content with the returned SQL expression.
* **Feedback**: Show a loading spinner inside the button during generation.

## 3. AI Logic (Prompt)
* **Role**: SQL Expression Generator (DuckDB dialect).
* **Strict Constraints**:
    * Must return **ONLY** the expression (e.g., `a + b`).
    * **NO** `SELECT`, **NO** `AS alias`, **NO** Markdown.
    * Must use **Exact Column Names** provided in the context.
* **Input Context**:
    * `description`: User's input text.
    * `columns`: Array of `{ name: string, type: string }`.

## 4. Architecture
* **Frontend**: `MetricEditorModal` (UI).
* **Backend**: `ai-service.ts` -> `generateMetricExpression` method.
