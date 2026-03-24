/**
 * n8n REST API client for managing workflows, credentials, and variables
 * in client n8n instances.
 */

interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  active?: boolean;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

interface N8nCredential {
  name: string;
  type: string;
  data: Record<string, unknown>;
}

export class N8nApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `n8n API error ${response.status} on ${path}: ${body}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Wait for n8n to become healthy, polling /healthz
   */
  async waitForReady(timeoutMs = 120_000, intervalMs = 5_000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`${this.baseUrl}/healthz`);
        if (res.ok) return;
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(
      `n8n at ${this.baseUrl} did not become healthy within ${timeoutMs}ms`
    );
  }

  /**
   * Import a workflow JSON into the n8n instance.
   * Returns the created workflow ID.
   */
  async importWorkflow(workflow: N8nWorkflow): Promise<string> {
    const result = await this.request<{ id: string }>("/workflows", {
      method: "POST",
      body: JSON.stringify(workflow),
    });
    return result.id;
  }

  /**
   * Activate a workflow by ID.
   */
  async activateWorkflow(workflowId: string): Promise<void> {
    await this.request(`/workflows/${workflowId}/activate`, {
      method: "POST",
    });
  }

  /**
   * Deactivate a workflow by ID.
   */
  async deactivateWorkflow(workflowId: string): Promise<void> {
    await this.request(`/workflows/${workflowId}/deactivate`, {
      method: "POST",
    });
  }

  /**
   * Get a workflow by ID.
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/workflows/${workflowId}`);
  }

  /**
   * List all workflows.
   */
  async listWorkflows(): Promise<{ data: N8nWorkflow[] }> {
    return this.request<{ data: N8nWorkflow[] }>("/workflows");
  }

  /**
   * Delete a workflow by ID.
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.request(`/workflows/${workflowId}`, { method: "DELETE" });
  }

  /**
   * Create a credential in the n8n instance.
   * Returns the created credential ID.
   */
  async createCredential(credential: N8nCredential): Promise<string> {
    const result = await this.request<{ id: string }>("/credentials", {
      method: "POST",
      body: JSON.stringify(credential),
    });
    return result.id;
  }

  /**
   * Execute a workflow manually (for testing).
   */
  async executeWorkflow(
    workflowId: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    return this.request(`/workflows/${workflowId}/run`, {
      method: "POST",
      body: JSON.stringify({ data }),
    });
  }
}
