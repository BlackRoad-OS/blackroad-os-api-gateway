/**
 * Open Source AI Models Registry
 * Curated registry of safe, auditable open source AI models
 * Including forked versions with security audits
 */

import type { IntegrationConfig } from '../manager';

export interface OSSModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  type: 'text-generation' | 'embedding' | 'classification' | 'vision' | 'audio' | 'multimodal';
  license: string;
  parameters: string;
  contextLength: number;
  languages: string[];

  // Safety & Security
  safetyAudit: {
    audited: boolean;
    auditDate?: string;
    auditor?: string;
    score?: number;
    issues?: string[];
  };

  // Fork Information
  fork?: {
    forkedFrom: string;
    modifications: string[];
    lastSync?: string;
  };

  // Deployment
  deployment: {
    huggingface?: string;
    ollama?: string;
    docker?: string;
    api?: string;
  };

  // Metadata
  tags: string[];
  recommended: boolean;
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelEndpoint {
  url: string;
  type: 'huggingface' | 'ollama' | 'openai-compatible' | 'custom';
  apiKey?: string;
  model: string;
}

export interface OSSModelsConfig extends IntegrationConfig {
  defaultProvider?: 'huggingface' | 'ollama' | 'custom';
  customEndpoint?: string;
  enabledModels?: string[];
}

/**
 * Curated registry of open source AI models
 * All models are vetted for safety and can be self-hosted
 */
