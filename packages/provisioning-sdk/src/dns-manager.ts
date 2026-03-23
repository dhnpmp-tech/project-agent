/**
 * DNS Manager — creates/removes subdomains via Cloudflare API
 * for client n8n instances.
 */

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

interface CloudflareDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
}

export class DnsManager {
  private apiToken: string;
  private zoneId: string;

  constructor(apiToken: string, zoneId: string) {
    this.apiToken = apiToken;
    this.zoneId = zoneId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${CLOUDFLARE_API}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
        ...options.headers,
      },
    });

    const data = (await response.json()) as {
      success: boolean;
      result: T;
      errors: unknown[];
    };

    if (!data.success) {
      throw new Error(
        `Cloudflare API error: ${JSON.stringify(data.errors)}`
      );
    }

    return data.result;
  }

  /**
   * Create an A record for a client subdomain pointing to the server IP.
   */
  async createSubdomain(
    slug: string,
    targetIp: string,
    proxied = true
  ): Promise<string> {
    const record = await this.request<CloudflareDnsRecord>(
      `/zones/${this.zoneId}/dns_records`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "A",
          name: slug,
          content: targetIp,
          proxied,
          ttl: 1, // Auto TTL when proxied
        }),
      }
    );
    return record.id;
  }

  /**
   * Remove a client subdomain DNS record.
   */
  async removeSubdomain(slug: string): Promise<void> {
    // First, find the record ID
    const records = await this.request<CloudflareDnsRecord[]>(
      `/zones/${this.zoneId}/dns_records?name=${slug}.${await this.getZoneName()}`
    );

    for (const record of records) {
      await this.request(
        `/zones/${this.zoneId}/dns_records/${record.id}`,
        { method: "DELETE" }
      );
    }
  }

  /**
   * List all DNS records (for debugging/audit).
   */
  async listRecords(): Promise<CloudflareDnsRecord[]> {
    return this.request<CloudflareDnsRecord[]>(
      `/zones/${this.zoneId}/dns_records?per_page=100`
    );
  }

  private async getZoneName(): Promise<string> {
    const zone = await this.request<{ name: string }>(
      `/zones/${this.zoneId}`
    );
    return zone.name;
  }
}
