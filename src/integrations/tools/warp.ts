/**
 * Warp Terminal Integration
 * Integration with Warp terminal for workflow automation and AI-assisted commands
 * https://www.warp.dev/
 */

import type { IntegrationConfig } from '../manager';

export interface WarpWorkflow {
  name: string;
  command: string;
  arguments?: WarpArgument[];
  description?: string;
  tags?: string[];
  source_url?: string;
}

export interface WarpArgument {
  name: string;
  description?: string;
  default_value?: string;
}

export interface WarpBlock {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: string;
  cwd: string;
}

export interface WarpConfig extends IntegrationConfig {
  teamId?: string;
  workflowsPath?: string;
}

/**
 * Warp workflows are stored as YAML files in ~/.warp/workflows/
 * This integration helps manage and sync workflows across devices
 */
export class WarpIntegration {
  private config: WarpConfig;
  private workflows: Map<string, WarpWorkflow> = new Map();

  constructor(config: WarpConfig) {
    this.config = config;
  }

  /**
   * Parse a Warp workflow YAML file
   */
  parseWorkflow(yaml: string): WarpWorkflow {
    // Simple YAML parsing for workflow format
    const lines = yaml.split('\n');
    const workflow: Partial<WarpWorkflow> = {};
    let currentArgs: WarpArgument[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('name:')) {
        workflow.name = trimmed.replace('name:', '').trim();
      } else if (trimmed.startsWith('command:')) {
        workflow.command = trimmed.replace('command:', '').trim();
      } else if (trimmed.startsWith('description:')) {
        workflow.description = trimmed.replace('description:', '').trim();
      } else if (trimmed.startsWith('tags:')) {
        workflow.tags = trimmed
          .replace('tags:', '')
          .trim()
          .split(',')
          .map((t) => t.trim());
      } else if (trimmed.startsWith('source_url:')) {
        workflow.source_url = trimmed.replace('source_url:', '').trim();
      } else if (trimmed.startsWith('- name:')) {
        currentArgs.push({ name: trimmed.replace('- name:', '').trim() });
      }
    }

    if (currentArgs.length > 0) {
      workflow.arguments = currentArgs;
    }

    return workflow as WarpWorkflow;
  }

  /**
   * Generate YAML for a workflow
   */
  generateWorkflowYaml(workflow: WarpWorkflow): string {
    let yaml = `---
name: ${workflow.name}
command: ${workflow.command}`;

    if (workflow.description) {
      yaml += `\ndescription: ${workflow.description}`;
    }

    if (workflow.tags && workflow.tags.length > 0) {
      yaml += `\ntags: ${workflow.tags.join(', ')}`;
    }

    if (workflow.source_url) {
      yaml += `\nsource_url: ${workflow.source_url}`;
    }

    if (workflow.arguments && workflow.arguments.length > 0) {
      yaml += `\narguments:`;
      for (const arg of workflow.arguments) {
        yaml += `\n  - name: ${arg.name}`;
        if (arg.description) {
          yaml += `\n    description: ${arg.description}`;
        }
        if (arg.default_value) {
          yaml += `\n    default_value: ${arg.default_value}`;
        }
      }
    }

    return yaml;
  }

  /**
   * Register a workflow
   */
  registerWorkflow(workflow: WarpWorkflow): void {
    this.workflows.set(workflow.name, workflow);
  }

  /**
   * Get all registered workflows
   */
  getWorkflows(): WarpWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Generate deployment workflows for BlackRoad OS
   */
  generateDeploymentWorkflows(): WarpWorkflow[] {
    return [
      {
        name: 'blackroad-deploy-railway',
        command: 'railway up --service {{service_name}}',
        description: 'Deploy BlackRoad OS service to Railway',
        tags: ['blackroad', 'deploy', 'railway'],
        arguments: [
          { name: 'service_name', description: 'Name of the service to deploy', default_value: 'api-gateway' },
        ],
      },
      {
        name: 'blackroad-deploy-cloudflare',
        command: 'wrangler pages deploy ./dist --project-name={{project_name}}',
        description: 'Deploy BlackRoad OS to Cloudflare Pages',
        tags: ['blackroad', 'deploy', 'cloudflare'],
        arguments: [{ name: 'project_name', description: 'Cloudflare Pages project name' }],
      },
      {
        name: 'blackroad-deploy-vercel',
        command: 'vercel --prod --yes',
        description: 'Deploy BlackRoad OS to Vercel',
        tags: ['blackroad', 'deploy', 'vercel'],
      },
      {
        name: 'blackroad-ssh-droplet',
        command: 'ssh -i ~/.ssh/blackroad_key root@{{droplet_ip}}',
        description: 'SSH into BlackRoad OS droplet',
        tags: ['blackroad', 'ssh', 'digitalocean'],
        arguments: [
          { name: 'droplet_ip', description: 'DigitalOcean droplet IP address', default_value: '159.65.43.12' },
        ],
      },
      {
        name: 'blackroad-docker-build',
        command: 'docker build -t blackroad/{{service}}:{{tag}} .',
        description: 'Build BlackRoad OS Docker image',
        tags: ['blackroad', 'docker', 'build'],
        arguments: [
          { name: 'service', description: 'Service name', default_value: 'api-gateway' },
          { name: 'tag', description: 'Image tag', default_value: 'latest' },
        ],
      },
      {
        name: 'blackroad-tunnel-start',
        command: 'cloudflared tunnel run {{tunnel_name}}',
        description: 'Start Cloudflare tunnel for BlackRoad OS',
        tags: ['blackroad', 'tunnel', 'cloudflare'],
        arguments: [{ name: 'tunnel_name', description: 'Name of the tunnel', default_value: 'blackroad-dev' }],
      },
      {
        name: 'blackroad-health-check',
        command: 'curl -s {{endpoint}}/health | jq .',
        description: 'Check BlackRoad OS service health',
        tags: ['blackroad', 'health', 'monitoring'],
        arguments: [
          { name: 'endpoint', description: 'Service endpoint URL', default_value: 'http://localhost:4000' },
        ],
      },
    ];
  }

  async healthCheck(): Promise<boolean> {
    // Warp is a local tool, just return true if configured
    return this.config.enabled;
  }
}

export async function initWarp(config: WarpConfig): Promise<boolean> {
  const warp = new WarpIntegration(config);
  // Pre-register deployment workflows
  for (const workflow of warp.generateDeploymentWorkflows()) {
    warp.registerWorkflow(workflow);
  }
  return warp.healthCheck();
}

export function warpHealthCheck(config: WarpConfig): () => Promise<boolean> {
  const warp = new WarpIntegration(config);
  return () => warp.healthCheck();
}
