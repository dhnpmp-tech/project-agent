/**
 * Template Injector — customizes n8n workflow JSON templates
 * with client-specific configuration (business name, API keys,
 * knowledge base content, system prompts, etc.)
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { AgentType } from "@project-agent/shared-types";

export interface AgentConfig {
  clientId: string;
  clientSlug: string;
  companyName: string;
  companyNameAr?: string;
  businessDescription?: string;
  businessHours?: string;
  knowledgeBaseContent?: string;
  calendlyLink?: string;
  preferredLanguage?: "en" | "ar" | "both";
  escalationPhone?: string;
  escalationEmail?: string;
  // SDR-specific
  icpCriteria?: Record<string, unknown>;
  emailSequenceLanguage?: "en" | "ar" | "both";
  // CEA-specific
  brandVoice?: string;
  socialPlatforms?: string[];
  // HRSA-specific
  scoringCriteria?: Record<string, unknown>;
  // FIA-specific
  transactionCategories?: string[];
}

const TEMPLATES_BASE =
  process.env.TEMPLATES_BASE ||
  join(__dirname, "../../../agent-templates");

/**
 * Load a workflow JSON template from the agent-templates directory.
 */
export function loadWorkflowTemplate(agentType: AgentType): Record<string, unknown> {
  const dirMap: Record<AgentType, string> = {
    wia: "whatsapp-intelligence-agent",
    ai_sdr: "ai-sdr-agent",
    cea: "content-engine-agent",
    hrsa: "hr-screening-agent",
    fia: "financial-intelligence-agent",
  };

  const workflowPath = join(TEMPLATES_BASE, dirMap[agentType], "workflow.json");
  const raw = readFileSync(workflowPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Load a system prompt template.
 */
export function loadSystemPrompt(agentType: AgentType): string {
  const dirMap: Record<AgentType, string> = {
    wia: "whatsapp-intelligence-agent",
    ai_sdr: "ai-sdr-agent",
    cea: "content-engine-agent",
    hrsa: "hr-screening-agent",
    fia: "financial-intelligence-agent",
  };

  const promptPath = join(
    TEMPLATES_BASE,
    dirMap[agentType],
    "system-prompt.md"
  );
  return readFileSync(promptPath, "utf-8");
}

/**
 * Load the config schema for an agent type.
 */
export function loadConfigSchema(
  agentType: AgentType
): { required: string[]; optional: string[] } {
  const dirMap: Record<AgentType, string> = {
    wia: "whatsapp-intelligence-agent",
    ai_sdr: "ai-sdr-agent",
    cea: "content-engine-agent",
    hrsa: "hr-screening-agent",
    fia: "financial-intelligence-agent",
  };

  const schemaPath = join(
    TEMPLATES_BASE,
    dirMap[agentType],
    "config-schema.json"
  );
  const raw = readFileSync(schemaPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Validate that all required config fields are present.
 */
export function validateConfig(
  agentType: AgentType,
  config: AgentConfig
): { valid: boolean; missing: string[] } {
  const schema = loadConfigSchema(agentType);
  const configRecord = config as unknown as Record<string, unknown>;
  const missing = schema.required.filter(
    (field) => !configRecord[field] && configRecord[field] !== 0
  );
  return { valid: missing.length === 0, missing };
}

/**
 * Inject client-specific configuration into a workflow JSON template.
 *
 * Replaces placeholder strings like {{COMPANY_NAME}}, {{KNOWLEDGE_BASE}}, etc.
 * within node parameters of the workflow.
 */
export function injectConfig(
  workflow: Record<string, unknown>,
  config: AgentConfig
): Record<string, unknown> {
  // Deep clone to avoid mutating the original
  const injected = JSON.parse(JSON.stringify(workflow));

  // Build replacement map
  const replacements: Record<string, string> = {
    "{{CLIENT_ID}}": config.clientId,
    "{{CLIENT_SLUG}}": config.clientSlug,
    "{{COMPANY_NAME}}": config.companyName,
    "{{COMPANY_NAME_AR}}": config.companyNameAr || config.companyName,
    "{{BUSINESS_DESCRIPTION}}": config.businessDescription || "",
    "{{BUSINESS_HOURS}}": config.businessHours || "Sun-Thu 9:00-18:00 GST",
    "{{KNOWLEDGE_BASE}}": config.knowledgeBaseContent || "",
    "{{CALENDLY_LINK}}": config.calendlyLink || "",
    "{{PREFERRED_LANGUAGE}}": config.preferredLanguage || "both",
    "{{ESCALATION_PHONE}}": config.escalationPhone || "",
    "{{ESCALATION_EMAIL}}": config.escalationEmail || "",
    "{{BRAND_VOICE}}": config.brandVoice || "",
  };

  // Recursively replace placeholders in all string values
  function replaceInObject(obj: unknown): unknown {
    if (typeof obj === "string") {
      let result = obj;
      for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.split(placeholder).join(value);
      }
      return result;
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceInObject);
    }
    if (obj && typeof obj === "object") {
      const replaced: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>
      )) {
        replaced[key] = replaceInObject(value);
      }
      return replaced;
    }
    return obj;
  }

  return replaceInObject(injected) as Record<string, unknown>;
}
