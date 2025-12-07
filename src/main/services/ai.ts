import Store from 'electron-store';
import { generateAnalysis, inferRelationships, setAIConfig, isAIConfigured } from '../engine/ai-bridge';
import type { TableSchema, AnalysisResult, RelationSuggestion } from '../../shared/types';

interface AIConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

// Define schema for electron-store
const schema = {
  aiConfig: {
    type: 'object',
    properties: {
      apiKey: { type: 'string' },
      baseURL: { type: 'string' },
      model: { type: 'string' }
    },
    default: {
      model: 'gpt-4-turbo-preview'
    }
  }
} as const;

const store = new Store({ schema });

export class AIService {
  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const config = store.get('aiConfig') as AIConfig;
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    const baseURL = config.baseURL || process.env.OPENAI_BASE_URL;
    const model = config.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

    setAIConfig({ apiKey, baseURL, model });

    if (!isAIConfigured()) {
      console.warn('AI Service: Not configured (missing API Key).');
    }
  }

  /**
   * Generates a full analysis.
   */
  async getAnalysis(userQuery: string, schemas: TableSchema[]): Promise<AnalysisResult> {
    return generateAnalysis(userQuery, schemas);
  }

  /**
   * Analyzes multiple table schemas.
   */
  async getRelationSuggestions(schemas: TableSchema[]): Promise<RelationSuggestion[]> {
    return inferRelationships(schemas);
  }
  
  /**
   * Sets and persists AI configuration.
   */
  setConfig(config: AIConfig) {
    const current = store.get('aiConfig') as AIConfig;
    const newConfig = { ...current, ...config };
    store.set('aiConfig', newConfig);
    
    // Reload to apply
    this.loadConfig();
  }

  /**
   * Gets current persisted configuration.
   */
  getConfig(): AIConfig {
    return store.get('aiConfig') as AIConfig;
  }

  hasApiKey(): boolean {
    return isAIConfigured();
  }
}
