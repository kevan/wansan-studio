import { dbClient } from './db-service/client';

export class NativeDatabaseService {
  constructor() {}

  async initialize(dbPath?: string): Promise<void> {
    console.log('[NativeDB] Initializing service adapter...');
    await dbClient.init();
    await dbClient.connect(dbPath);
    console.log(`[NativeDB] Service adapter initialized. Path: ${dbPath || ':memory:'}`);
  }

  async query(sql: string): Promise<any[]> {
    return dbClient.executeQuery(sql);
  }

  async queryWithSchema(sql: string): Promise<{ data: any[]; columnFields: Array<{ name: string; type: string }> }> {
    const res = await dbClient.executeQueryFull(sql);
    return {
        data: res.data || [],
        columnFields: res.meta?.columnFields || []
    };
  }

  async exec(sql: string): Promise<void> {
    await dbClient.executeQuery(sql);
  }

  async getSchema(tableName?: string): Promise<any> {
    return dbClient.getSchema(tableName);
  }

  async dropAllTables(): Promise<void> {
    // Get all tables first
    const schema = await this.getSchema();
    const tables = schema.tables || [];
    
    for (const t of tables) {
        await dbClient.deleteTable(t.tableName);
    }
  }

  async close(): Promise<void> {
    await dbClient.stop();
  }

  // WASM Legacy Methods (Stubs)
  async registerFileText(filename: string, data: string): Promise<void> {
    console.warn('[NativeDB] registerFileText is not needed in native mode.');
  }

  async dropFile(filename: string): Promise<void> {
    console.warn('[NativeDB] dropFile is not needed in native mode.');
  }

  // Accessors
  getDb(): any {
    throw new Error('Direct DB access not supported in Native mode (IPC only).');
  }

  getConn(): any {
    throw new Error('Direct Connection access not supported in Native mode (IPC only).');
  }
}
