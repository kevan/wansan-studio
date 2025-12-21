import {
  ProjectState as NewProjectState,
  useProjectStore,
} from './useProjectStore'
import {
  ColumnSchema,
  FileNode,
  SelectedNode,
  SelectedNodeType,
  SyncStatus,
} from '@shared/types'
import { Relation } from '@shared/types/project'

// Re-export shared types to maintain compatibility
export type { ColumnSchema, FileNode, SyncStatus }
export type { Relation }
export type { SelectedNode, SelectedNodeType }
export type FileAsset = FileNode

// Alias State Interface
export type ProjectState = NewProjectState

/**
 * @deprecated useFileStore is deprecated. Please use useProjectStore instead.
 * This is a compatibility layer forwarding all calls to useProjectStore.
 */
export const useFileStore = useProjectStore
