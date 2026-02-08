export type DBRequestType =
  | 'CONNECT'
  | 'QUERY'
  | 'EXEC'
  | 'TEST'
  | 'TEST_CONNECTION'
  | 'GET_SCHEMA'
  | 'DELETE_TABLE'
  | 'INGEST_FILE'
  | 'CLOSE'
  | 'CHECKPOINT'

export interface DBRequest {
  reqId: string
  type: DBRequestType
  payload?: unknown
}

export interface DBResponse {
  reqId: string
  success: boolean
  data?: any // We'll keep data as any for now because it's often cast to any[]
  error?: string
  meta?: any
}
