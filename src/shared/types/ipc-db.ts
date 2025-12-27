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
  payload?: any
}

export interface DBResponse {
  reqId: string
  success: boolean
  data?: any
  error?: string
  meta?: any
}
