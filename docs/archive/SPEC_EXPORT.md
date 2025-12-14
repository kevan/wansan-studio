# 🛠️ Spec: Export Capabilities

> **Goal**: Enable users to take their insights out of the app.

## 1. Image Export (Single Card)
*   **Lib**: `html-to-image`.
*   **Action**: `ReportCard` menu -> "Save as Image".
*   **Logic**:
    1.  Target the Card DOM ref.
    2.  `toPng(ref)` -> Blob.
    3.  Electron `dialog.showSaveDialog` -> Write file.

## 2. HTML Export (Interactive Dashboard)
*   **Action**: Dashboard Header -> "Export Dashboard as HTML".
*   **Logic**:
    1.  Get all `pinnedReports` from store.
    2.  Inject them into a `template.html` string.
    3.  Include a CDN link to ECharts (or embed minified JS for offline support).
    4.  Save `.html` file.

## 3. PDF Export (The Report)
*   **Action**: Dashboard Header -> "Export as PDF".
*   **Logic**:
    1.  Electron Main Process listens to `export-pdf` event.
    2.  Renderer sends the current HTML content (or opens a dedicated Print Window).
    3.  Main Process calls `win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })`.
    4.  Save `.pdf` file.
