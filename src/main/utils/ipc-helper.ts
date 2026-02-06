import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { IPCContract } from '../../shared/ipc-contract'

/**
 * A typed wrapper around ipcMain.handle to ensure the handler 
 * follows the defined IPCContract.
 */
export function registerHandler<K extends keyof IPCContract>(
  channel: K,
  handler: (
    event: IpcMainInvokeEvent,
    params: IPCContract[K]['params']
  ) => Promise<IPCContract[K]['return']>
) {
  ipcMain.handle(channel, async (event, params) => {
    try {
      // In Electron, if params is undefined (void channel), it comes as undefined.
      // If it's a multi-argument call (not our paradigm), it would be extra arguments.
      // But since we enforced Named Arguments (Object), params will be the first argument.
      return await handler(event, params)
    } catch (error: any) {
      console.error(`[IPC Handler Error] Channel: ${channel}`, error)
      return {
        success: false,
        error: error.message || 'Internal process error'
      }
    }
  })
}
