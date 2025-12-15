export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
  deepseek: {
    name: 'DeepSeek (深度求索)',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-coder'],
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  moonshot: {
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    getKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  custom: {
    name: 'Custom / Proxy',
    baseUrl: '',
    models: [] as string[],
    getKeyUrl: '',
  },
} as const

export type AIProviderKey = keyof typeof AI_PROVIDERS
