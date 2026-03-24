import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export interface ClientComposeConfig {
  clientSlug: string;
  clientId: string;
  platformDomain: string;
  anthropicApiKey: string;
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string;
  sendgridApiKey?: string;
  calendlyApiKey?: string;
  crmApiKey?: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  redisPassword: string;
}

interface GeneratedCredentials {
  dbUser: string;
  dbPassword: string;
  n8nEncryptionKey: string;
  n8nAuthUser: string;
  n8nAuthPassword: string;
}

const DEPLOYMENTS_BASE = process.env.DEPLOYMENTS_BASE || "/deployments";
const TEMPLATE_PATH =
  process.env.COMPOSE_TEMPLATE_PATH ||
  join(__dirname, "../../infrastructure/docker-compose.client.template.yml");

function generateRandomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCredentials(slug: string): GeneratedCredentials {
  return {
    dbUser: `n8n_${slug.replace(/-/g, "_")}`,
    dbPassword: generateRandomHex(24),
    n8nEncryptionKey: generateRandomHex(32),
    n8nAuthUser: "admin",
    n8nAuthPassword: generateRandomHex(16),
  };
}

export function generateClientCompose(
  config: ClientComposeConfig
): { composePath: string; credentials: GeneratedCredentials } {
  const clientDir = join(DEPLOYMENTS_BASE, config.clientSlug);

  if (!existsSync(clientDir)) {
    mkdirSync(clientDir, { recursive: true });
  }

  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const creds = generateCredentials(config.clientSlug);
  const slugUnderscore = config.clientSlug.replace(/-/g, "_");

  const composed = template
    .replace(/\{\{CLIENT_SLUG\}\}/g, config.clientSlug)
    .replace(/\{\{CLIENT_SLUG_UNDERSCORE\}\}/g, slugUnderscore)
    .replace(/\{\{PLATFORM_DOMAIN\}\}/g, config.platformDomain)
    .replace(/\{\{CLIENT_ID\}\}/g, config.clientId)
    .replace(/\{\{DB_USER\}\}/g, creds.dbUser)
    .replace(/\{\{DB_PASSWORD\}\}/g, creds.dbPassword)
    .replace(/\{\{N8N_ENCRYPTION_KEY\}\}/g, creds.n8nEncryptionKey)
    .replace(/\{\{N8N_AUTH_USER\}\}/g, creds.n8nAuthUser)
    .replace(/\{\{N8N_AUTH_PASSWORD\}\}/g, creds.n8nAuthPassword)
    .replace(/\{\{ANTHROPIC_API_KEY\}\}/g, config.anthropicApiKey)
    .replace(/\{\{WHATSAPP_API_TOKEN\}\}/g, config.whatsappApiToken || "")
    .replace(
      /\{\{WHATSAPP_PHONE_NUMBER_ID\}\}/g,
      config.whatsappPhoneNumberId || ""
    )
    .replace(/\{\{SENDGRID_API_KEY\}\}/g, config.sendgridApiKey || "")
    .replace(/\{\{CALENDLY_API_KEY\}\}/g, config.calendlyApiKey || "")
    .replace(/\{\{CRM_API_KEY\}\}/g, config.crmApiKey || "")
    .replace(/\{\{SUPABASE_URL\}\}/g, config.supabaseUrl)
    .replace(
      /\{\{SUPABASE_SERVICE_ROLE_KEY\}\}/g,
      config.supabaseServiceRoleKey
    )
    .replace(/\{\{REDIS_PASSWORD\}\}/g, config.redisPassword);

  const composePath = join(clientDir, "docker-compose.yml");
  writeFileSync(composePath, composed, "utf-8");

  return { composePath, credentials: creds };
}

export function startClientStack(slug: string): void {
  const clientDir = join(DEPLOYMENTS_BASE, slug);
  execSync("docker compose up -d", { cwd: clientDir, stdio: "inherit" });
}

export function stopClientStack(slug: string): void {
  const clientDir = join(DEPLOYMENTS_BASE, slug);
  execSync("docker compose down", { cwd: clientDir, stdio: "inherit" });
}

export function removeClientStack(
  slug: string,
  deleteVolumes = false
): void {
  const clientDir = join(DEPLOYMENTS_BASE, slug);
  const cmd = deleteVolumes ? "docker compose down -v" : "docker compose down";
  execSync(cmd, { cwd: clientDir, stdio: "inherit" });
}

export interface ContainerStatus {
  slug: string;
  n8n: string;
  postgres: string;
}

export function getClientStatus(slug: string): ContainerStatus {
  const getStatus = (container: string): string => {
    try {
      return execSync(
        `docker inspect -f '{{.State.Status}}' ${container}`,
        { encoding: "utf-8" }
      ).trim();
    } catch {
      return "not_found";
    }
  };

  return {
    slug,
    n8n: getStatus(`n8n-${slug}`),
    postgres: getStatus(`postgres-${slug}`),
  };
}
