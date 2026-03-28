/**
 * Kapso Platform API Client
 *
 * Manages multi-tenant WhatsApp provisioning. When a new client onboards,
 * we automatically:
 * 1. Create a Kapso customer (linked to our client record)
 * 2. Generate a branded setup link (client clicks → WhatsApp connected)
 * 3. Configure webhooks (route inbound messages to client's agent)
 * 4. Optionally provision a phone number
 *
 * This replaces the manual "create your own Kapso account" flow —
 * WhatsApp is now a one-click setup for every client.
 */

const KAPSO_PLATFORM_API = "https://api.kapso.ai/platform/v1";

interface KapsoCustomer {
  id: string;
  name: string;
  phone_numbers: { id: string; display_phone_number: string }[];
}

interface KapsoSetupLink {
  id: string;
  url: string;
  status: string;
  expires_at: string;
}

interface KapsoWebhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export class KapsoPlatformClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${KAPSO_PLATFORM_API}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Kapso-Api-Key": this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Kapso API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a Kapso customer for a new client.
   * This is the first step in WhatsApp provisioning.
   */
  async createCustomer(name: string, metadata?: Record<string, unknown>): Promise<KapsoCustomer> {
    return this.request<KapsoCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify({ name, metadata }),
    });
  }

  /**
   * Generate a branded setup link for the client to connect their WhatsApp.
   * The link opens an embedded signup flow where the client logs in with
   * Facebook and connects their WhatsApp Business account.
   */
  async createSetupLink(
    customerId: string,
    options?: {
      successRedirectUrl?: string;
      failureRedirectUrl?: string;
      provisionPhoneNumber?: boolean;
      phoneNumberCountryIsos?: string[];
      themeConfig?: {
        primaryColor?: string;
        backgroundColor?: string;
        textColor?: string;
      };
    }
  ): Promise<KapsoSetupLink> {
    return this.request<KapsoSetupLink>(
      `/customers/${customerId}/setup_links`,
      {
        method: "POST",
        body: JSON.stringify({
          success_redirect_url: options?.successRedirectUrl,
          failure_redirect_url: options?.failureRedirectUrl,
          provision_phone_number: options?.provisionPhoneNumber,
          phone_number_country_isos: options?.phoneNumberCountryIsos,
          theme_config: options?.themeConfig,
        }),
      }
    );
  }

  /**
   * List setup links for a customer (check connection status).
   */
  async listSetupLinks(customerId: string): Promise<KapsoSetupLink[]> {
    return this.request<KapsoSetupLink[]>(
      `/customers/${customerId}/setup_links`
    );
  }

  /**
   * Get a customer by ID.
   */
  async getCustomer(customerId: string): Promise<KapsoCustomer> {
    return this.request<KapsoCustomer>(`/customers/${customerId}`);
  }

  /**
   * List all customers.
   */
  async listCustomers(): Promise<KapsoCustomer[]> {
    return this.request<KapsoCustomer[]>("/customers");
  }

  /**
   * Create a webhook for a customer to receive WhatsApp events.
   * Routes inbound messages to the client's n8n agent instance.
   */
  async createWebhook(
    url: string,
    events: string[],
    options?: {
      customerId?: string;
      secret?: string;
      bufferEnabled?: boolean;
      bufferWindowSeconds?: number;
    }
  ): Promise<KapsoWebhook> {
    return this.request<KapsoWebhook>("/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url,
        events,
        customer_id: options?.customerId,
        secret: options?.secret,
        buffer: options?.bufferEnabled
          ? {
              enabled: true,
              window_seconds: options?.bufferWindowSeconds || 5,
            }
          : undefined,
      }),
    });
  }

  /**
   * Send a WhatsApp message on behalf of a customer.
   */
  async sendMessage(
    phoneNumberId: string,
    to: string,
    message: {
      type: "text" | "image" | "document" | "interactive" | "template";
      text?: { body: string };
      image?: { link: string; caption?: string };
      document?: { link: string; filename: string; caption?: string };
      interactive?: Record<string, unknown>;
      template?: Record<string, unknown>;
    }
  ): Promise<{ messages: { id: string }[] }> {
    return this.request(`/phone_numbers/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        ...message,
      }),
    });
  }

  /**
   * List conversations for a phone number.
   */
  async listConversations(
    phoneNumberId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ data: unknown[]; next_cursor?: string }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.cursor) params.set("cursor", options.cursor);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/phone_numbers/${phoneNumberId}/conversations${qs}`);
  }

  /**
   * List messages for a phone number.
   */
  async listMessages(
    phoneNumberId: string,
    options?: {
      conversationId?: string;
      direction?: "inbound" | "outbound";
      limit?: number;
    }
  ): Promise<{ data: unknown[] }> {
    const params = new URLSearchParams();
    if (options?.conversationId) params.set("conversation_id", options.conversationId);
    if (options?.direction) params.set("direction", options.direction);
    if (options?.limit) params.set("limit", String(options.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/phone_numbers/${phoneNumberId}/messages${qs}`);
  }

  /**
   * Full provisioning flow: create customer → setup link → webhook.
   * Call this when a new client completes onboarding.
   */
  async provisionClient(params: {
    clientName: string;
    clientSlug: string;
    clientId: string;
    webhookUrl: string;
    dashboardUrl: string;
    brandColor?: string;
  }): Promise<{
    customer: KapsoCustomer;
    setupLink: KapsoSetupLink;
    webhook: KapsoWebhook;
  }> {
    // 1. Create customer
    const customer = await this.createCustomer(params.clientName, {
      client_id: params.clientId,
      client_slug: params.clientSlug,
    });

    // 2. Generate branded setup link
    const setupLink = await this.createSetupLink(customer.id, {
      successRedirectUrl: `${params.dashboardUrl}/dashboard/whatsapp?connected=true`,
      failureRedirectUrl: `${params.dashboardUrl}/dashboard/whatsapp?connected=false`,
      provisionPhoneNumber: true,
      phoneNumberCountryIsos: ["US", "AE", "SA"],
      themeConfig: params.brandColor
        ? { primaryColor: params.brandColor }
        : undefined,
    });

    // 3. Create webhook for inbound messages
    const webhook = await this.createWebhook(
      params.webhookUrl,
      [
        "whatsapp.message.received",
        "whatsapp.message.sent",
        "whatsapp.message.delivered",
        "whatsapp.message.read",
        "whatsapp.conversation.created",
        "whatsapp.phone_number.created",
      ],
      {
        customerId: customer.id,
        bufferEnabled: true,
        bufferWindowSeconds: 5,
      }
    );

    return { customer, setupLink, webhook };
  }
}
