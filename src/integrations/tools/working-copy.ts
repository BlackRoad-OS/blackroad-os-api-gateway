/**
 * Working Copy Git Integration
 * Integration with Working Copy iOS/iPadOS Git client
 * https://workingcopy.app/
 */

import type { IntegrationConfig } from '../manager';

export interface WorkingCopyRepository {
  name: string;
  path: string;
  remoteUrl: string;
  branch: string;
  status: 'clean' | 'modified' | 'staged' | 'conflict';
  lastSync?: string;
}

export interface WorkingCopyCallback {
  action: 'open' | 'pull' | 'push' | 'commit' | 'clone' | 'chain';
  repo?: string;
  path?: string;
  branch?: string;
  message?: string;
  key?: string;
  commands?: string[];
  x_success?: string;
  x_error?: string;
  x_cancel?: string;
}

export interface WorkingCopyConfig extends IntegrationConfig {
  urlKey?: string;
  repositories?: WorkingCopyRepository[];
}

/**
 * Working Copy integration for managing Git repositories from iOS/iPadOS
 * Generates x-callback-url schemes for git operations
 */
export class WorkingCopyIntegration {
  private config: WorkingCopyConfig;
  private repositories: Map<string, WorkingCopyRepository> = new Map();

  constructor(config: WorkingCopyConfig) {
    this.config = config;
    this.initializeDefaultRepositories();
  }

  private initializeDefaultRepositories(): void {
    const defaultRepos: WorkingCopyRepository[] = [
      {
        name: 'blackroad-os-api-gateway',
        path: '/BlackRoad-OS/blackroad-os-api-gateway',
        remoteUrl: 'git@github.com:BlackRoad-OS/blackroad-os-api-gateway.git',
        branch: 'main',
        status: 'clean',
      },
      {
        name: 'blackroad-network',
        path: '/BlackRoad-OS/blackroad-network',
        remoteUrl: 'git@github.com:BlackRoad-OS/blackroad-network.git',
        branch: 'main',
        status: 'clean',
      },
      {
        name: 'lucidia-core',
        path: '/BlackRoad-OS/lucidia-core',
        remoteUrl: 'git@github.com:BlackRoad-OS/lucidia-core.git',
        branch: 'main',
        status: 'clean',
      },
      {
        name: 'blackroad-ai',
        path: '/BlackRoad-OS/blackroad-ai',
        remoteUrl: 'git@github.com:BlackRoad-OS/blackroad-ai.git',
        branch: 'main',
        status: 'clean',
      },
      {
        name: 'quantum-sdk',
        path: '/BlackRoad-OS/quantum-sdk',
        remoteUrl: 'git@github.com:BlackRoad-OS/quantum-sdk.git',
        branch: 'main',
        status: 'clean',
      },
    ];

    for (const repo of defaultRepos) {
      this.repositories.set(repo.name, repo);
    }
  }

  /**
   * Generate x-callback-url for a Working Copy action
   */
  generateCallbackUrl(callback: WorkingCopyCallback): string {
    const baseUrl = 'working-copy://x-callback-url';
    const params = new URLSearchParams();

    if (this.config.urlKey) {
      params.set('key', this.config.urlKey);
    }

    if (callback.repo) params.set('repo', callback.repo);
    if (callback.path) params.set('path', callback.path);
    if (callback.branch) params.set('branch', callback.branch);
    if (callback.message) params.set('message', callback.message);
    if (callback.x_success) params.set('x-success', callback.x_success);
    if (callback.x_error) params.set('x-error', callback.x_error);
    if (callback.x_cancel) params.set('x-cancel', callback.x_cancel);

    if (callback.action === 'chain' && callback.commands) {
      // Chain multiple commands
      const chainUrl = callback.commands.map((cmd) => encodeURIComponent(cmd)).join('/');
      return `${baseUrl}/chain?${params.toString()}&command=${chainUrl}`;
    }

    return `${baseUrl}/${callback.action}?${params.toString()}`;
  }

  /**
   * Generate URL to clone a repository
   */
  generateCloneUrl(remoteUrl: string, name?: string): string {
    return this.generateCallbackUrl({
      action: 'clone',
      repo: remoteUrl,
      path: name,
    });
  }

  /**
   * Generate URL to pull latest changes
   */
  generatePullUrl(repoName: string): string {
    return this.generateCallbackUrl({
      action: 'pull',
      repo: repoName,
    });
  }

  /**
   * Generate URL to push changes
   */
  generatePushUrl(repoName: string): string {
    return this.generateCallbackUrl({
      action: 'push',
      repo: repoName,
    });
  }

  /**
   * Generate URL to commit changes
   */
  generateCommitUrl(repoName: string, message: string): string {
    return this.generateCallbackUrl({
      action: 'commit',
      repo: repoName,
      message,
    });
  }

  /**
   * Generate URL to open repository
   */
  generateOpenUrl(repoName: string, path?: string): string {
    return this.generateCallbackUrl({
      action: 'open',
      repo: repoName,
      path,
    });
  }

  /**
   * Generate deployment chain URL (pull, then success callback)
   */
  generateDeploymentUrl(repoName: string, webhookUrl: string): string {
    const successUrl = encodeURIComponent(`${webhookUrl}?repo=${repoName}&status=success`);
    const errorUrl = encodeURIComponent(`${webhookUrl}?repo=${repoName}&status=error`);

    return this.generateCallbackUrl({
      action: 'pull',
      repo: repoName,
      x_success: successUrl,
      x_error: errorUrl,
    });
  }

  /**
   * Generate sync all repositories chain
   */
  generateSyncAllUrl(webhookUrl?: string): string {
    const repos = Array.from(this.repositories.keys());
    const commands = repos.map((repo) => `pull?repo=${repo}`);

    if (webhookUrl) {
      commands.push(`callback?x-success=${encodeURIComponent(webhookUrl)}`);
    }

    return this.generateCallbackUrl({
      action: 'chain',
      commands,
    });
  }

  /**
   * Add a repository
   */
  addRepository(repo: WorkingCopyRepository): void {
    this.repositories.set(repo.name, repo);
  }

  /**
   * Get all repositories
   */
  getRepositories(): WorkingCopyRepository[] {
    return Array.from(this.repositories.values());
  }

  /**
   * Generate iOS Shortcuts compatible actions
   */
  generateShortcutsActions(): Array<{ name: string; url: string; description: string }> {
    return [
      {
        name: 'Sync All BlackRoad Repos',
        url: this.generateSyncAllUrl(),
        description: 'Pull latest changes from all BlackRoad OS repositories',
      },
      {
        name: 'Open API Gateway',
        url: this.generateOpenUrl('blackroad-os-api-gateway'),
        description: 'Open the API Gateway repository in Working Copy',
      },
      {
        name: 'Quick Commit',
        url: this.generateCommitUrl('blackroad-os-api-gateway', 'Quick update from iOS'),
        description: 'Commit current changes with a quick message',
      },
      {
        name: 'Push to Remote',
        url: this.generatePushUrl('blackroad-os-api-gateway'),
        description: 'Push committed changes to GitHub',
      },
    ];
  }

  async healthCheck(): Promise<boolean> {
    return this.config.enabled && this.repositories.size > 0;
  }
}

export async function initWorkingCopy(config: WorkingCopyConfig): Promise<boolean> {
  const wc = new WorkingCopyIntegration(config);
  return wc.healthCheck();
}

export function workingCopyHealthCheck(config: WorkingCopyConfig): () => Promise<boolean> {
  const wc = new WorkingCopyIntegration(config);
  return () => wc.healthCheck();
}
