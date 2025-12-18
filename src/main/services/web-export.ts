import { dialog } from 'electron'
import fs from 'fs-extra'
import type { AIService } from './ai'

export async function exportWebReport(
  aiService: AIService,
  widgets: any[],
  config: { title: string; theme: string }
) {
  const { title: reportTitle, theme } = config
  console.log('exportWebReport,widgets:' + widgets.length, config)
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
  const themeInstructions = {
    minimal: 'Clean, spacious, lots of white space, subtle gray accents.',
    cyberpunk: 'Dark mode, neon colors (purple, cyan, pink), futuristic grid, glowing borders.',
    corporate: 'Professional blue/navy accents, solid borders, structured business layout.'
  }[theme as 'minimal' | 'cyberpunk' | 'corporate'] || 'Modern and clean.'

  const prompt = `
    You are a frontend expert. Create a single-file HTML report (using CDN for Tailwind CSS and ECharts).
    
    REPORT TITLE: ${reportTitle}
    VISUAL THEME: ${theme}
    THEME STYLE GUIDE: ${themeInstructions}

    Layout Requirement: 
    - Responsive Grid. 
    - ${themeInstructions}
    - Use a nice font (Inter or system-ui).
    - Include a header with "${reportTitle}" and current date.
    ...`

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
