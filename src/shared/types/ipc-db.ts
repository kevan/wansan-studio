export type DBRequestType = 'CONNECT' | 'QUERY' | 'EXEC' | 'TEST' | 'TEST_CONNECTION';

export interface DBRequest {
  reqId: string;
  type: DBRequestType;
  payload?: any;
}

export interface DBResponse {
  reqId: string;
  success: boolean;
  data?: any;
  error?: string;
  meta?: any;
}
