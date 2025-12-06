import * as fs from 'fs-extra';
import { extname } from 'path';
import { DatabaseService } from '../database/duckdb';
import { ingestExcelFile } from '../engine/ingestion';

export class FileService {
  constructor(private databaseService: DatabaseService) {}

  async parseFile(filePath: string) {
    const ext = extname(filePath).toLowerCase();

    switch (ext) {
      case '.xlsx':
      case '.xls':
        return this.parseExcelFile(filePath);
      case '.csv':
        return this.parseCSVFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async parseExcelFile(filePath: string) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const { tableName, /*columns*/ } = await ingestExcelFile(fileBuffer, this.databaseService.getDb());

      // Post-ingestion queries to get additional info
      const schema = await this.databaseService.getSchema(tableName);
      const preview = await this.databaseService.query(`SELECT * FROM "${tableName}" LIMIT 5`);
      const countResult = await this.databaseService.query(`SELECT COUNT(*) as count FROM "${tableName}"`);

      return {
        tableName,
        schema,
        rowCount: countResult[0].count,
        preview
      };
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseCSVFile(filePath: string) {
    try {
      // Using DuckDB's CSV reader is efficient.
      const tableName = `t_${Date.now()}`;
      const sql = `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${filePath.replace(/\\/g, '/')}')`;

      await this.databaseService.query(sql);

      // Get schema and preview data
      const schema = await this.databaseService.getSchema(tableName);
      const preview = await this.databaseService.query(`SELECT * FROM "${tableName}" LIMIT 5`);
      const countResult = await this.databaseService.query(`SELECT COUNT(*) as count FROM "${tableName}"`);

      return {
        tableName,
        schema,
        rowCount: countResult[0].count,
        preview
      };
    } catch (error) {
      throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
