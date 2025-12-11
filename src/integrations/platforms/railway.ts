/**
 * Railway Platform Integration
 * Deploy and manage services on Railway.app
 */

import type { IntegrationConfig } from '../manager';

export interface RailwayProject {
  id: string;
  name: string;
  environments: RailwayEnvironment[];
}

export interface RailwayEnvironment {
  id: string;
  name: string;
  deployments: RailwayDeployment[];
}

export interface RailwayDeployment {
  id: string;
  status: 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'CRASHED' | 'REMOVED';
  createdAt: string;
  url?: string;
}

export interface RailwayConfig extends IntegrationConfig {
  projectId?: string;
  teamId?: string;
  environmentId?: string;
}

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

export class RailwayIntegration {
  private apiToken: string;
  private config: RailwayConfig;

  constructor(config: RailwayConfig) {
    this.config = config;
    this.apiToken = config.apiKey || process.env.RAILWAY_TOKEN || '';
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`Railway GraphQL error: ${data.errors[0].message}`);
    }

    return data.data as T;
  }

  async getProjects(): Promise<RailwayProject[]> {
    const query = `
      query {
        me {
          projects {
            edges {
              node {
                id
                name
                environments {
                  edges {
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.graphql<{
      me: {
        projects: {
          edges: Array<{
            node: {
              id: string;
              name: string;
              environments: {
                edges: Array<{ node: { id: string; name: string } }>;
              };
            };
          }>;
        };
      };
    }>(query);

    return result.me.projects.edges.map((edge) => ({
      id: edge.node.id,
      name: edge.node.name,
      environments: edge.node.environments.edges.map((envEdge) => ({
        id: envEdge.node.id,
        name: envEdge.node.name,
        deployments: [],
      })),
    }));
  }

  async getDeployments(projectId: string): Promise<RailwayDeployment[]> {
    const query = `
      query($projectId: String!) {
        project(id: $projectId) {
          deployments {
            edges {
              node {
                id
                status
                createdAt
                staticUrl
              }
            }
          }
        }
      }
    `;

    const result = await this.graphql<{
      project: {
        deployments: {
          edges: Array<{
            node: {
              id: string;
              status: RailwayDeployment['status'];
              createdAt: string;
              staticUrl?: string;
            };
          }>;
        };
      };
    }>(query, { projectId });

    return result.project.deployments.edges.map((edge) => ({
      id: edge.node.id,
      status: edge.node.status,
      createdAt: edge.node.createdAt,
      url: edge.node.staticUrl,
    }));
  }

  async triggerDeploy(serviceId: string, environmentId: string): Promise<string> {
    const query = `
      mutation($serviceId: String!, $environmentId: String!) {
        serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
      }
    `;

    const result = await this.graphql<{ serviceInstanceRedeploy: string }>(query, {
      serviceId,
      environmentId,
    });

    return result.serviceInstanceRedeploy;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const projects = await this.getProjects();
      return projects.length >= 0;
    } catch {
      return false;
    }
  }
}

export async function initRailway(config: RailwayConfig): Promise<boolean> {
  const railway = new RailwayIntegration(config);
  return railway.healthCheck();
}

export function railwayHealthCheck(config: RailwayConfig): () => Promise<boolean> {
  const railway = new RailwayIntegration(config);
  return () => railway.healthCheck();
}
