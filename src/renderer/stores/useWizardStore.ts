import { create } from 'zustand'
import {
  WizardState,
  WizardStep,
  WizardMode,
  IngestionTask,
  ColumnConfig,
} from '@shared/types/wizard'

interface WizardActions {
  open: (mode?: WizardMode, targetTableId?: string) => void
  close: () => void
  setStep: (step: WizardStep) => void
  setFiles: (files: { path: string; name: string; size: number }[]) => void

  // Task Management
  setTasks: (tasks: IngestionTask[]) => void
  updateTask: (index: number, updates: Partial<IngestionTask>) => void
  nextTask: () => boolean // Returns true if moved to next, false if last
  prevTask: () => boolean

  // Column Management
  updateColumnConfig: (
    taskIndex: number,
    columnName: string,
    updates: Partial<ColumnConfig>
  ) => void

  setProcessing: (val: boolean) => void
  reset: () => void
}

const initialState: WizardState = {
  isOpen: false,
  step: 'select',
  mode: 'import',
  selectedFiles: [],
  tasks: [],
  currentTaskIndex: 0,
  isProcessing: false,
}

export const useWizardStore = create<WizardState & WizardActions>(
  (set, get) => ({
    ...initialState,

    open: (mode = 'import', targetTableId) =>
      set({ ...initialState, isOpen: true, mode, targetTableId, tasks: [] }), // Save targetTableId

    close: () => set({ isOpen: false }),

    setStep: step => set({ step }),

    setFiles: selectedFiles => set({ selectedFiles }),

    setTasks: tasks => set({ tasks, currentTaskIndex: 0 }),

    updateTask: (index, updates) =>
      set(state => {
        const newTasks = [...state.tasks]
        newTasks[index] = { ...newTasks[index], ...updates }
        return { tasks: newTasks }
      }),

    nextTask: () => {
      const { currentTaskIndex, tasks } = get()
      if (currentTaskIndex < tasks.length - 1) {
        set({ currentTaskIndex: currentTaskIndex + 1 })
        return true
      }
      return false
    },

    prevTask: () => {
      const { currentTaskIndex } = get()
      if (currentTaskIndex > 0) {
        set({ currentTaskIndex: currentTaskIndex - 1 })
        return true
      }
      return false
    },

    updateColumnConfig: (taskIndex, columnName, updates) =>
      set(state => {
        const newTasks = [...state.tasks]
        const task = newTasks[taskIndex]
        if (!task) return state

        const newColumns = task.columns.map(col =>
          col.name === columnName ? { ...col, ...updates } : col
        )

        // Ensure only one primary key if isPrimaryKey is being set
        if (updates.isPrimaryKey) {
          newColumns.forEach(c => {
            if (c.name !== columnName) c.isPrimaryKey = false
          })
        }

        newTasks[taskIndex] = { ...task, columns: newColumns }
        return { tasks: newTasks }
      }),

    setProcessing: isProcessing => set({ isProcessing }),

    reset: () => set(initialState),
  })
)
