import { ipcMain, dialog, app } from 'electron'
import path from 'path'
import { ProjectManager } from '../services/project-manager'
import { ProjectSavePayload } from '../../shared/types/project-manifest'

export function registerProjectHandlers(projectManager: ProjectManager) {
  ipcMain.handle(
    'project:create',
    async (_event, name: string, location?: string) => {
      try {
        let targetLocation = location
        if (!targetLocation) {
          const { filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Project Location',
            buttonLabel: 'Select',
          })
          if (filePaths && filePaths.length > 0) {
            targetLocation = filePaths[0]
          } else {
            return { success: false, error: 'Cancelled' }
          }
        }

        const projectPath = await projectManager.createProject(
          name,
          targetLocation
        )
        return { success: true, data: projectPath }
      } catch (error: any) {
        console.error('Project create error:', error)
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('project:open', async (_event, projectPath?: string) => {
    try {
      let targetPath = projectPath
      if (!targetPath) {
        const { filePaths } = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Open Project',
          // Note: macOS doesn't filter directories by extension well in openDialog,
          // but we can guide the user.
          message: 'Select a .wansan project directory',
        })
        if (filePaths && filePaths.length > 0) {
          targetPath = filePaths[0]
        } else {
          return { success: false, error: 'Cancelled' }
        }
      }

      const result = await projectManager.openProject(targetPath)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Project open error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(
    'project:save',
    async (_event, path: string, data: ProjectSavePayload) => {
      try {
        await projectManager.saveProject(path, data)
        return { success: true }
      } catch (error: any) {
        console.error('Project save error:', error)
        return { success: false, error: error.message }
      }
    }
  )

  ipcMain.handle('project:close', async () => {
    try {
      await projectManager.closeProject()
      return { success: true }
    } catch (error: any) {
      console.error('Project close error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('project:get-default-path', async () => {
    const documents = app.getPath('documents')
    return path.join(documents, 'Wansan')
  })
}
