/**
 * Asana Integration
 * Project management and task tracking via Asana API
 * https://developers.asana.com/
 */

import type { IntegrationConfig } from '../manager';

export interface AsanaWorkspace {
  gid: string;
  name: string;
  is_organization: boolean;
}

export interface AsanaProject {
  gid: string;
  name: string;
  workspace: { gid: string };
  team?: { gid: string; name: string };
  public: boolean;
  archived: boolean;
  created_at: string;
  modified_at: string;
  notes?: string;
  color?: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  due_on?: string;
  due_at?: string;
  start_on?: string;
  assignee?: { gid: string; name: string };
  projects?: Array<{ gid: string; name: string }>;
  tags?: Array<{ gid: string; name: string }>;
  custom_fields?: Array<{
    gid: string;
    name: string;
    display_value: string;
    type: string;
  }>;
  created_at: string;
  modified_at: string;
}

export interface AsanaSection {
  gid: string;
  name: string;
  project: { gid: string };
}

export interface AsanaConfig extends IntegrationConfig {
  workspaceId?: string;
  defaultProjectId?: string;
}

const ASANA_API_URL = 'https://app.asana.com/api/1.0';

export class AsanaIntegration {
  private accessToken: string;
  private workspaceId?: string;
  private config: AsanaConfig;

  constructor(config: AsanaConfig) {
    this.config = config;
    this.accessToken = config.apiKey || process.env.ASANA_ACCESS_TOKEN || '';
    this.workspaceId = config.workspaceId || process.env.ASANA_WORKSPACE_ID;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useData = true
  ): Promise<T> {
    const response = await fetch(`${ASANA_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ errors: [{ message: response.statusText }] }));
      throw new Error(`Asana API error: ${error.errors?.[0]?.message || response.statusText}`);
    }

    const json = await response.json();
    return useData ? json.data : json;
  }

  // Workspaces
  async getWorkspaces(): Promise<AsanaWorkspace[]> {
    return this.request<AsanaWorkspace[]>('/workspaces');
  }

  // Projects
  async getProjects(workspaceId?: string): Promise<AsanaProject[]> {
    const wsId = workspaceId || this.workspaceId;
    const params = wsId ? `?workspace=${wsId}` : '';
    return this.request<AsanaProject[]>(`/projects${params}`);
  }

  async getProject(projectId: string): Promise<AsanaProject> {
    return this.request<AsanaProject>(`/projects/${projectId}`);
  }

  async createProject(data: {
    name: string;
    workspace?: string;
    team?: string;
    notes?: string;
    color?: string;
    public?: boolean;
  }): Promise<AsanaProject> {
    return this.request<AsanaProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          ...data,
          workspace: data.workspace || this.workspaceId,
        },
      }),
    });
  }

  // Tasks
  async getTasks(projectId: string): Promise<AsanaTask[]> {
    return this.request<AsanaTask[]>(
      `/projects/${projectId}/tasks?opt_fields=name,notes,completed,due_on,assignee,tags,custom_fields`
    );
  }

  async getTask(taskId: string): Promise<AsanaTask> {
    return this.request<AsanaTask>(
      `/tasks/${taskId}?opt_fields=name,notes,completed,due_on,due_at,assignee,projects,tags,custom_fields,created_at,modified_at`
    );
  }

  async createTask(data: {
    name: string;
    projects?: string[];
    assignee?: string;
    due_on?: string;
    notes?: string;
    workspace?: string;
  }): Promise<AsanaTask> {
    return this.request<AsanaTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          ...data,
          workspace: data.workspace || this.workspaceId,
        },
      }),
    });
  }

  async updateTask(
    taskId: string,
    data: Partial<{
      name: string;
      completed: boolean;
      due_on: string;
      notes: string;
      assignee: string;
    }>
  ): Promise<AsanaTask> {
    return this.request<AsanaTask>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  }

  async completeTask(taskId: string): Promise<AsanaTask> {
    return this.updateTask(taskId, { completed: true });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.request(`/tasks/${taskId}`, { method: 'DELETE' });
  }

  // Sections
  async getSections(projectId: string): Promise<AsanaSection[]> {
    return this.request<AsanaSection[]>(`/projects/${projectId}/sections`);
  }

  async createSection(projectId: string, name: string): Promise<AsanaSection> {
    return this.request<AsanaSection>(`/projects/${projectId}/sections`, {
      method: 'POST',
      body: JSON.stringify({ data: { name } }),
    });
  }

  async addTaskToSection(sectionId: string, taskId: string): Promise<void> {
    await this.request(`/sections/${sectionId}/addTask`, {
      method: 'POST',
      body: JSON.stringify({ data: { task: taskId } }),
    });
  }

  // Comments
  async addComment(taskId: string, text: string): Promise<{ gid: string; text: string }> {
    return this.request(`/tasks/${taskId}/stories`, {
      method: 'POST',
      body: JSON.stringify({ data: { text } }),
    });
  }

  // BlackRoad OS specific helpers
  async createDeploymentTask(
    service: string,
    platform: string,
    projectId?: string
  ): Promise<AsanaTask> {
    const project = projectId || this.config.defaultProjectId;
    return this.createTask({
      name: `Deploy ${service} to ${platform}`,
      notes: `Automated deployment task for ${service} service to ${platform} platform.

- Service: ${service}
- Platform: ${platform}
- Created: ${new Date().toISOString()}`,
      projects: project ? [project] : undefined,
    });
  }

  async createIncidentTask(
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    projectId?: string
  ): Promise<AsanaTask> {
    const project = projectId || this.config.defaultProjectId;
    return this.createTask({
      name: `[${severity.toUpperCase()}] ${title}`,
      notes: `## Incident Report

**Severity:** ${severity}
**Reported:** ${new Date().toISOString()}

### Description
${description}

### Actions Taken
- [ ] Investigate root cause
- [ ] Implement fix
- [ ] Deploy fix
- [ ] Verify resolution
- [ ] Post-mortem`,
      projects: project ? [project] : undefined,
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const workspaces = await this.getWorkspaces();
      return workspaces.length > 0;
    } catch {
      return false;
    }
  }
}

export async function initAsana(config: AsanaConfig): Promise<boolean> {
  const asana = new AsanaIntegration(config);
  return asana.healthCheck();
}

export function asanaHealthCheck(config: AsanaConfig): () => Promise<boolean> {
  const asana = new AsanaIntegration(config);
  return () => asana.healthCheck();
}
