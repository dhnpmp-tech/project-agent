import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateClientCompose, type ClientComposeConfig } from "../docker-manager";
import { readFileSync, existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DEPLOY_BASE = join(tmpdir(), "project-agent-test-deployments");

const testConfig: ClientComposeConfig = {
  clientSlug: "acme-corp",
  clientId: "550e8400-e29b-41d4-a716-446655440000",
  platformDomain: "agents.example.com",
  anthropicApiKey: "sk-ant-test-key-12345",
  whatsappApiToken: "whatsapp-token-abc",
  whatsappPhoneNumberId: "123456789",
  sendgridApiKey: "SG.test-sendgrid-key",
  calendlyApiKey: "cal-test-key",
  supabaseUrl: "https://test.supabase.co",
  supabaseServiceRoleKey: "eyJ-test-service-role-key",
  redisPassword: "redis-test-pass",
};

describe("generateClientCompose", () => {
  beforeEach(() => {
    // Set up temp deployment directory
    if (existsSync(TEST_DEPLOY_BASE)) {
      rmSync(TEST_DEPLOY_BASE, { recursive: true });
    }
    mkdirSync(TEST_DEPLOY_BASE, { recursive: true });
    if (existsSync(TEST_DEPLOY_BASE)) {
      rmSync(TEST_DEPLOY_BASE, { recursive: true });
    }
    mkdirSync(TEST_DEPLOY_BASE, { recursive: true });
    process.env.DEPLOYMENTS_BASE = TEST_DEPLOY_BASE;
  });

  afterEach(() => {
    if (existsSync(TEST_DEPLOY_BASE)) {
      rmSync(TEST_DEPLOY_BASE, { recursive: true });
    }
    delete process.env.DEPLOYMENTS_BASE;
  });

  it("creates a docker-compose.yml file in the client directory", () => {
    const { composePath } = generateClientCompose(testConfig);
    expect(existsSync(composePath)).toBe(true);
    expect(composePath).toContain("acme-corp");
  });

  it("replaces all template placeholders", () => {
    const { composePath } = generateClientCompose(testConfig);
    const content = readFileSync(composePath, "utf-8");

    // Should not contain any unreplaced template variables
    // (exclude the comment line which mentions {{PLACEHOLDERS}})
    const lines = content.split("\n").filter((l) => !l.startsWith("#"));
    const body = lines.join("\n");
    expect(body).not.toMatch(/\{\{[A-Z_]+\}\}/);

    // Should contain the actual values
    expect(content).toContain("acme-corp");
    expect(content).toContain("agents.example.com");
    expect(content).toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(content).toContain("sk-ant-test-key-12345");
  });

  it("generates unique credentials for each client", () => {
    const { credentials: creds1 } = generateClientCompose({
      ...testConfig,
      clientSlug: "client-a",
    });
    const { credentials: creds2 } = generateClientCompose({
      ...testConfig,
      clientSlug: "client-b",
    });

    expect(creds1.dbPassword).not.toBe(creds2.dbPassword);
    expect(creds1.n8nEncryptionKey).not.toBe(creds2.n8nEncryptionKey);
    expect(creds1.n8nAuthPassword).not.toBe(creds2.n8nAuthPassword);
  });

  it("converts slugs with dashes to underscores for DB user", () => {
    const { credentials } = generateClientCompose(testConfig);
    expect(credentials.dbUser).toBe("n8n_acme_corp");
  });

  it("sets correct container names in compose file", () => {
    const { composePath } = generateClientCompose(testConfig);
    const content = readFileSync(composePath, "utf-8");

    expect(content).toContain("n8n-acme-corp");
    expect(content).toContain("postgres-acme-corp");
  });

  it("configures Traefik routing labels", () => {
    const { composePath } = generateClientCompose(testConfig);
    const content = readFileSync(composePath, "utf-8");

    expect(content).toContain("traefik.enable=true");
    expect(content).toContain("acme-corp.agents.example.com");
  });

  it("sets resource limits on containers", () => {
    const { composePath } = generateClientCompose(testConfig);
    const content = readFileSync(composePath, "utf-8");

    expect(content).toContain("512M");
    expect(content).toContain("0.5");
  });

  it("handles optional fields that are undefined", () => {
    const minimalConfig: ClientComposeConfig = {
      clientSlug: "minimal-client",
      clientId: "test-id",
      platformDomain: "test.com",
      anthropicApiKey: "sk-test",
      supabaseUrl: "https://test.supabase.co",
      supabaseServiceRoleKey: "test-key",
      redisPassword: "test-redis",
    };

    const { composePath } = generateClientCompose(minimalConfig);
    const content = readFileSync(composePath, "utf-8");

    // Should not contain unreplaced template variables
    const lines = content.split("\n").filter((l) => !l.startsWith("#"));
    expect(lines.join("\n")).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("uses external agent-network", () => {
    const { composePath } = generateClientCompose(testConfig);
    const content = readFileSync(composePath, "utf-8");

    expect(content).toContain("agent-network");
    expect(content).toContain("external: true");
  });
});
