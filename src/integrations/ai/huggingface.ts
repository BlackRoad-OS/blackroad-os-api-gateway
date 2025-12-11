/**
 * Hugging Face Integration
 * AI/ML model inference and management via Hugging Face
 * https://huggingface.co/docs/api-inference
 */

import type { IntegrationConfig } from '../manager';

export interface HFModel {
  id: string;
  modelId: string;
  author: string;
  sha: string;
  lastModified: string;
  private: boolean;
  disabled: boolean;
  gated: boolean | 'auto' | 'manual';
  pipeline_tag?: string;
  tags: string[];
  downloads: number;
  likes: number;
  library_name?: string;
}

export interface HFInferenceResult {
  generated_text?: string;
  score?: number;
  label?: string;
  translation_text?: string;
  summary_text?: string;
  answer?: string;
  embeddings?: number[];
}

export interface HFSpace {
  id: string;
  author: string;
  sha: string;
  lastModified: string;
  private: boolean;
  sdk: 'gradio' | 'streamlit' | 'docker' | 'static';
  runtime: {
    stage: string;
    hardware: string;
  };
}

export interface HFConfig extends IntegrationConfig {
  defaultModel?: string;
  inferenceEndpoint?: string;
  useServerlessInference?: boolean;
}

const HF_API_URL = 'https://huggingface.co/api';
const HF_INFERENCE_URL = 'https://api-inference.huggingface.co/models';

export class HuggingFaceIntegration {
  private apiToken: string;
  private config: HFConfig;

