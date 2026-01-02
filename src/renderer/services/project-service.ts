import {
  ProjectSavePayload,
  ProjectLoadResult,
} from '../../shared/types/project-manifest'

async function invoke<T>(channel: string, ...args: any[]): Promise<T> {
  const result = await window.electronAPI.invoke(channel, ...args)
  if (!result.success) {
    throw new Error(result.error || 'Unknown IPC error')
  }
  return result.data as T
}

export const projectService = {
  create: (name: string, location: string) =>
    invoke<string>('project:create', name, location),

  open: (path?: string) => invoke<ProjectLoadResult>('project:open', path),

  save: (path: string, data: ProjectSavePayload) =>
    invoke<void>('project:save', path, data),

  close: () => invoke<void>('project:close'),

  getDefaultLocation: async () => {
    const path = await invoke<string>('get-path', 'documents')
    return path + '/Wansan'
  },

  selectDirectory: () => invoke<string>('select-directory'),
}
