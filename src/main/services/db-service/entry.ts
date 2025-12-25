import { DuckDBInstance } from '@duckdb/node-api';
import { DBRequest, DBResponse } from '../../../shared/types/ipc-db';
import { sanitizeValue } from '../../../shared/serialization';
import { normalizeDuckDBType } from '../../../shared/type-utils';

let db: DuckDBInstance | null = null;
let connection: any = null;

async function handleMessage(msg: DBRequest) {
  const { reqId, type, payload } = msg;

  try {
    switch (type) {
      case 'CONNECT': {
        if (connection) {
          try {
             // connection.close() is not always exposed in all bindings, 
             // but usually letting it GC is enough if we nullify it. 
             // However, for file locks, we might need to be careful.
             // @duckdb/node-api usually relies on object destruction.
             // Let's just nullify for now or check if close exists.
             // Based on docs/bindings, closing is often implicit or via close().
             // Let's assume we just replace the references.
             // ideally: await connection.close();
             // await db.close();
             // But for safety with unknown API surface in this context, let's nullify.
             connection = null;
             db = null;
          } catch (e) {
            console.warn('Error closing previous connection:', e);
          }
        }

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
        
        // Extract column metadata
        const columnNames = result.columnNames();
        const columnFields = columnNames.map((name: string, i: number) => ({
            name,
            type: normalizeDuckDBType(result.columnType(i).toString())
        }));

        // CRITICAL: Convert BigInts for JSON serialization
        const serializedRows = sanitizeValue(rows);

        process.parentPort?.postMessage({
          reqId,
          success: true,
          data: serializedRows,
          meta: { columnFields }
        } as DBResponse);
        break;
      }

      case 'GET_SCHEMA': {
        if (!db || !connection) throw new Error('Not connected');
        const tableName = payload?.tableName;
        
        if (tableName) {
            const result = await connection.run(`
                SELECT column_name as name, data_type as type, is_nullable as nullable
                FROM information_schema.columns
                WHERE table_name = '${tableName}'
                ORDER BY ordinal_position
            `);
            const rawColumns = await result.getRowObjectsJS();
            // Apply normalization to schema columns
            const columns = rawColumns.map((col: any) => ({
                ...col,
                type: normalizeDuckDBType(col.type)
            }));
            
            process.parentPort?.postMessage({
                reqId, success: true, data: { tableName, columns }
            } as DBResponse);
        } else {
            const tablesResult = await connection.run(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'"
            );
            const tables = await tablesResult.getRowObjectsJS();
            
            const tablesWithDetails = await Promise.all(tables.map(async (row: any) => {
                const tName = row.table_name;
                const colsResult = await connection.run(`
                    SELECT column_name as name, data_type as type, is_nullable as nullable
                    FROM information_schema.columns
                    WHERE table_name = '${tName}'
                    ORDER BY ordinal_position
                `);
                const rawCols = await colsResult.getRowObjectsJS();
                const columns = rawCols.map((col: any) => ({
                    ...col,
                    type: normalizeDuckDBType(col.type)
                }));
                return { tableName: tName, columns, description: '' };
            }));
            
            process.parentPort?.postMessage({
                reqId, success: true, data: { tables: tablesWithDetails }
            } as DBResponse);
        }
        break;
      }

      case 'DELETE_TABLE': {
        if (!db || !connection) throw new Error('Not connected');
        await connection.run(`DROP TABLE IF EXISTS "${payload.tableName}"`);
        process.parentPort?.postMessage({ reqId, success: true } as DBResponse);
        break;
      }

      case 'INGEST_FILE': {
        if (!db || !connection) throw new Error('Not connected');
        const { tableName, filePath, format } = payload;
        
        // Ensure path uses forward slashes for DuckDB
        const safePath = filePath.replace(/\\/g, '/');
        
        if (format === 'csv') {
            await connection.run(`
                CREATE TABLE "${tableName}" AS 
                SELECT * FROM read_csv_auto('${safePath}', HEADER=TRUE, auto_detect=true)
            `);
        } else if (format === 'json') {
            await connection.run(`
                CREATE TABLE "${tableName}" AS 
                SELECT * FROM read_json_auto('${safePath}', format='auto', auto_detect=true)
            `);
        } else {
            throw new Error(`Unsupported ingestion format: ${format}`);
        }
        
        process.parentPort?.postMessage({ reqId, success: true } as DBResponse);
        break;
      }

      case 'CLOSE': {
         try {
             // Explicitly close connection and db if possible
             // Note: @duckdb/node-api bindings might vary, but unref-ing is key
             connection = null;
             db = null;
             // If the binding exposes close(), we should call it. 
             // Assuming explicit close helps with WAL checkpointing.
         } catch (e) {
             console.error('Error during close:', e);
         }
         process.parentPort?.postMessage({ reqId, success: true } as DBResponse);
         // Optional: exit process? No, let the client kill it.
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
