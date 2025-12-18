import { dialog } from 'electron'
import fs from 'fs-extra'
import type { AIService } from './ai'

export async function exportWebReport(aiService: AIService, widgets: any[]) {
  console.log('exportWebReport,widgets:' + widgets.length)
  // 1. Prepare Payload
  const meta = widgets.map(w => {
    const reportData = w.reportData || {}
    return {
      id: w.id,
      title: reportData.title || 'Untitled Chart',
      type: reportData.chartType,
      desc: reportData.summary || '',
      content: reportData.content || '', // For text widgets
      vizConfig: reportData.vizConfig
      // Don't send data rows to AI
    }
  })

  const dataMap = widgets.reduce((acc, w) => {
    const reportData = w.reportData || {}
    return { ...acc, [w.id]: reportData.tableData || [] }
  }, {})

  // 2. Prompt AI
  const prompt = `
    You are a frontend expert. Create a single-file HTML report (using CDN for Tailwind CSS and ECharts).
    
    Layout Requirement: 
    - Responsive Grid. 
    - Modern, clean "Apple-style" design.
    - Use a nice font (Inter or system-ui).
    - Include a header with "Wansan Report" and current date.
    
    Content: Render the following widgets: ${JSON.stringify(meta)}.
    
    Data Binding:
    - DO NOT hardcode data rows in the ECharts options.
    - Assume a global variable exists: "window.REPORT_DATA".
    - For widget with id "abc", use "window.REPORT_DATA['abc']" as the dataset source.
    - Handle different chart types (bar, line, pie, scatter, kpi, table) appropriately.
    - For 'kpi' type, display a big number card.
    - For 'table' type, render a simple HTML table (limit to top 10 rows).
    - For 'text' type, render the desc/content as markdown or plain text.
    
    Output ONLY valid HTML code. No markdown fences.
  `

  const systemPrompt = "You are a specialized code generator for BI reports."

  // 3. Call AI
  console.log('[Web Export] Calling AI with prompt:', prompt)
  const startTime = Date.now()
  const aiResponse = await aiService.generateText(prompt, systemPrompt)
  const duration = Date.now() - startTime
  console.log(`[Web Export] AI Response received in ${duration}ms:`, aiResponse)
  
  let html = aiResponse.trim()
  // Strip markdown fences if AI added them
  html = html.replace(/^```html/, '').replace(/```$/, '')

  // 4. Inject Data
  const injection = `<script>window.REPORT_DATA = ${JSON.stringify(dataMap)};</script>`
  // Insert before </head> or <body>
  // Safe replacement: try </head>, fallback to <body>
  if (html.includes('</head>')) {
      html = html.replace('</head>', `${injection}</head>`)
  } else {
      html = html.replace('<body>', `<body>${injection}`)
  }

  // 5. Save Dialog
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'Web Page', extensions: ['html'] }],
    defaultPath: 'report.html'
  })

  if (filePath) {
    await fs.writeFile(filePath, html)
    return { success: true, filePath }
  }
  return { success: false, error: 'Cancelled' }
}
