import { generateAnalysis, inferRelationships } from '../engine/ai-bridge';
import type { TableSchema, AnalysisResult, RelationSuggestion } from '../../shared/types';

export class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.');
    }
  }

  /**
   * Generates a full analysis, including SQL, title, summary, and visualization config.
   * @param userQuery The natural language query from the user.
   * @param schemas The schemas of the available tables.
   * @returns A promise that resolves to the structured analysis result.
   */
  async getAnalysis(userQuery: string, schemas: TableSchema[]): Promise<AnalysisResult> {
    if (!this.hasApiKey()) {
      throw new Error('OpenAI API key is not set.');
    }
    return generateAnalysis(userQuery, schemas);
  }

  /**
   * Analyzes multiple table schemas to deduce potential Foreign Key relationships.
   * @param schemas The schemas of the tables to analyze.
   * @returns A promise that resolves to an array of relationship suggestions.
   */
  async getRelationSuggestions(schemas: TableSchema[]): Promise<RelationSuggestion[]> {
    if (!this.hasApiKey()) {
      throw new Error('OpenAI API key is not set.');
    }
    return inferRelationships(schemas);
  }
  
  setApiKey(apiKey: string) {
    process.env.OPENAI_API_KEY = apiKey;
  }

  hasApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}
