import { utilityProcess, UtilityProcess, app } from 'electron';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DBRequest, DBResponse } from '../../../shared/types/ipc-db';
import fs from 'fs';

export class NativeDBClient {
  private child: UtilityProcess | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
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
          if (msg.success) handler.resolve(msg.data);
          else handler.reject(new Error(msg.error));
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

  private async send(type: DBRequest['type'], payload: any): Promise<any> {
    // If not ready, try to wait or throw
    if (!this.child) {
      throw new Error('DB Service not initialized. Child process is null.');
    }

    return new Promise((resolve, reject) => {
      const reqId = uuidv4();
      this.pendingRequests.set(reqId, { resolve, reject });
      this.child?.postMessage({ reqId, type, payload } as DBRequest);
    });
  }

  async connect(path?: string) {
    return this.send('CONNECT', { path });
  }

  async executeQuery(sql: string) {
    if (!this.isReady && !this.isInitializing) {
        await this.init();
    }
    return this.send('QUERY', { sql });
  }

  async stop() {
    if (this.child) {
      this.child.kill();
      this.child = null;
      this.isReady = false;
    }
  }
}

export const dbClient = new NativeDBClient();