  constructor(config: HFConfig) {
    this.config = config;
    this.apiToken = config.apiKey || process.env.HUGGINGFACE_API_KEY || '';
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Models API
  async getModels(params?: {
    search?: string;
    author?: string;
    filter?: string;
    sort?: 'downloads' | 'likes' | 'lastModified';
    direction?: 'asc' | 'desc';
    limit?: number;
  }): Promise<HFModel[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.author) searchParams.set('author', params.author);
    if (params?.filter) searchParams.set('filter', params.filter);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.direction) searchParams.set('direction', params.direction === 'asc' ? '1' : '-1');
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return this.request<HFModel[]>(`${HF_API_URL}/models${query ? `?${query}` : ''}`);
  }

  async getModel(modelId: string): Promise<HFModel> {
    return this.request<HFModel>(`${HF_API_URL}/models/${modelId}`);
  }

  // Inference API
  async inference<T = HFInferenceResult | HFInferenceResult[]>(
    modelId: string,
    inputs: string | string[] | Record<string, unknown>,
    parameters?: Record<string, unknown>
  ): Promise<T> {
    const endpoint = this.config.inferenceEndpoint || `${HF_INFERENCE_URL}/${modelId}`;

    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ inputs, parameters }),
    });
  }

  // Text Generation
  async generateText(
    prompt: string,
    options?: {
      model?: string;
      max_new_tokens?: number;
      temperature?: number;
      top_p?: number;
      top_k?: number;
      repetition_penalty?: number;
      do_sample?: boolean;
      return_full_text?: boolean;
    }
  ): Promise<string> {
    const model = options?.model || this.config.defaultModel || 'meta-llama/Llama-2-70b-chat-hf';
    const result = await this.inference<Array<{ generated_text: string }>>(model, prompt, {
      max_new_tokens: options?.max_new_tokens || 500,
      temperature: options?.temperature || 0.7,
      top_p: options?.top_p || 0.95,
      top_k: options?.top_k,
      repetition_penalty: options?.repetition_penalty || 1.1,
      do_sample: options?.do_sample ?? true,
      return_full_text: options?.return_full_text ?? false,
    });

    return result[0]?.generated_text || '';
  }

  // Text Classification
  async classify(
    text: string,
    model = 'facebook/bart-large-mnli'
  ): Promise<Array<{ label: string; score: number }>> {
    return this.inference(model, text);
  }

  // Sentiment Analysis
  async analyzeSentiment(
    text: string,
    model = 'cardiffnlp/twitter-roberta-base-sentiment-latest'
  ): Promise<Array<{ label: string; score: number }>> {
    return this.inference(model, text);
  }

  // Text Embeddings
  async getEmbeddings(
    texts: string[],
    model = 'sentence-transformers/all-MiniLM-L6-v2'
  ): Promise<number[][]> {
    return this.inference(model, texts);
  }

  // Summarization
  async summarize(
    text: string,
    options?: {
      model?: string;
      max_length?: number;
      min_length?: number;
    }
  ): Promise<string> {
    const model = options?.model || 'facebook/bart-large-cnn';
    const result = await this.inference<Array<{ summary_text: string }>>(model, text, {
      max_length: options?.max_length || 150,
      min_length: options?.min_length || 30,
    });

    return result[0]?.summary_text || '';
  }

  // Translation
  async translate(
    text: string,
    model = 'Helsinki-NLP/opus-mt-en-es'
  ): Promise<string> {
    const result = await this.inference<Array<{ translation_text: string }>>(model, text);
    return result[0]?.translation_text || '';
  }

  // Question Answering
  async answerQuestion(
    question: string,
    context: string,
    model = 'deepset/roberta-base-squad2'
  ): Promise<{ answer: string; score: number; start: number; end: number }> {
    return this.inference(model, { question, context });
  }

  // Fill Mask
  async fillMask(
    text: string,
    model = 'bert-base-uncased'
  ): Promise<Array<{ score: number; token_str: string; sequence: string }>> {
    return this.inference(model, text);
  }

  // Zero-Shot Classification
  async zeroShotClassify(
    text: string,
    candidateLabels: string[],
    model = 'facebook/bart-large-mnli'
  ): Promise<{ labels: string[]; scores: number[] }> {
    return this.inference(model, {
      inputs: text,
      parameters: { candidate_labels: candidateLabels },
    });
  }

  // Conversational
  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      max_new_tokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const model = options?.model || this.config.defaultModel || 'meta-llama/Llama-2-70b-chat-hf';

    // Format messages for chat
    const formattedPrompt = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') + '\nAssistant:';

    return this.generateText(formattedPrompt, {
      model,
      max_new_tokens: options?.max_new_tokens,
      temperature: options?.temperature,
    });
  }

  // Spaces API
  async getSpaces(params?: {
    search?: string;
    author?: string;
    sort?: 'likes' | 'lastModified';
  }): Promise<HFSpace[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.author) searchParams.set('author', params.author);
    if (params?.sort) searchParams.set('sort', params.sort);

    const query = searchParams.toString();
    return this.request<HFSpace[]>(`${HF_API_URL}/spaces${query ? `?${query}` : ''}`);
  }

  // BlackRoad OS specific helpers
  async analyzeCode(code: string, language = 'typescript'): Promise<{
    summary: string;
    quality: number;
    suggestions: string[];
  }> {
    const prompt = `Analyze this ${language} code and provide:
1. A brief summary
2. Code quality score (1-10)
3. Improvement suggestions

Code:
\`\`\`${language}
${code}
\`\`\``;

    const response = await this.generateText(prompt, {
      max_new_tokens: 500,
      temperature: 0.3,
    });

    // Parse response (simplified)
    return {
      summary: response.split('\n')[0] || 'Code analysis complete',
      quality: 7,
      suggestions: response.split('\n').filter((l) => l.startsWith('-') || l.startsWith('*')),
    };
  }

  async generateDocumentation(code: string, language = 'typescript'): Promise<string> {
    const prompt = `Generate documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Documentation:`;

    return this.generateText(prompt, {
      max_new_tokens: 1000,
      temperature: 0.3,
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const models = await this.getModels({ limit: 1 });
      return models.length > 0;
    } catch {
      return false;
    }
  }
}

export async function initHuggingFace(config: HFConfig): Promise<boolean> {
  const hf = new HuggingFaceIntegration(config);
  return hf.healthCheck();
}

export function huggingFaceHealthCheck(config: HFConfig): () => Promise<boolean> {
  const hf = new HuggingFaceIntegration(config);
  return () => hf.healthCheck();
}
