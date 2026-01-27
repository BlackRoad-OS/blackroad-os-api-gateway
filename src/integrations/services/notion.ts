/**
 * Notion Integration
 * Knowledge base and documentation via Notion API
 * https://developers.notion.com/
 */

import type { IntegrationConfig } from '../manager';

export interface NotionDatabase {
  id: string;
  title: Array<{ plain_text: string }>;
  description?: Array<{ plain_text: string }>;
  properties: Record<string, NotionProperty>;
  created_time: string;
  last_edited_time: string;
  url: string;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  parent: { type: string; database_id?: string; page_id?: string };
  archived: boolean;
  properties: Record<string, NotionPropertyValue>;
  url: string;
}

export interface NotionPropertyValue {
  id: string;
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  number?: number;
  select?: { name: string; color: string };
  multi_select?: Array<{ name: string; color: string }>;
  date?: { start: string; end?: string };
  checkbox?: boolean;
  url?: string;
  email?: string;
  phone_number?: string;
  status?: { name: string; color: string };
}

export interface NotionBlock {
  id: string;
  type: string;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  [key: string]: unknown;
}

export interface NotionConfig extends IntegrationConfig {
  defaultDatabaseId?: string;
  deploymentLogsDatabaseId?: string;
  incidentsDatabaseId?: string;
}

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export class NotionIntegration {
  private apiKey: string;
  private config: NotionConfig;

  constructor(config: NotionConfig) {
    this.config = config;
    this.apiKey = config.apiKey || process.env.NOTION_API_KEY || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${NOTION_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Notion API error: ${error.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Databases
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    return this.request<NotionDatabase>(`/databases/${databaseId}`);
  }

  async queryDatabase(
    databaseId: string,
    filter?: Record<string, unknown>,
    sorts?: Array<{ property: string; direction: 'ascending' | 'descending' }>
  ): Promise<{ results: NotionPage[]; has_more: boolean; next_cursor?: string }> {
    return this.request(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({ filter, sorts }),
    });
  }

  // Pages
  async getPage(pageId: string): Promise<NotionPage> {
    return this.request<NotionPage>(`/pages/${pageId}`);
  }

  async createPage(
    parentId: string,
    properties: Record<string, unknown>,
    children?: NotionBlock[],
    isDatabase = true
  ): Promise<NotionPage> {
    const parent = isDatabase ? { database_id: parentId } : { page_id: parentId };

    return this.request<NotionPage>('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent,
        properties,
        children,
      }),
    });
  }

  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    return this.request<NotionPage>(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
  }

  async archivePage(pageId: string): Promise<NotionPage> {
    return this.request<NotionPage>(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    });
  }

  // Blocks
  async getBlockChildren(blockId: string): Promise<{ results: NotionBlock[] }> {
    return this.request(`/blocks/${blockId}/children`);
  }

  async appendBlockChildren(blockId: string, children: NotionBlock[]): Promise<{ results: NotionBlock[] }> {
    return this.request(`/blocks/${blockId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children }),
    });
  }

  // Search
  async search(query: string, filter?: { property: 'object'; value: 'page' | 'database' }): Promise<{
    results: Array<NotionPage | NotionDatabase>;
  }> {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify({ query, filter }),
    });
  }

  // Helper: Create text block
  private createTextBlock(text: string, type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' = 'paragraph'): NotionBlock {
    return {
      id: '',
      type,
      created_time: '',
      last_edited_time: '',
      has_children: false,
      [type]: {
        rich_text: [{ type: 'text', text: { content: text } }],
      },
    };
  }

  private createCodeBlock(code: string, language = 'typescript'): NotionBlock {
    return {
      id: '',
      type: 'code',
      created_time: '',
      last_edited_time: '',
      has_children: false,
      code: {
        rich_text: [{ type: 'text', text: { content: code } }],
        language,
      },
    };
  }

  // BlackRoad OS specific helpers
  async createDeploymentLog(deployment: {
    service: string;
    platform: string;
    version: string;
    status: 'pending' | 'building' | 'deploying' | 'success' | 'failed';
    commitSha?: string;
    url?: string;
    logs?: string;
  }): Promise<NotionPage> {
    const databaseId = this.config.deploymentLogsDatabaseId || this.config.defaultDatabaseId;
    if (!databaseId) {
      throw new Error('No deployment logs database configured');
    }

    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: `${deployment.service} → ${deployment.platform}` } }],
      },
      Service: {
        select: { name: deployment.service },
      },
      Platform: {
        select: { name: deployment.platform },
      },
      Version: {
        rich_text: [{ text: { content: deployment.version } }],
      },
      Status: {
        status: { name: deployment.status },
      },
      'Deployed At': {
        date: { start: new Date().toISOString() },
      },
    };

    if (deployment.commitSha) {
      properties['Commit SHA'] = {
        rich_text: [{ text: { content: deployment.commitSha } }],
      };
    }

    if (deployment.url) {
      properties['URL'] = { url: deployment.url };
    }

    const children: NotionBlock[] = [
      this.createTextBlock('Deployment Details', 'heading_2'),
      this.createTextBlock(`Service: ${deployment.service}`),
      this.createTextBlock(`Platform: ${deployment.platform}`),
      this.createTextBlock(`Version: ${deployment.version}`),
      this.createTextBlock(`Status: ${deployment.status}`),
    ];

    if (deployment.logs) {
      children.push(
        this.createTextBlock('Deployment Logs', 'heading_2'),
        this.createCodeBlock(deployment.logs, 'shell')
      );
    }

    return this.createPage(databaseId, properties, children);
  }

  async createIncidentReport(incident: {
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedServices: string[];
    rootCause?: string;
    resolution?: string;
  }): Promise<NotionPage> {
    const databaseId = this.config.incidentsDatabaseId || this.config.defaultDatabaseId;
    if (!databaseId) {
      throw new Error('No incidents database configured');
    }

    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: incident.title } }],
      },
      Severity: {
        select: { name: incident.severity },
      },
      Status: {
        status: { name: 'investigating' },
      },
      'Affected Services': {
        multi_select: incident.affectedServices.map((s) => ({ name: s })),
      },
      'Reported At': {
        date: { start: new Date().toISOString() },
      },
    };

    const children: NotionBlock[] = [
      this.createTextBlock('Incident Summary', 'heading_1'),
      this.createTextBlock(incident.description),
      this.createTextBlock('Affected Services', 'heading_2'),
      ...incident.affectedServices.map((s) => this.createTextBlock(`• ${s}`)),
    ];

    if (incident.rootCause) {
      children.push(
        this.createTextBlock('Root Cause', 'heading_2'),
        this.createTextBlock(incident.rootCause)
      );
    }

    if (incident.resolution) {
      children.push(
        this.createTextBlock('Resolution', 'heading_2'),
        this.createTextBlock(incident.resolution)
      );
    }

    children.push(
      this.createTextBlock('Timeline', 'heading_2'),
      this.createTextBlock(`${new Date().toISOString()} - Incident reported`)
    );

    return this.createPage(databaseId, properties, children);
  }

  async updateDeploymentStatus(
    pageId: string,
    status: 'pending' | 'building' | 'deploying' | 'success' | 'failed'
  ): Promise<NotionPage> {
    return this.updatePage(pageId, {
      Status: { status: { name: status } },
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const results = await this.search('', { property: 'object', value: 'database' });
      return results.results.length >= 0;
    } catch {
      return false;
    }
  }
}

export async function initNotion(config: NotionConfig): Promise<boolean> {
  const notion = new NotionIntegration(config);
  return notion.healthCheck();
}

export function notionHealthCheck(config: NotionConfig): () => Promise<boolean> {
  const notion = new NotionIntegration(config);
  return () => notion.healthCheck();
}
