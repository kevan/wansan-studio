import { DuckDBInstance } from '@duckdb/node-api';
import { DBRequest, DBResponse } from '../../../shared/types/ipc-db';
import { sanitizeValue } from '../../../shared/serialization';

let db: DuckDBInstance | null = null;
let connection: any = null;

async function handleMessage(msg: DBRequest) {
  const { reqId, type, payload } = msg;

  try {
    switch (type) {
      case 'CONNECT': {
        const path = payload?.path || ':memory:';
        db = await DuckDBInstance.create(path);
        connection = await db.connect();
        process.parentPort?.postMessage({
          reqId,
          success: true,
          data: { status: 'Connected', path }
        } as DBResponse);
        break;
      }

      case 'QUERY': {
        if (!db || !connection) {
          throw new Error('Database not connected. Please call CONNECT first.');
        }

        const result = await connection.run(payload.sql);
        const rows = await result.getRowObjectsJS();

        // CRITICAL: Convert BigInts for JSON serialization
        const serializedRows = sanitizeValue(rows);

        process.parentPort?.postMessage({
          reqId,
          success: true,
          data: serializedRows
        } as DBResponse);
        break;
      }

      case 'TEST':
      case 'TEST_CONNECTION': {
        if (!db || !connection) {
          // Auto-init for test if not connected
          db = await DuckDBInstance.create(':memory:');
          connection = await db.connect();
        }
        const result = await connection.run("SELECT 'Native DuckDB is Alive' as status");
        const rows = await result.getRowObjectsJS();
        process.parentPort?.postMessage({
          reqId,
          success: true,
          data: rows[0]
        } as DBResponse);
        break;
      }

      default:
        throw new Error(`Unsupported request type: ${type}`);
    }
  } catch (err: any) {
    process.parentPort?.postMessage({
      reqId,
      success: false,
      error: err.message
    } as DBResponse);
  }
}

if (process.parentPort) {
  process.parentPort.on('message', (e) => {
    handleMessage(e.data);
  });
}

console.log('[DB-Service] Utility Process Entry Ready');
