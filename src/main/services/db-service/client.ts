import { utilityProcess, UtilityProcess, app } from 'electron';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DBRequest, DBResponse } from '../../../shared/types/ipc-db';
import fs from 'fs';

export class NativeDBClient {
  private child: UtilityProcess | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; returnFull?: boolean }>();
  private isInitializing = false;
  private isReady = false;

  async init() {
    if (this.child || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Use absolute path from app root for both dev and prod to be safe
      // Tsup outputs to dist/main/services/db-service/entry.cjs
      const entryPath = join(app.getAppPath(), 'dist/main/services/db-service/entry.cjs');
      
      console.log(`[DB-Client] Checking entry file: ${entryPath}`);
      if (!fs.existsSync(entryPath)) {
        throw new Error(`Entry file not found at ${entryPath}`);
      }

      console.log(`[DB-Client] Spawning Utility Process...`);
      this.child = utilityProcess.fork(entryPath, [], {
        serviceName: 'Wansan-DB-Service',
        stdio: 'inherit'
      });

      this.child.on('spawn', () => {
        console.log(`[DB-Client] Utility Process successfully spawned (PID: ${this.child?.pid})`);
      });

      this.child.on('message', (msg: DBResponse) => {
        const handler = this.pendingRequests.get(msg.reqId);
        if (handler) {
          if (msg.success) {
             if (handler.returnFull) {
                 handler.resolve(msg);
             } else {
                 handler.resolve(msg.data);
             }
          } else {
             handler.reject(new Error(msg.error));
          }
          this.pendingRequests.delete(msg.reqId);
        }
      });

      this.child.on('exit', (code) => {
        console.error(`[DB-Client] Utility Process exited with code: ${code}`);
        this.child = null;
        this.isReady = false;
      });

      // Wait for initial connection
      await this.connect(':memory:');
      this.isReady = true;
      console.log(`[DB-Client] Native DB Client is ready`);
    } catch (err) {
      console.error(`[DB-Client] Failed to initialize:`, err);
      this.child = null;
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  async executeQuery(sql: string) {
    const res = await this.executeQueryFull(sql);
    return res.data;
  }

  async executeQueryFull(sql: string): Promise<{ data: any[], meta?: any }> {
    if (!this.isReady && !this.isInitializing) {
        await this.init();
    }
    const res = await this.sendFull('QUERY', { sql });
    return {
        data: res.data || [],
        meta: res.meta
    };
  }

  // Refactored send to support full response
  private sendFull(type: DBRequest['type'], payload: any): Promise<DBResponse> {
     if (!this.child) {
      return Promise.reject(new Error('DB Service not initialized. Child process is null.'));
    }

    return new Promise((resolve, reject) => {
      const reqId = uuidv4();
      // Store resolve/reject that expects DBResponse or error
      // But my pendingRequests structure expects { resolve: Function, reject: Function }
      // The current message handler logic:
      // if (msg.success) handler.resolve(msg.data);
      // I need to change this logic if I want to return the whole message.
      
      // HACK: I will introduce a special flag in the request or handle it differently?
      // No, let's just change the pendingRequests map to store a 'returnFull' flag?
      // Or cleaner: Refactor send() to ALWAYS return full response, and let helper methods unwrap it.
      
      // Let's modify the handler logic in init():
      this.pendingRequests.set(reqId, { resolve, reject, returnFull: true } as any);
      this.child?.postMessage({ reqId, type, payload } as DBRequest);
    });
  }

  private async send(type: DBRequest['type'], payload: any): Promise<any> {
      const res = await this.sendFull(type, payload);
      return res.data;
  }

  async connect(path?: string) {
    return this.send('CONNECT', { path });
  }

  async getSchema(tableName?: string) {
    if (!this.isReady && !this.isInitializing) await this.init();
    return this.send('GET_SCHEMA', { tableName });
  }

  async deleteTable(tableName: string) {
    if (!this.isReady && !this.isInitializing) await this.init();
    return this.send('DELETE_TABLE', { tableName });
  }

  async ingestFile(tableName: string, filePath: string, format: 'csv' | 'json') {
    if (!this.isReady && !this.isInitializing) await this.init();
    return this.send('INGEST_FILE', { tableName, filePath, format });
  }

  async stop() {
    if (this.child) {
      if (this.isReady) {
          try {
              // Try graceful close first
              await this.sendFull('CLOSE', {});
          } catch (e) {
              console.warn('[NativeDB] Graceful close failed, forcing kill.', e);
          }
      }
      this.child.kill();
      this.child = null;
      this.isReady = false;
      this.isInitializing = false;
      this.pendingRequests.clear();
    }
  }
}

export const dbClient = new NativeDBClient();
