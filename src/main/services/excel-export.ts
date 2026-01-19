import ExcelJS from 'exceljs'
import { dialog } from 'electron'
import fs from 'fs-extra'
import type { ExportExcelPayload } from '../../shared/api-types'

/**
 * Service to handle Excel export with data, charts, and insights.
 * Implements a "Split Layout": Data on the left, Chart/Insight on the right.
 */
export async function exportExcel(payload: ExportExcelPayload): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const { filename, sheets, insightTitle = 'AI Insights' } = payload

    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: filename || 'Wansan_Export.xlsx',
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    })

    if (canceled || !filePath) {
      return { success: false, error: 'Cancelled' }
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Wansan Studio'
    workbook.lastModifiedBy = 'Wansan Studio'
    workbook.created = new Date()

    for (const sheetData of sheets) {
      // 1. Create Worksheet
      const sheetName = sheetData.name.replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Sheet'
      const worksheet = workbook.addWorksheet(sheetName)

      // 2. Prepare Columns
      const columns = sheetData.columns.map(col => ({
        header: col.name,
        key: col.name,
        width: Math.min(Math.max(col.name.length * 1.5, 12), 40)
      }))
      worksheet.columns = columns

      // 3. Add Rows
      worksheet.addRows(sheetData.data)

      // 4. Style Header
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' }
      }
      
      // 5. Freeze First Row
      worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]

      // 6. Split Layout: Determine Anchor Column for Visuals
      // Anchor at max(5, dataColumns.length + 1) -> 0-based
      const anchorColIndex = Math.max(5, sheetData.columns.length + 1)
      
      // Starting row for visuals (1 means row 2 in Excel, leaving row 1 as margin)
      let nextRow = 1

      // 7. Insert Chart Image (if exists)
      if (sheetData.chartImage) {
        try {
          // Remove prefix: data:image/png;base64,
          const base64Data = sheetData.chartImage.split(',')[1]
          if (base64Data) {
            const imageId = workbook.addImage({
              base64: base64Data,
              extension: 'png',
            })

            // Calculate responsive size to maintain aspect ratio
            const targetWidth = 520
            let targetHeight = 320 // Default

            if (sheetData.chartWidth && sheetData.chartHeight) {
                const ratio = sheetData.chartHeight / sheetData.chartWidth
                targetHeight = targetWidth * ratio
            }

            worksheet.addImage(imageId, {
              tl: { col: anchorColIndex, row: nextRow },
              ext: { width: targetWidth, height: targetHeight }
            })
            
            // Advance nextRow based on image height (approx 20px per row)
            const rowIncrement = Math.ceil(targetHeight / 20) + 1
            nextRow += rowIncrement
          }
        } catch (e) {
          console.error('Failed to add image to excel', e)
        }
      }

      // 8. Insert AI Insight (if exists)
      if (sheetData.insight) {
        const insightTitleRow = nextRow + 1
        const insightBodyRow = nextRow + 2
        
        const titleRow = worksheet.getRow(insightTitleRow)
        const titleCell = titleRow.getCell(anchorColIndex + 1)
        
        // Clean markdown a bit for Excel
        const cleanInsight = sheetData.insight
          .replace(/###\s+/g, '')
          .replace(/\*\*/g, '')
          .replace(/- /g, '• ')

        titleCell.value = insightTitle
        titleCell.font = { bold: true, size: 12, color: { argb: 'FF4F46E5' } } // Indigo-600

        const contentCell = worksheet.getRow(insightBodyRow).getCell(anchorColIndex + 1)
        contentCell.value = cleanInsight
        contentCell.alignment = { wrapText: true, vertical: 'top' }
        
        // Merge cells for readability (8 columns wide, 20 rows high)
        worksheet.mergeCells(
          insightBodyRow, anchorColIndex + 1, 
          insightBodyRow + 20, anchorColIndex + 8
        )
      }
      
      // 9. Auto-fit column widths (basic implementation)
      sheetData.columns.forEach((_, idx) => {
        let maxLen = sheetData.columns[idx].name.length
        sheetData.data.slice(0, 100).forEach(row => {
          const val = String(row[sheetData.columns[idx].name] || '')
          if (val.length > maxLen) maxLen = val.length
        })
        worksheet.getColumn(idx + 1).width = Math.min(maxLen + 2, 40)
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    await fs.writeFile(filePath, Buffer.from(buffer))

    return { success: true, data: filePath }
  } catch (error) {
    console.error('Excel export error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
