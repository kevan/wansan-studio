import * as fs from 'fs-extra';
import { extname, basename } from 'path';
import { DatabaseService } from '../database/duckdb';
import { ingestExcelFile, getUniqueTableName } from '../engine/ingestion';

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
      const fileName = basename(filePath);
      const { tableName, description } = await ingestExcelFile(fileBuffer, this.databaseService.getDb(), fileName);

      // Post-ingestion queries to get additional info
      const schema = await this.databaseService.getSchema(tableName);
      if (description) {
        schema.description = description;
      }
      
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
      const fileName = basename(filePath);
      // Using DuckDB's CSV reader is efficient.
      const tableName = await getUniqueTableName(this.databaseService.getDb(), fileName);
      const sql = `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${filePath.replace(/\\/g, '/')}')`;

      await this.databaseService.query(sql);

      // Get schema and preview data
      const schema = await this.databaseService.getSchema(tableName);
      schema.description = fileName;

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
