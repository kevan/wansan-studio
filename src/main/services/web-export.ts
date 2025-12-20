import { dialog } from 'electron'
import fs from 'fs-extra'
import type { AIService } from './ai'

export async function exportWebReport(
  aiService: AIService,
  widgets: any[],
  config: { title: string; theme: string; language?: 'en' | 'zh' }
) {
  const { title: reportTitle, theme, language = 'en' } = config
  console.log('exportWebReport,widgets:' + widgets.length, config)

  // 1. Sort Widgets (Page -> Y -> X)
  const sortedWidgets = [...widgets].sort((a, b) => {
    // Page First
    const pageA = a.pageIndex || 0
    const pageB = b.pageIndex || 0
    if (pageA !== pageB) return pageA - pageB

    const layoutA = a.layout || { x: 0, y: 0 }
    const layoutB = b.layout || { x: 0, y: 0 }

    // Then Y (Row)
    if (layoutA.y !== layoutB.y) return layoutA.y - layoutB.y
    // Then X (Column)
    return layoutA.x - layoutB.x
  })

  // 2. Prepare Payload with Layout Hints
  const meta = sortedWidgets.map(w => {
    const reportData = w.reportData || {}
    const width = w.layout?.w || 12
    const isText = reportData.chartType === 'text'
    return {
      id: w.id,
      title: isText ? '' : (reportData.title || 'Untitled Chart'),
      type: reportData.chartType,
      desc: reportData.summary || '',
      content: reportData.content || '', // For text widgets
      vizConfig: reportData.vizConfig,
      layout_hint: width >= 10 ? 'full-width' : (width >= 6 ? 'half-width' : 'compact')
    }
  })

  const dataMap = widgets.reduce((acc, w) => {
    const reportData = w.reportData || {}
    return { ...acc, [w.id]: reportData.tableData || [] }
  }, {})

  // 3. Define Theme System
  const THEMES: Record<string, string> = {
    minimal: 'Minimalist: Clean, lots of white space, thin borders, monochrome palette with subtle gray accents. Primary font: Inter.',
    cyberpunk: 'Cyberpunk: Dark background (#09090b), neon neon borders (purple/cyan), glowing text effects, grid-paper background patterns. Primary font: JetBrains Mono or similar.',
    corporate: 'Corporate: Professional blue/navy accents (#1e40af), heavy-duty cards, clean shadows, consistent spacing. Primary font: Segoe UI or system-ui.'
  }

  const styleInstruction = THEMES[theme] || THEMES.minimal;

  const languageInstruction = language === 'zh'
    ? 'Output Language: Chinese (Simplified). Ensure all UI labels, chart legends, and tooltips are in Chinese where appropriate.'
    : 'Output Language: English.'

  // 4. Prompt AI
  const prompt = `
Role: Senior Frontend Architect.
Task: Generate a standalone single-file HTML dashboard report.
${languageInstruction}

### 1. Technology Stack (Strict)
- **CSS**: Tailwind CSS (CDN: https://cdn.tailwindcss.com)
- **Charts**: ECharts 5 (CDN: https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js)
- **No external CSS/JS files**. All code must be inline.

### 2. Design System
- **Theme Rules**: ${styleInstruction}
- **Layout**: 
  - Mobile: Single column.
  - Desktop: Responsive grid (2-3 columns based on card relevance).
  - **CRITICAL**: Respect the \`layout_hint\` in metadata. 
    - 'full-width' items MUST span the full container width (col-span-full).
    - 'half-width' items should take 50% (or span 1 in 2-col grid).
  - Each chart must be in a card container with padding/shadow consistent with the theme.
  - **CRITICAL**: All Chart containers (divs) MUST have an explicit height (e.g., \`style="height: 400px; min-height: 400px;"\` or Tailwind \`h-96 min-h-[400px]\`). Otherwise charts will be invisible.

### 3. Content Metadata
Render ${meta.length} widgets based on this metadata:
${JSON.stringify(meta, null, 2)}

### 4. Data Binding & Rendering (CRITICAL)
- **DO NOT INVENT DATA**. I will inject the real data later.
- Assume a global object \`window.WIDGET_DATA\` exists.
- Keys are widget IDs. Values are arrays of row objects.
- **Container Styling**: ALWAYS add \`w-full\` (width: 100%) to the chart container div. Example: \`class="w-full h-96 min-h-[400px]"\`.
- **ECharts Configuration**:
  - Use \`dataset: { source: window.WIDGET_DATA['WIDGET_ID'] }\`.
  - Automatically map dimensions (encode) if possible, or use sensible defaults (x=first column, y=numeric column).
  - Handle 'kpi' type as a big number display.
  - Handle 'table' type as a clean HTML table (limit to top 10 rows).
  - Handle 'text' type by rendering its 'content' or 'desc'.
  - **Initialization Timing**: Since the layout uses CSS Grid, the container width might not be calculated immediately. You MUST add a \`setTimeout(() => chart.resize(), 50)\` immediately after \`chart.setOption\`.
  - **Must handle resize**: \`window.addEventListener('resize', () => chart.resize());\`
  - **Must set height**: Ensure \`div\` container has \`style="height: 400px;"\` or Tailwind \`h-96\`.
  - **Data Safety**: Check if data exists before init. \`if (!window.WIDGET_DATA['ID']) return;\`.
  - **Safe Formatting**: When using \`formatter\` (tooltip/label), ALWAYS safely handle null/undefined values. Use \`(val ?? 0).toLocaleString()\` or check existence. NEVER call methods on undefined.

### 5. Output Format
- Return **ONLY** the raw HTML code.
- Start with \`<!DOCTYPE html>\`.
- End with \`</html>\`.
- Do not wrap in markdown code blocks.
`

  const systemPrompt = "You are a specialized code generator for BI reports."

  // 5. Call AI
  console.log('[Web Export] Calling AI with prompt:', prompt)
  const startTime = Date.now()
  const aiResponse = await aiService.generateText(prompt, systemPrompt)
  const duration = Date.now() - startTime
  console.log(`[Web Export] AI Response received in ${duration}ms:`, aiResponse)

  let html = aiResponse.trim()
  // Strip markdown fences if AI added them
  html = html.replace(/^```html/, '').replace(/```$/, '')

  // 5. Inject Data & Safety Script
  const debugScript = `
  <script>
    window.onerror = function(msg, url, line) { document.body.innerHTML += '<div style="color:red;padding:20px;">Runtime Error: ' + msg + '</div>'; };
    window.addEventListener('load', function() {
        if (typeof echarts === 'undefined') { alert('Error: ECharts library failed to load. Please check your internet connection.'); }
        if (!window.WIDGET_DATA) { alert('Error: Data injection failed.'); }
    });
  </script>`

  const injection = `${debugScript}<script>window.WIDGET_DATA = ${JSON.stringify(dataMap)};</script>`

  // Insert before </head> or <body>
  if (html.includes('</head>')) {
      html = html.replace('</head>', `${injection}</head>`)
  } else {
      html = html.replace('<body>', `<body>${injection}`)
  }

  // 6. Save Dialog
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'Web Page', extensions: ['html'] }],
    defaultPath: `${reportTitle.replace(/\s+/g, '_')}.html`
  })

  if (filePath) {
    await fs.writeFile(filePath, html)
    return { success: true, filePath }
  }
  return { success: false, error: 'Cancelled' }
}