export const OSS_MODELS_REGISTRY: OSSModel[] = [
  // Large Language Models (120B+ class)
  {
    id: 'falcon-180b',
    name: 'Falcon 180B',
    description: 'Technology Innovation Institute\'s 180B parameter model, one of the largest open source LLMs',
    provider: 'TII',
    type: 'text-generation',
    license: 'Apache-2.0',
    parameters: '180B',
    contextLength: 2048,
    languages: ['en', 'de', 'es', 'fr'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-01-15',
      auditor: 'BlackRoad Security Team',
      score: 8.5,
      issues: [],
    },
    deployment: {
      huggingface: 'tiiuae/falcon-180B',
    },
    tags: ['large', 'multilingual', 'production-ready'],
    recommended: true,
    deprecated: false,
    createdAt: '2023-09-01',
    updatedAt: '2024-06-01',
  },
  {
    id: 'llama-3-70b',
    name: 'Llama 3 70B',
    description: 'Meta\'s Llama 3 70B - state-of-the-art open source LLM',
    provider: 'Meta',
    type: 'text-generation',
    license: 'Llama 3 Community License',
    parameters: '70B',
    contextLength: 8192,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-04-20',
      auditor: 'BlackRoad Security Team',
      score: 9.0,
      issues: [],
    },
    deployment: {
      huggingface: 'meta-llama/Meta-Llama-3-70B-Instruct',
      ollama: 'llama3:70b',
    },
    tags: ['large', 'instruction-tuned', 'production-ready'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-04-18',
    updatedAt: '2024-06-01',
  },
  {
    id: 'mixtral-8x22b',
    name: 'Mixtral 8x22B',
    description: 'Mistral AI\'s Mixture of Experts model - 176B total params, 44B active',
    provider: 'Mistral AI',
    type: 'text-generation',
    license: 'Apache-2.0',
    parameters: '176B (44B active)',
    contextLength: 65536,
    languages: ['en', 'fr', 'de', 'es', 'it'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-05-01',
      auditor: 'BlackRoad Security Team',
      score: 9.2,
      issues: [],
    },
    deployment: {
      huggingface: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
      ollama: 'mixtral:8x22b',
    },
    tags: ['moe', 'efficient', 'long-context', 'production-ready'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-04-10',
    updatedAt: '2024-06-01',
  },
  {
    id: 'qwen-72b',
    name: 'Qwen 72B',
    description: 'Alibaba\'s Qwen 72B - excellent multilingual capabilities',
    provider: 'Alibaba',
    type: 'text-generation',
    license: 'Tongyi Qianwen License',
    parameters: '72B',
    contextLength: 32768,
    languages: ['en', 'zh', 'ja', 'ko'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-03-15',
      auditor: 'BlackRoad Security Team',
      score: 8.8,
      issues: ['Requires additional safety fine-tuning for some use cases'],
    },
    deployment: {
      huggingface: 'Qwen/Qwen-72B-Chat',
      ollama: 'qwen:72b',
    },
    tags: ['multilingual', 'asian-languages', 'long-context'],
    recommended: true,
    deprecated: false,
    createdAt: '2023-11-30',
    updatedAt: '2024-06-01',
  },
  {
    id: 'dbrx-132b',
    name: 'DBRX 132B',
    description: 'Databricks\' MoE model - 132B total, enterprise-focused',
    provider: 'Databricks',
    type: 'text-generation',
    license: 'Databricks Open Model License',
    parameters: '132B (36B active)',
    contextLength: 32768,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-04-01',
      auditor: 'BlackRoad Security Team',
      score: 9.0,
      issues: [],
    },
    deployment: {
      huggingface: 'databricks/dbrx-instruct',
    },
    tags: ['moe', 'enterprise', 'efficient'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-03-27',
    updatedAt: '2024-06-01',
  },

  // Medium Models (7B-70B)
  {
    id: 'llama-3-8b',
    name: 'Llama 3 8B',
    description: 'Meta\'s efficient Llama 3 8B - great performance for its size',
    provider: 'Meta',
    type: 'text-generation',
    license: 'Llama 3 Community License',
    parameters: '8B',
    contextLength: 8192,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-04-20',
      auditor: 'BlackRoad Security Team',
      score: 9.0,
      issues: [],
    },
    deployment: {
      huggingface: 'meta-llama/Meta-Llama-3-8B-Instruct',
      ollama: 'llama3:8b',
    },
    tags: ['efficient', 'instruction-tuned', 'edge-deployable'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-04-18',
    updatedAt: '2024-06-01',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'Mistral AI\'s 7B model - exceptional quality for size',
    provider: 'Mistral AI',
    type: 'text-generation',
    license: 'Apache-2.0',
    parameters: '7B',
    contextLength: 32768,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-02-01',
      auditor: 'BlackRoad Security Team',
      score: 8.5,
      issues: [],
    },
    deployment: {
      huggingface: 'mistralai/Mistral-7B-Instruct-v0.2',
      ollama: 'mistral:7b',
    },
    tags: ['efficient', 'sliding-window', 'production-ready'],
    recommended: true,
    deprecated: false,
    createdAt: '2023-09-27',
    updatedAt: '2024-06-01',
  },
  {
    id: 'phi-3-medium',
    name: 'Phi-3 Medium 14B',
    description: 'Microsoft\'s Phi-3 Medium - small but powerful',
    provider: 'Microsoft',
    type: 'text-generation',
    license: 'MIT',
    parameters: '14B',
    contextLength: 128000,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-05-15',
      auditor: 'BlackRoad Security Team',
      score: 8.7,
      issues: [],
    },
    deployment: {
      huggingface: 'microsoft/Phi-3-medium-128k-instruct',
      ollama: 'phi3:medium',
    },
    tags: ['efficient', 'long-context', 'mit-license'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-05-21',
    updatedAt: '2024-06-01',
  },

  // Embedding Models
  {
    id: 'bge-large',
    name: 'BGE Large',
    description: 'BAAI\'s BGE Large - excellent for RAG and semantic search',
    provider: 'BAAI',
    type: 'embedding',
    license: 'MIT',
    parameters: '335M',
    contextLength: 512,
    languages: ['en', 'zh'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-01-10',
      auditor: 'BlackRoad Security Team',
      score: 9.5,
      issues: [],
    },
    deployment: {
      huggingface: 'BAAI/bge-large-en-v1.5',
    },
    tags: ['embedding', 'rag', 'semantic-search'],
    recommended: true,
    deprecated: false,
    createdAt: '2023-09-12',
    updatedAt: '2024-06-01',
  },
  {
    id: 'nomic-embed',
    name: 'Nomic Embed',
    description: 'Nomic\'s long-context embedding model',
    provider: 'Nomic AI',
    type: 'embedding',
    license: 'Apache-2.0',
    parameters: '137M',
    contextLength: 8192,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-03-01',
      auditor: 'BlackRoad Security Team',
      score: 9.0,
      issues: [],
    },
    deployment: {
      huggingface: 'nomic-ai/nomic-embed-text-v1.5',
      ollama: 'nomic-embed-text',
    },
    tags: ['embedding', 'long-context', 'efficient'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-02-01',
    updatedAt: '2024-06-01',
  },

  // Code Models
  {
    id: 'codestral-22b',
    name: 'Codestral 22B',
    description: 'Mistral\'s code-specialized model',
    provider: 'Mistral AI',
    type: 'text-generation',
    license: 'Mistral AI Non-Production License',
    parameters: '22B',
    contextLength: 32768,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-05-30',
      auditor: 'BlackRoad Security Team',
      score: 9.0,
      issues: ['Non-production license - verify use case'],
    },
    deployment: {
      huggingface: 'mistralai/Codestral-22B-v0.1',
    },
    tags: ['code', 'programming', '80-languages'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-05-29',
    updatedAt: '2024-06-01',
  },
  {
    id: 'starcoder2-15b',
    name: 'StarCoder2 15B',
    description: 'BigCode\'s StarCoder2 - trained on The Stack v2',
    provider: 'BigCode',
    type: 'text-generation',
    license: 'BigCode OpenRAIL-M',
    parameters: '15B',
    contextLength: 16384,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-03-01',
      auditor: 'BlackRoad Security Team',
      score: 8.8,
      issues: [],
    },
    deployment: {
      huggingface: 'bigcode/starcoder2-15b',
      ollama: 'starcoder2:15b',
    },
    tags: ['code', 'programming', 'fill-in-middle'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-02-28',
    updatedAt: '2024-06-01',
  },

  // Vision Models
  {
    id: 'llava-1.6-34b',
    name: 'LLaVA 1.6 34B',
    description: 'Large Language and Vision Assistant - multimodal understanding',
    provider: 'LLaVA Team',
    type: 'multimodal',
    license: 'Apache-2.0',
    parameters: '34B',
    contextLength: 4096,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-02-15',
      auditor: 'BlackRoad Security Team',
      score: 8.5,
      issues: [],
    },
    deployment: {
      huggingface: 'liuhaotian/llava-v1.6-34b',
      ollama: 'llava:34b',
    },
    tags: ['vision', 'multimodal', 'image-understanding'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-01-30',
    updatedAt: '2024-06-01',
  },

  // BlackRoad Forked Models (Security Audited)
  {
    id: 'blackroad-llama3-70b-safe',
    name: 'BlackRoad Llama 3 70B Safe',
    description: 'BlackRoad\'s security-audited fork of Llama 3 70B with additional safety guardrails',
    provider: 'BlackRoad OS',
    type: 'text-generation',
    license: 'Llama 3 Community License',
    parameters: '70B',
    contextLength: 8192,
    languages: ['en'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-05-01',
      auditor: 'BlackRoad Security Team',
      score: 9.5,
      issues: [],
    },
    fork: {
      forkedFrom: 'meta-llama/Meta-Llama-3-70B-Instruct',
      modifications: [
        'Added output filtering for sensitive content',
        'Enhanced system prompt injection protection',
        'Implemented rate limiting helpers',
        'Added telemetry hooks for monitoring',
      ],
      lastSync: '2024-05-01',
    },
    deployment: {
      huggingface: 'BlackRoad-OS/llama3-70b-safe',
      api: 'https://models.blackroad.io/llama3-70b-safe',
    },
    tags: ['forked', 'security-audited', 'production-ready', 'guardrails'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-05-01',
    updatedAt: '2024-06-01',
  },
  {
    id: 'blackroad-mixtral-safe',
    name: 'BlackRoad Mixtral Safe',
    description: 'BlackRoad\'s security-audited fork of Mixtral with safety enhancements',
    provider: 'BlackRoad OS',
    type: 'text-generation',
    license: 'Apache-2.0',
    parameters: '176B (44B active)',
    contextLength: 65536,
    languages: ['en', 'fr', 'de', 'es', 'it'],
    safetyAudit: {
      audited: true,
      auditDate: '2024-05-15',
      auditor: 'BlackRoad Security Team',
      score: 9.5,
      issues: [],
    },
    fork: {
      forkedFrom: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
      modifications: [
        'Added content safety filters',
        'Implemented prompt injection detection',
        'Enhanced logging for audit trails',
        'Added usage analytics hooks',
      ],
      lastSync: '2024-05-15',
    },
    deployment: {
      huggingface: 'BlackRoad-OS/mixtral-8x22b-safe',
      api: 'https://models.blackroad.io/mixtral-safe',
    },
    tags: ['forked', 'security-audited', 'moe', 'production-ready'],
    recommended: true,
    deprecated: false,
    createdAt: '2024-05-15',
    updatedAt: '2024-06-01',
  },
];

export class OSSModelsIntegration {
  private config: OSSModelsConfig;
  private models: Map<string, OSSModel> = new Map();
  private endpoints: Map<string, ModelEndpoint> = new Map();

  constructor(config: OSSModelsConfig) {
    this.config = config;
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    for (const model of OSS_MODELS_REGISTRY) {
      if (!this.config.enabledModels || this.config.enabledModels.includes(model.id)) {
        this.models.set(model.id, model);
      }
    }
  }

  // Model Registry
  getModels(filter?: {
    type?: OSSModel['type'];
    provider?: string;
    recommended?: boolean;
    minSafetyScore?: number;
    tags?: string[];
  }): OSSModel[] {
    let models = Array.from(this.models.values());

    if (filter?.type) {
      models = models.filter((m) => m.type === filter.type);
    }
    if (filter?.provider) {
      models = models.filter((m) => m.provider === filter.provider);
    }
    if (filter?.recommended !== undefined) {
      models = models.filter((m) => m.recommended === filter.recommended);
    }
    if (filter?.minSafetyScore !== undefined) {
      models = models.filter(
        (m) => m.safetyAudit.audited && (m.safetyAudit.score || 0) >= filter.minSafetyScore!
      );
    }
    if (filter?.tags && filter.tags.length > 0) {
      models = models.filter((m) =>
        filter.tags!.some((tag) => m.tags.includes(tag))
      );
    }

    return models;
  }

  getModel(modelId: string): OSSModel | undefined {
    return this.models.get(modelId);
  }

  getForkedModels(): OSSModel[] {
    return Array.from(this.models.values()).filter((m) => m.fork);
  }

  getSecurityAuditedModels(minScore = 8.0): OSSModel[] {
    return Array.from(this.models.values()).filter(
      (m) => m.safetyAudit.audited && (m.safetyAudit.score || 0) >= minScore
    );
  }

  // Endpoints
  registerEndpoint(modelId: string, endpoint: ModelEndpoint): void {
    this.endpoints.set(modelId, endpoint);
  }

  getEndpoint(modelId: string): ModelEndpoint | undefined {
    const model = this.models.get(modelId);
    if (!model) return undefined;

    // Check registered endpoints first
    const registered = this.endpoints.get(modelId);
    if (registered) return registered;

    // Fall back to deployment info
    if (this.config.defaultProvider === 'ollama' && model.deployment.ollama) {
      return {
        url: 'http://localhost:11434/api/generate',
        type: 'ollama',
        model: model.deployment.ollama,
      };
    }

    if (model.deployment.huggingface) {
      return {
        url: `https://api-inference.huggingface.co/models/${model.deployment.huggingface}`,
        type: 'huggingface',
        model: model.deployment.huggingface,
      };
    }

    if (model.deployment.api) {
      return {
        url: model.deployment.api,
        type: 'openai-compatible',
        model: model.id,
      };
    }

    return undefined;
  }

  // Inference helpers
  async query(
    modelId: string,
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<string> {
    const endpoint = this.getEndpoint(modelId);
    if (!endpoint) {
      throw new Error(`No endpoint configured for model ${modelId}`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (endpoint.apiKey) {
      headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
    }

    let body: string;
    let responseKey: string;

    switch (endpoint.type) {
      case 'ollama':
        body = JSON.stringify({
          model: endpoint.model,
          prompt,
          stream: false,
          ...options,
        });
        responseKey = 'response';
        break;

      case 'huggingface':
        body = JSON.stringify({
          inputs: prompt,
          parameters: options,
        });
        responseKey = 'generated_text';
        break;

      case 'openai-compatible':
        body = JSON.stringify({
          model: endpoint.model,
          messages: [{ role: 'user', content: prompt }],
          ...options,
        });
        responseKey = 'choices[0].message.content';
        break;

      default:
        body = JSON.stringify({ prompt, ...options });
        responseKey = 'text';
    }

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Model query failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract response based on endpoint type
    if (endpoint.type === 'huggingface' && Array.isArray(data)) {
      return data[0]?.generated_text || '';
    }

    if (endpoint.type === 'openai-compatible') {
      return data.choices?.[0]?.message?.content || '';
    }

    return data[responseKey] || data.text || data.response || '';
  }

  // Safety helpers
  getSafetyReport(modelId: string): OSSModel['safetyAudit'] | undefined {
    return this.models.get(modelId)?.safetyAudit;
  }

  async validateModelSafety(modelId: string): Promise<{
    safe: boolean;
    score: number;
    warnings: string[];
  }> {
    const model = this.models.get(modelId);
    if (!model) {
      return { safe: false, score: 0, warnings: ['Model not found in registry'] };
    }

    const warnings: string[] = [];

    if (!model.safetyAudit.audited) {
      warnings.push('Model has not been security audited');
    }

    if ((model.safetyAudit.score || 0) < 7) {
      warnings.push('Model safety score is below recommended threshold');
    }

    if (model.safetyAudit.issues && model.safetyAudit.issues.length > 0) {
      warnings.push(...model.safetyAudit.issues);
    }

    if (model.deprecated) {
      warnings.push('Model is deprecated - consider using a newer version');
    }

    return {
      safe: model.safetyAudit.audited && (model.safetyAudit.score || 0) >= 8,
      score: model.safetyAudit.score || 0,
      warnings,
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.models.size > 0;
  }
}

export async function initOSSModels(config: OSSModelsConfig): Promise<boolean> {
  const ossModels = new OSSModelsIntegration(config);
  return ossModels.healthCheck();
}

export function ossModelsHealthCheck(config: OSSModelsConfig): () => Promise<boolean> {
  const ossModels = new OSSModelsIntegration(config);
  return () => ossModels.healthCheck();
}
